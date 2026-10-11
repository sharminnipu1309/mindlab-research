// supabase/functions/send-unlock-notifications/index.ts
// Supabase Edge Function: Server-side Room 3 & 4 Unlock Email Notification Dispatcher
// Triggered on-demand by researchers or automated runners.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';

interface ClaimedSession {
  session_id: string;
  participant_id: string;
  participant_code: string;
  participant_name: string;
  participant_email: string;
  room_2_started_at: string;
  rooms_3_4_unlock_at: string;
  attempt_count: number;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
const EMAIL_FROM = Deno.env.get('RESEND_FROM_EMAIL') || Deno.env.get('EMAIL_FROM') || 'MindLab Study <onboarding@resend.dev>';
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || Deno.env.get('SITE_URL') || Deno.env.get('VITE_APP_URL') || 'https://mindlab-research.vercel.app';
const CRON_SECRET = Deno.env.get('CRON_SECRET') || '';

serve(async (req: Request) => {
  // Allow health check GET
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'ready', 
      provider: RESEND_API_KEY ? 'resend' : (SENDGRID_API_KEY ? 'sendgrid' : 'none_configured'),
      from_configured: EMAIL_FROM,
      app_url: APP_BASE_URL,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify caller authorization: require valid Bearer token matching SUPABASE_SERVICE_ROLE_KEY or CRON_SECRET
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const isAuthorized = 
    (Boolean(token) && Boolean(SUPABASE_SERVICE_ROLE_KEY) && token === SUPABASE_SERVICE_ROLE_KEY) ||
    (Boolean(token) && Boolean(CRON_SECRET) && token === CRON_SECRET);

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or missing Bearer authorization token.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse optional payload for safe testing / dry-run
  let reqPayload: any = {};
  if (req.method === 'POST') {
    try {
      reqPayload = await req.json();
    } catch {
      reqPayload = {};
    }
  }

  const isDryRun = Boolean(reqPayload?.dryRun);
  const testRecipientOverride = typeof reqPayload?.testRecipient === 'string' && reqPayload.testRecipient.trim() 
    ? reqPayload.testRecipient.trim() 
    : null;
  const targetSessionId = typeof reqPayload?.targetSessionId === 'string' && reqPayload.targetSessionId.trim()
    ? reqPayload.targetSessionId.trim()
    : null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. Atomically claim pending eligible sessions (FOR UPDATE SKIP LOCKED)
    const { data: claimed, error: claimError } = await supabase.rpc('claim_pending_unlock_emails', {
      p_batch_size: 25,
    });

    if (claimError) {
      console.error('[Unlock Email Dispatcher] Error claiming sessions:', claimError);
      return new Response(JSON.stringify({ error: claimError.message }), { status: 500 });
    }

    let sessions = (claimed || []) as ClaimedSession[];
    
    // If targetSessionId was specified, filter strictly to that session
    if (targetSessionId) {
      sessions = sessions.filter(s => s.session_id === targetSessionId);
    }

    if (sessions.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending unlock emails ready to send.', count: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Unlock Email Dispatcher] Claimed ${sessions.length} sessions for dispatch. DryRun: ${isDryRun}`);
    const results = [];

    // 2. Process each claimed session
    for (const session of sessions) {
      // Allow safe recipient override during testing
      const recipient = testRecipientOverride || session.participant_email;
      const firstName = session.participant_name.split(' ')[0] || session.participant_name;
      const subject = testRecipientOverride 
        ? `[TEST] MindLab Study: Room 03 & Room 04 Are Now Unlocked (${session.participant_code})`
        : `MindLab Study: Room 03 & Room 04 Are Now Unlocked (${session.participant_code})`;
      
      const textBody = `Hello ${firstName},

Your 24-hour waiting interval is now complete. Room 03 (Attention Challenge) and Room 04 (Flexibility Challenge) are unlocked and ready for you to complete.

Participant ID: ${session.participant_code}
Study Link: ${APP_BASE_URL}

Please resume your study session by visiting the study link, clicking "Resume Session", and entering your Participant ID (${session.participant_code}) and first name (${firstName}).

Thank you for contributing to cognitive psychology research!
MindLab Research Team`;

      const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1E293B; line-height: 1.5;">
  ${testRecipientOverride ? `<div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 10px; margin-bottom: 16px; font-size: 12px; color: #92400E;"><strong>[TEST RUN]</strong> Delivered to test recipient: ${testRecipientOverride}</div>` : ''}
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
    <div style="font-family: monospace; font-size: 18px; font-weight: bold; color: #6D28D9;">${session.participant_code}</div>
  </div>
  
  <div style="margin-bottom: 24px;">
    <a href="${APP_BASE_URL}" style="display: inline-block; background: #6D28D9; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
      Return to MindLab Dashboard →
    </a>
  </div>
  
  <p style="font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 16px;">
    To resume, select <strong>"Resume Session"</strong> on the homepage, enter Participant ID <strong>${session.participant_code}</strong>, and verify your first name (<strong>${firstName}</strong>).
  </p>
</div>`;

      if (isDryRun) {
        console.log(`[Dry Run] Would send email to ${recipient} for session ${session.session_id}`);
        results.push({
          session_id: session.session_id,
          participant_code: session.participant_code,
          recipient,
          status: 'dry_run',
          success: true,
        });
        continue;
      }

      let sendSuccess = false;
      let sendError: string | null = null;

      if (RESEND_API_KEY) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
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

          if (res.ok) {
            sendSuccess = true;
          } else {
            const errData = await res.json();
            sendError = errData?.message || `Resend HTTP ${res.status}`;
          }
        } catch (e: any) {
          sendError = e?.message || 'Network error calling Resend API';
        }
      } else if (SENDGRID_API_KEY) {
        try {
          const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
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

          if (res.ok || res.status === 202) {
            sendSuccess = true;
          } else {
            const errText = await res.text();
            sendError = `SendGrid HTTP ${res.status}: ${errText}`;
          }
        } catch (e: any) {
          sendError = e?.message || 'Network error calling SendGrid API';
        }
      } else {
        // No email provider key configured in environment
        sendError = 'No email provider credentials configured (RESEND_API_KEY or SENDGRID_API_KEY required)';
        console.warn(`[Unlock Email Dispatcher] Cannot dispatch email to ${recipient}: ${sendError}`);
      }

      // 3. Atomically record result in database
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

    return new Response(JSON.stringify({ 
      processed: results.length, 
      dry_run: isDryRun, 
      test_override: Boolean(testRecipientOverride), 
      results 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[Unlock Email Dispatcher] Uncaught exception:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Server error' }), { status: 500 });
  }
});
