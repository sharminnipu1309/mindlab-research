// scripts/test_nodemailer_delivery.mjs
// Standalone Nodemailer SMTP delivery test for MindLab.
// Strictly isolated: NO database mutations, NO Supabase SDK, NO real participant lookup.

import nodemailer from 'nodemailer';
import { getUnlockEmailTemplates } from './send_unlock_emails.mjs';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';

const EMAIL_FROM = process.env.EMAIL_FROM || (SMTP_USER ? `MindLab Study <${SMTP_USER}>` : '');
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://mindlab-research.vercel.app';

function getTargetRecipient() {
  const args = process.argv.slice(2);
  const toArgIdx = args.findIndex(arg => arg === '--to' || arg.startsWith('--to='));
  if (toArgIdx !== -1) {
    const val = args[toArgIdx];
    if (val.startsWith('--to=')) {
      return val.split('=')[1]?.trim() || '';
    }
    return args[toArgIdx + 1]?.trim() || '';
  }
  return process.env.TEST_RECIPIENT_EMAIL?.trim() || '';
}

async function runNodemailerTest() {
  console.log('====================================================');
  console.log('  MindLab — Nodemailer SMTP Delivery Test');
  console.log('====================================================');
  console.log(`Execution Time: ${new Date().toISOString()}`);

  if (!SMTP_USER || !SMTP_PASS) {
    console.error('\n[Configuration Required] Missing SMTP credentials.');
    console.error('Please configure SMTP_USER and SMTP_PASS before running.');
    console.error('\nExample (PowerShell):');
    console.error('  $env:SMTP_HOST="smtp.gmail.com"');
    console.error('  $env:SMTP_PORT="465"');
    console.error('  $env:SMTP_USER="your-email@gmail.com"');
    console.error('  $env:SMTP_PASS="your-16-char-app-password"');
    console.error('  node scripts/test_nodemailer_delivery.mjs --to user@example.com\n');
    process.exit(1);
  }

  const recipient = getTargetRecipient();
  if (!recipient || !recipient.includes('@')) {
    console.error('\n[Error] No valid test recipient specified.');
    console.error('Please specify target email using:');
    console.error('  node scripts/test_nodemailer_delivery.mjs --to your-email@example.com\n');
    process.exit(1);
  }

  console.log(`SMTP Server:    ${SMTP_HOST}:${SMTP_PORT} (SSL: ${SMTP_SECURE})`);
  console.log(`Sender User:    ${SMTP_USER}`);
  console.log(`Sender Header:  ${EMAIL_FROM}`);
  console.log(`Recipient:      ${recipient}`);
  console.log(`Dashboard URL:  ${APP_BASE_URL}\n`);

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  // 1. Verify SMTP connection
  console.log('Step 1: Verifying SMTP server connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection and authentication verified successfully!\n');
  } catch (verifyErr) {
    console.error('❌ SMTP Connection failed:', verifyErr.message);
    process.exit(1);
  }

  // 2. Generate email template
  console.log('Step 2: Generating MindLab Room 3 & 4 unlock email template...');
  const { subject, textBody, htmlBody } = getUnlockEmailTemplates({
    firstName: 'MindLab Tester',
    participantCode: 'TEST-9999',
    appUrl: APP_BASE_URL,
    isTest: true,
  });

  // 3. Dispatch email
  console.log(`Step 3: Sending test email to ${recipient}...`);
  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: recipient,
      subject,
      text: textBody,
      html: htmlBody,
    });

    console.log('\n====================================================');
    console.log('🎉 EMAIL DELIVERED SUCCESSFULLY!');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Recipient:  ${recipient}`);
    console.log('Response:   ' + (info.response || 'OK'));
    console.log('====================================================\n');
  } catch (sendErr) {
    console.error('❌ Email dispatch failed:', sendErr.message);
    process.exit(1);
  }
}

runNodemailerTest().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
