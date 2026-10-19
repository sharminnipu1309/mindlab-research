// api/send-unlock-email.js
// Vercel Serverless Function: Sends Room 3 & 4 Unlock Email via Nodemailer (SMTP)
// Triggered directly by the MindLab website 1 second after a participant unlocks the next level.

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ummiczxtncwvozgvqlih.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_edu6CvEJ0QECXm-ZQByfJg_LvIjOK6n';

// SMTP / Nodemailer Configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';

const EMAIL_FROM = process.env.EMAIL_FROM || (SMTP_USER ? `Memtiva Study <${SMTP_USER}>` : 'Memtiva Study <noreply@memtiva.io>');
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.SITE_URL || 'https://memtiva.vercel.app';

// Fallback HTTP providers
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

function generateEmailHtml({ firstName, participantCode, appUrl = APP_BASE_URL }) {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1E293B; line-height: 1.5;">
  <div style="border-bottom: 2px solid #8B5CF6; padding-bottom: 16px; margin-bottom: 20px;">
    <h1 style="color: #6D28D9; font-size: 22px; margin: 0;">MindLab Cognitive Research</h1>
    <p style="color: #64748B; font-size: 13px; margin: 4px 0 0 0;">Cognitive Flexibility & Attention Study</p>
  </div>
  
  <p style="font-size: 16px; margin-bottom: 16px;">Hello <strong>${firstName}</strong>,</p>
  
  <p style="font-size: 14px; margin-bottom: 16px;">
    🎉 <strong>Your next levels are now officially unlocked and ready to solve!</strong>
  </p>
  <p style="font-size: 14px; margin-bottom: 16px;">
    You can now proceed with <strong>Room 03 (Stroop Attention Task)</strong> and <strong>Room 04 (Task Switching Flexibility)</strong>.
  </p>
  
  <div style="background-color: #F8F8FC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
    <div style="font-size: 12px; color: #64748B; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Your Participant ID</div>
    <div style="font-family: monospace; font-size: 18px; font-weight: bold; color: #6D28D9;">${participantCode}</div>
  </div>
  
  <div style="margin-bottom: 24px;">
    <a href="${appUrl}" style="display: inline-block; background: #6D28D9; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
      Continue Study on MindLab Dashboard →
    </a>
  </div>
  
  <p style="font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 16px;">
    To resume, click the link above, select <strong>"Resume Session"</strong>, enter Participant ID <strong>${participantCode}</strong>, and verify your first name (<strong>${firstName}</strong>).
  </p>
</div>`;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ready',
      endpoint: '/api/send-unlock-email',
      smtp_configured: Boolean(SMTP_USER && SMTP_PASS),
      smtp_host: SMTP_HOST,
      smtp_port: SMTP_PORT,
      smtp_user_set: Boolean(SMTP_USER),
      resend_fallback_set: Boolean(RESEND_API_KEY),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const recipient = (body.email || body.recipientEmail || '').trim();
    const name = (body.name || body.participantName || 'Participant').trim();
    const firstName = name.split(' ')[0] || 'Participant';
    const participantCode = (body.participantCode || body.code || 'ML-STUDY').trim();
    const sessionId = body.sessionId || null;

    if (!recipient || !recipient.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'A valid recipient email address is required.',
      });
    }

    const subject = `MindLab Study: Next Level Unlocked (${participantCode})`;
    const htmlBody = generateEmailHtml({ firstName, participantCode, appUrl: APP_BASE_URL });
    const textBody = `Hello ${firstName},\n\nYour next level is unlocked. Room 03 and Room 04 are ready for you to solve.\n\nParticipant ID: ${participantCode}\nLink: ${APP_BASE_URL}\n\nMindLab Research Team`;

    console.log(`[API /send-unlock-email] Triggered for participant ${participantCode} (${recipient})`);

    let sendSuccess = false;
    let messageId = null;
    let sendError = null;

    // 1. Try Nodemailer SMTP
    if (SMTP_USER && SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_SECURE,
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
        });

        const info = await transporter.sendMail({
          from: EMAIL_FROM,
          to: recipient,
          subject,
          text: textBody,
          html: htmlBody,
        });

        sendSuccess = true;
        messageId = info.messageId;
        console.log(`[API /send-unlock-email] Nodemailer SMTP delivered to ${recipient}. MessageId: ${messageId}`);
      } catch (smtpErr) {
        console.error('[API /send-unlock-email] Nodemailer SMTP error:', smtpErr);
        sendError = smtpErr.message;
      }
    } 
    // 2. Fallback to Resend if SMTP not yet configured in env
    else if (RESEND_API_KEY) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: [recipient],
            subject,
            html: htmlBody,
            text: textBody,
          }),
        });

        const rData = await resendRes.json().catch(() => ({}));
        if (resendRes.ok) {
          sendSuccess = true;
          messageId = rData?.id;
          console.log(`[API /send-unlock-email] Resend fallback delivered to ${recipient}. Id: ${messageId}`);
        } else {
          sendError = rData?.message || `HTTP ${resendRes.status}`;
        }
      } catch (resendErr) {
        sendError = resendErr.message;
      }
    } else {
      sendError = 'No email credentials configured. Please set SMTP_USER and SMTP_PASS (or GMAIL_USER and GMAIL_APP_PASSWORD) in Vercel Environment Variables.';
      console.warn(`[API /send-unlock-email] ${sendError}`);
    }

    // 3. Record outcome in Supabase sessions if sessionId provided
    if (sessionId && SUPABASE_URL && SUPABASE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        if (sendSuccess) {
          await supabase
            .from('sessions')
            .update({
              unlock_email_status: 'sent',
              unlock_email_sent_at: new Date().toISOString(),
              unlock_email_error: null,
            })
            .eq('id', sessionId);
        } else {
          await supabase
            .from('sessions')
            .update({
              unlock_email_status: 'failed',
              unlock_email_error: sendError || 'Delivery failed',
            })
            .eq('id', sessionId);
        }
      } catch (dbErr) {
        console.warn('[API /send-unlock-email] Could not update Supabase session status:', dbErr.message);
      }
    }

    if (sendSuccess) {
      return res.status(200).json({
        success: true,
        message: 'Unlock email dispatched successfully via Nodemailer.',
        messageId,
        recipient,
        participantCode,
      });
    }

    return res.status(500).json({
      success: false,
      error: sendError,
      recipient,
      participantCode,
    });
  } catch (err) {
    console.error('[API /send-unlock-email] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  }
}
