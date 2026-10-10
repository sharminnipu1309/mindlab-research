// scripts/send_unlock_emails.mjs
// Node.js runner for server-side Room 3 & 4 Unlock Email Dispatcher
// Can be executed via Cron, worker service, or manual testing.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ummiczxtncwvozgvqlih.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_edu6CvEJ0QECXm-ZQByfJg_LvIjOK6n';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'MindLab Study <onboarding@resend.dev>';
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.SITE_URL || process.env.VITE_APP_URL || 'https://mindlab.io';

export async function processUnlockEmails({ dryRun = false } = {}) {
  console.log('--- MindLab Room 3 & 4 Unlock Email Dispatcher ---');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log(`Email Provider: ${RESEND_API_KEY ? 'Resend configured' : SENDGRID_API_KEY ? 'SendGrid configured' : 'None configured (API key required)'}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 1. Claim eligible sessions
  const { data: claimed, error: claimError } = await supabase.rpc('claim_pending_unlock_emails', {
    p_batch_size: 20,
  });

  if (claimError) {
    // If table or RPC not yet migrated in database, report cleanly
    console.warn('[Email Worker] RPC claim_pending_unlock_emails returned:', claimError.message);
    return { success: false, error: claimError.message, processed: 0 };
  }

  const sessions = claimed || [];
  console.log(`Found ${sessions.length} eligible session(s) pending unlock notification.`);

  if (sessions.length === 0) {
    return { success: true, processed: 0, results: [] };
  }

  const results = [];

  for (const session of sessions) {
    const recipient = session.participant_email;
    const firstName = (session.participant_name || 'Participant').split(' ')[0];
    console.log(`Processing unlock email for participant ${session.participant_code} (${recipient.replace(/(.{2})(.*)(@.*)/, '$1***$3')})...`);

    if (dryRun) {
      console.log(`[Dry Run] Would send email to ${recipient} for session ${session.session_id}`);
      results.push({ session_id: session.session_id, participant_code: session.participant_code, status: 'dry_run' });
      continue;
    }

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
            subject: `MindLab Study: Room 03 & Room 04 Are Now Unlocked (${session.participant_code})`,
            text: `Hello ${firstName},\n\nYour 24-hour waiting interval is complete. Room 03 (Stroop Task) and Room 04 (Task Switching) are now unlocked.\n\nParticipant ID: ${session.participant_code}\nLink: ${APP_BASE_URL}\n\nThank you for participating!`,
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
            subject: `MindLab Study: Room 03 & Room 04 Are Now Unlocked (${session.participant_code})`,
            content: [{ type: 'text/plain', value: `Hello ${firstName},\n\nYour 24-hour waiting interval is complete. Room 03 and Room 04 are now unlocked.` }],
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
      success: sendSuccess,
      error: sendError,
    });
  }

  return { success: true, processed: results.length, results };
}

// Allow CLI execution
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const isDryRun = process.argv.includes('--dry-run');
  processUnlockEmails({ dryRun: isDryRun })
    .then(res => {
      console.log('Result:', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal execution error:', err);
      process.exit(1);
    });
}
