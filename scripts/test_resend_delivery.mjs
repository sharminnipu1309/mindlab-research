// scripts/test_resend_delivery.mjs
// Standalone, one-time Resend email delivery test for MindLab.
// Strictly isolated: NO database connection, NO Supabase SDK, NO live participant lookup.

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() || '';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL?.trim() || process.env.EMAIL_FROM?.trim() || 'MindLab Study <onboarding@resend.dev>';
const APP_BASE_URL = process.env.APP_BASE_URL?.trim() || 'https://mindlab-research.vercel.app';

// Parse recipient from CLI arg (--to=user@example.com or --to user@example.com) or environment variable
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

async function runStandaloneDeliveryTest() {
  console.log('====================================================');
  console.log(' MindLab — Standalone Resend Delivery Test');
  console.log('====================================================');
  console.log(`Execution Time: ${new Date().toISOString()}`);

  // 1. Validate environment configuration without exposing secrets
  if (!RESEND_API_KEY) {
    console.error('\n[Error] Missing RESEND_API_KEY environment variable.');
    console.error('Please configure RESEND_API_KEY in your local session before running.');
    console.error('Example (PowerShell): $env:RESEND_API_KEY="re_your_api_key"');
    console.error('Example (Bash):       export RESEND_API_KEY="re_your_api_key"\n');
    process.exit(1);
  }

  const recipient = getTargetRecipient();
  if (!recipient || !recipient.includes('@')) {
    console.error('\n[Error] No valid test recipient specified.');
    console.error('Please provide your test email address via:');
    console.error('  --to user@example.com');
    console.error('  or set $env:TEST_RECIPIENT_EMAIL="user@example.com"\n');
    process.exit(1);
  }

  // Safe status display (never print the actual key)
  const keyPrefix = RESEND_API_KEY.slice(0, 4);
  console.log(`API Key Status: Configured (Key Prefix: ${keyPrefix}***, Length: ${RESEND_API_KEY.length})`);
  console.log(`From Address:   ${FROM_EMAIL}`);
  console.log(`To Address:     ${recipient}`);
  console.log(`Target URL:     ${APP_BASE_URL}`);

  // 2. Synthesize test participant payload matching Room 3 & 4 unlock format
  const mockSession = {
    participant_code: 'TEST-9999',
    participant_name: 'MindLab Tester',
    firstName: 'MindLab Tester',
  };

  const subject = `[TEST] MindLab Study: Room 03 & Room 04 Are Now Unlocked (${mockSession.participant_code})`;

  const textBody = `Hello ${mockSession.firstName},

[TEST DELIVERY: NO REAL PARTICIPANTS WERE NOTIFIED]

Your 24-hour waiting interval is now complete. Room 03 (Attention Challenge) and Room 04 (Flexibility Challenge) are unlocked and ready for you to complete.

Participant ID: ${mockSession.participant_code}
Study Link: ${APP_BASE_URL}

Please resume your study session by visiting the study link, clicking "Resume Session", and entering your Participant ID (${mockSession.participant_code}) and first name (${mockSession.firstName}).

Thank you for contributing to cognitive psychology research!
MindLab Research Team`;

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1E293B; line-height: 1.5;">
  <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px; color: #92400E;">
    <strong>DELIVERY TEST:</strong> This is a standalone verification email. No database records or study participants were affected.
  </div>

  <div style="border-bottom: 2px solid #8B5CF6; padding-bottom: 16px; margin-bottom: 20px;">
    <h1 style="color: #6D28D9; font-size: 22px; margin: 0;">MindLab Cognitive Research</h1>
    <p style="color: #64748B; font-size: 13px; margin: 4px 0 0 0;">Cognitive Flexibility & Attention Study</p>
  </div>
  
  <p style="font-size: 16px; margin-bottom: 16px;">Hello <strong>${mockSession.firstName}</strong>,</p>
  
  <p style="font-size: 14px; margin-bottom: 16px;">
    Your 24-hour waiting interval is now complete. <strong>Room 03 (Stroop Task)</strong> and <strong>Room 04 (Task Switching)</strong> are officially unlocked and ready.
  </p>
  
  <div style="background-color: #F8F8FC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
    <div style="font-size: 12px; color: #64748B; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Your Participant ID</div>
    <div style="font-family: monospace; font-size: 18px; font-weight: bold; color: #6D28D9;">${mockSession.participant_code}</div>
  </div>
  
  <div style="margin-bottom: 24px;">
    <a href="${APP_BASE_URL}" style="display: inline-block; background: #6D28D9; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
      Return to MindLab Dashboard →
    </a>
  </div>
  
  <p style="font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 16px;">
    To resume, select <strong>"Resume Session"</strong> on the homepage, enter Participant ID <strong>${mockSession.participant_code}</strong>, and verify your first name (<strong>${mockSession.firstName}</strong>).
  </p>
</div>`;

  console.log('\nSending test payload via Resend API (https://api.resend.com/emails)...');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipient],
        subject,
        html: htmlBody,
        text: textBody,
      }),
    });

    const responseData = await response.json().catch(() => null);

    if (response.ok) {
      console.log('\n✅ Test email delivered successfully!');
      console.log(`Resend Email ID: ${responseData?.id || 'N/A'}`);
      console.log(`Recipient:       ${recipient}`);
      console.log('Check your inbox (and spam folder) to verify formatting.\n');
    } else {
      console.error('\n❌ Resend API returned an error:');
      console.error(`HTTP Status:  ${response.status} ${response.statusText}`);
      console.error(`Error Detail: ${responseData?.message || JSON.stringify(responseData)}\n`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('\n❌ Network or fetch execution failure:');
    console.error(err.message);
    process.exitCode = 1;
  }
}

runStandaloneDeliveryTest();
