// scripts/send_unlock_emails.mjs
// Node.js runner for server-side Room 3 & 4 Unlock Email Dispatcher
// Can be executed via Cron, worker service, or manual/automated testing.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ummiczxtncwvozgvqlih.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_edu6CvEJ0QECXm-ZQByfJg_LvIjOK6n';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'MindLab Study <onboarding@resend.dev>';
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.SITE_URL || process.env.VITE_APP_URL || 'https://mindlab-research.vercel.app';

export function getUnlockEmailTemplates({ firstName, participantCode, appUrl = APP_BASE_URL, isTest = false }) {
  const subject = isTest
    ? `[TEST] MindLab Study: Room 03 & Room 04 Are Now Unlocked (${participantCode})`
    : `MindLab Study: Room 03 & Room 04 Are Now Unlocked (${participantCode})`;

  const textBody = `Hello ${firstName},

Your 24-hour waiting interval is now complete. Room 03 (Attention Challenge) and Room 04 (Flexibility Challenge) are unlocked and ready for you to complete.

Participant ID: ${participantCode}
Study Link: ${appUrl}

Please resume your study session by visiting the study link, clicking "Resume Session", and entering your Participant ID (${participantCode}) and first name (${firstName}).

Thank you for contributing to cognitive psychology research!
MindLab Research Team`;

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1E293B; line-height: 1.5;">
  ${isTest ? '<div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 10px; margin-bottom: 16px; font-size: 12px; color: #92400E;"><strong>[TEST RUN]</strong> Delivery test verification.</div>' : ''}
  <div style="border-bottom: 2px solid #8B5CF6; padding-bottom: 16px; margin-bottom: 20px;">
    <h1 style="color: #6D28D9; font-size: 22px; margin: 0;">MindLab Cognitive Research</h1>
    <p style="color: #64748B; font-size: 13px; margin: 4px 0 0 0;">Cognitive Flexibility & Attention Study</p>
  </div>
  
  <p style="font-size: 16px; margin-bottom: 16px;">Hello <strong>${firstName}</strong>,</p>
  
  <p style="font-size: 14px; margin-bottom: 16px;">
    Your 24-hour waiting interval is now complete. <strong>Room 03 (Stroop Task)</strong> and <strong>Room 04 (Task Switching)</strong> are officially unlocked and ready.
  </p>
  
  <div style="background-color: #F8F8FC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
    <div style="font-size: 12px; color: #64748B; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Your Participant ID</div>
    <div style="font-family: monospace; font-size: 18px; font-weight: bold; color: #6D28D9;">${participantCode}</div>
  </div>
  
  <div style="margin-bottom: 24px;">
    <a href="${appUrl}" style="display: inline-block; background: #6D28D9; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
      Return to MindLab Dashboard →
    </a>
  </div>
  
  <p style="font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 16px;">
    To resume, select <strong>"Resume Session"</strong> on the homepage, enter Participant ID <strong>${participantCode}</strong>, and verify your first name (<strong>${firstName}</strong>).
  </p>
</div>`;

  return { subject, textBody, htmlBody };
}

export async function processUnlockEmails({ 
  dryRun = false, 
  testRecipient = null, 
  targetSessionId = null,
  batchSize = 20 
} = {}) {
  console.log('--- MindLab Room 3 & 4 Unlock Email Dispatcher ---');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log(`Target Session: ${targetSessionId || 'All eligible'}`);
  console.log(`Test Recipient: ${testRecipient || 'Direct to participant'}`);
  console.log(`Email Provider: ${RESEND_API_KEY ? 'Resend configured' : SENDGRID_API_KEY ? 'SendGrid configured' : 'None configured (API key required)'}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // If dry-run, perform a read query rather than claiming with lock
  if (dryRun) {
    console.log('[Dry Run] Querying eligible sessions without claiming...');
    let query = supabase
      .from('sessions')
      .select('id, participant_id, room_2_started_at, rooms_3_4_unlock_at, unlock_email_status, unlock_email_attempts')
      .not('room_2_started_at', 'is', null)
      .lte('rooms_3_4_unlock_at', new Date().toISOString())
      .in('unlock_email_status', ['pending', 'failed'])
      .lt('unlock_email_attempts', 5)
      .is('unlock_email_sent_at', null);

    if (targetSessionId) {
      query = query.eq('id', targetSessionId);
    }

    const { data: eligible, error: eErr } = await query.limit(batchSize);
    if (eErr) {
      return { success: false, error: eErr.message, processed: 0 };
    }

    console.log(`[Dry Run] Found ${eligible?.length || 0} eligible session(s). None were claimed or mutated.`);
    return {
      success: true,
      dryRun: true,
      processed: eligible?.length || 0,
      sessions: eligible || [],
    };
  }

  // 1. Claim eligible sessions atomically via RPC
  const { data: claimed, error: claimError } = await supabase.rpc('claim_pending_unlock_emails', {
    p_batch_size: batchSize,
  });

  if (claimError) {
    console.warn('[Email Worker] RPC claim_pending_unlock_emails returned:', claimError.message);
    return { success: false, error: claimError.message, processed: 0 };
  }

  let sessions = claimed || [];
  if (targetSessionId) {
    sessions = sessions.filter(s => s.session_id === targetSessionId);
  }

  console.log(`Found ${sessions.length} eligible session(s) pending unlock notification.`);

  if (sessions.length === 0) {
    return { success: true, processed: 0, results: [] };
  }

  const results = [];

  for (const session of sessions) {
    const actualEmail = session.participant_email;
    const recipient = testRecipient || actualEmail;
    const firstName = (session.participant_name || 'Participant').split(' ')[0];
    
    console.log(`Processing unlock email for participant ${session.participant_code} (to: ${recipient})...`);

    const { subject, textBody, htmlBody } = getUnlockEmailTemplates({
      firstName,
      participantCode: session.participant_code,
      appUrl: APP_BASE_URL,
      isTest: Boolean(testRecipient),
    });

    let sendSuccess = false;
    let sendError = null;

    if (RESEND_API_KEY) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
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
        if (response.ok) {
          sendSuccess = true;
        } else {
          const errJson = await response.json().catch(() => ({}));
          sendError = errJson?.message || `HTTP ${response.status}`;
        }
      } catch (e) {
        sendError = e.message;
      }
    } else if (SENDGRID_API_KEY) {
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: recipient }] }],
            from: { email: EMAIL_FROM },
            subject,
            content: [
              { type: 'text/plain', value: textBody },
              { type: 'text/html', value: htmlBody },
            ],
          }),
        });
        if (response.ok || response.status === 202) {
          sendSuccess = true;
        } else {
          sendError = `SendGrid HTTP ${response.status}`;
        }
      } catch (e) {
        sendError = e.message;
      }
    } else {
      sendError = 'No email provider credentials configured (RESEND_API_KEY or SENDGRID_API_KEY required)';
    }

    // Atomically record outcome in Supabase
    await supabase.rpc('record_unlock_email_result', {
      p_session_id: session.session_id,
      p_success: sendSuccess,
      p_error: sendError,
    });

    results.push({
      session_id: session.session_id,
      participant_code: session.participant_code,
      recipient,
      success: sendSuccess,
      error: sendError,
    });
  }

  return { success: true, processed: results.length, results };
}

// Allow CLI execution with options
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const testRecipArg = args.find(a => a.startsWith('--test-recipient=') || a === '--test-recipient');
  let testRecipient = null;
  if (testRecipArg) {
    testRecipient = testRecipArg.startsWith('--test-recipient=')
      ? testRecipArg.split('=')[1]
      : args[args.indexOf('--test-recipient') + 1];
  }

  const sessionArg = args.find(a => a.startsWith('--session-id=') || a === '--session-id');
  let targetSessionId = null;
  if (sessionArg) {
    targetSessionId = sessionArg.startsWith('--session-id=')
      ? sessionArg.split('=')[1]
      : args[args.indexOf('--session-id') + 1];
  }

  processUnlockEmails({ dryRun: isDryRun, testRecipient, targetSessionId })
    .then(res => {
      console.log('Result:', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal execution error:', err);
      process.exit(1);
    });
}
