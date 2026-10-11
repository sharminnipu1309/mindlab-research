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

function generateTemplates({ firstName, participantCode, appUrl = APP_BASE_URL, isTest = false }: {
  firstName: string;
  participantCode: string;
  appUrl?: string;
  isTest?: boolean;
}) {
  const subject = isTest
    ? `[TEST] MindLab Study: Room 03 & Room 04 Are Now Unlocked (${participantCode})`
    : `MindLab Study: Room 03 & Room 04 Are Now Unlocked (${participantCode})`;

  const textBody = `Hello ${firstName},

${isTest ? '[TEST DELIVERY: NO REAL PARTICIPANTS WERE NOTIFIED]\n\n' : ''}Your 24-hour waiting interval is now complete. Room 03 (Attention Challenge) and Room 04 (Flexibility Challenge) are unlocked and ready for you to complete.

Participant ID: ${participantCode}
Study Link: ${appUrl}

Please resume your study session by visiting the study link, clicking "Resume Session", and entering your Participant ID (${participantCode}) and first name (${firstName}).

Thank you for contributing to cognitive psychology research!
MindLab Research Team`;

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1E293B; line-height: 1.5;">
  ${isTest ? `<div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 10px; margin-bottom: 16px; font-size: 12px; color: #92400E;"><strong>[DELIVERY TEST]</strong> MindLab email delivery verification. No participant data affected.</div>` : ''}
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

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse authorization: Bearer token matching service_role, CRON_SECRET, or admin user JWT
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  let isAuthorized = false;
  if (token) {
    if (
      (Boolean(SUPABASE_SERVICE_ROLE_KEY) && token === SUPABASE_SERVICE_ROLE_KEY) ||
      (Boolean(CRON_SECRET) && token === CRON_SECRET)
    ) {
      isAuthorized = true;
    } else {
      try {
        const supabaseAuthCheck = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: { user }, error: userErr } = await supabaseAuthCheck.auth.getUser(token);
        if (!userErr && user && (user.email === 'admin@mindlab.io' || user.app_metadata?.role === 'admin')) {
          isAuthorized = true;
        }
      } catch (err) {
        console.warn('[Unlock Email Dispatcher] Admin JWT verification failed:', err);
      }
    }
  }

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or missing Bearer authorization token.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse request payload
  let reqPayload: any = {};
  if (req.method === 'POST') {
    try {
      reqPayload = await req.json();
    } catch {
      reqPayload = {};
    }
  }

  const isDryRun = Boolean(reqPayload?.dryRun);
  const isTestSendOnly = Boolean(reqPayload?.sendTestOnly || reqPayload?.action === 'test_send');
  const testRecipientOverride = typeof reqPayload?.testRecipient === 'string' && reqPayload.testRecipient.trim() 
    ? reqPayload.testRecipient.trim() 
    : null;
  const targetSessionId = typeof reqPayload?.targetSessionId === 'string' && reqPayload.targetSessionId.trim()
    ? reqPayload.targetSessionId.trim()
    : null;

  // ---------------------------------------------------------------------------
  // MODE 1: Standalone Test Send (Isolated direct delivery to researcher)
  // Does NOT claim sessions or mutate any database records.
  // ---------------------------------------------------------------------------
  if (isTestSendOnly) {
    const recipient = testRecipientOverride || 'sharmin.nipu1309@gmail.com';
    const participantCode = reqPayload?.participantCode || 'TEST-9999';
    const participantName = reqPayload?.participantName || 'MindLab Tester';
    const firstName = participantName.split(' ')[0] || 'MindLab Tester';

    console.log(`[Unlock Email Dispatcher] Standalone test send requested to ${recipient}`);

    const { subject, textBody, htmlBody } = generateTemplates({
      firstName,
      participantCode,
      appUrl: APP_BASE_URL,
      isTest: true,
    });

    if (isDryRun) {
      return new Response(JSON.stringify({
        success: true,
        mode: 'test_send_dry_run',
        recipient,
        subject,
        message: 'Dry run successful: test payload validated without dispatching.',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!RESEND_API_KEY && !SENDGRID_API_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No email provider credentials configured (RESEND_API_KEY required)',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

      const resData = await res.json().catch(() => null);

      if (res.ok) {
        console.log(`[Unlock Email Dispatcher] Test email delivered successfully to ${recipient}. Resend ID: ${resData?.id}`);
        return new Response(JSON.stringify({
          success: true,
          mode: 'test_send',
          messageId: resData?.id,
          recipient,
          sender: EMAIL_FROM,
          subject,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        console.error(`[Unlock Email Dispatcher] Resend API error: ${res.status}`, resData);
        return new Response(JSON.stringify({
          success: false,
          mode: 'test_send',
          httpStatus: res.status,
          error: resData?.message || 'Resend API returned an error',
          details: resData,
        }), {
          status: res.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (err: any) {
      console.error('[Unlock Email Dispatcher] Network failure:', err);
      return new Response(JSON.stringify({
        success: false,
        error: err?.message || 'Network failure dispatching email',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // MODE 2 & 3: Database Session Processing (Targeted or Scheduled Batch)
  // ---------------------------------------------------------------------------
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Claim sessions atomically via SECURITY DEFINER RPC
    // If targetSessionId is specified, claims strictly that isolated session.
    const { data: claimed, error: claimError } = await supabase.rpc('claim_pending_unlock_emails', {
      p_batch_size: targetSessionId ? 1 : 25,
      p_target_session_id: targetSessionId || null,
    });

    if (claimError) {
      console.error('[Unlock Email Dispatcher] Error claiming sessions:', claimError);
      return new Response(JSON.stringify({ error: claimError.message }), { status: 500 });
    }

    let sessions: ClaimedSession[] = (claimed || []) as ClaimedSession[];

    if (sessions.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending unlock emails ready to send.', count: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Unlock Email Dispatcher] Processing ${sessions.length} sessions. DryRun: ${isDryRun}`);
    const results = [];

    for (const session of sessions) {
      const recipient = testRecipientOverride || session.participant_email;
      const firstName = session.participant_name.split(' ')[0] || session.participant_name;

      if (!recipient || !recipient.includes('@')) {
        console.warn(`[Unlock Email Dispatcher] Session ${session.session_id} has invalid/empty email. Skipping.`);
        if (!isDryRun) {
          await supabase.from('sessions').update({
            unlock_email_status: 'not_applicable',
          }).eq('id', session.session_id);
        }
        results.push({
          session_id: session.session_id,
          participant_code: session.participant_code,
          recipient: null,
          status: 'skipped_no_email',
        });
        continue;
      }

      // Sandbox sender protection: prevent burning participant retries when sender domain is unverified
      const isSandboxSender = EMAIL_FROM.toLowerCase().includes('onboarding@resend.dev') || EMAIL_FROM.toLowerCase().includes('@resend.dev');
      const isAccountOwnerOrSink = recipient.toLowerCase() === 'sharmin.nipu1309@gmail.com' || recipient.toLowerCase().endsWith('@resend.dev');

      if (isSandboxSender && !isAccountOwnerOrSink) {
        const skipReason = `External recipient (${recipient}) skipped: sender is sandbox (${EMAIL_FROM}). Custom domain required at resend.com/domains to dispatch to external participants.`;
        console.warn(`[Unlock Email Dispatcher] ${skipReason}`);
        // Reset claimed status back to pending so retries are preserved
        if (!isDryRun) {
          await supabase.from('sessions').update({
            unlock_email_status: 'pending',
            unlock_email_claimed_at: null,
            unlock_email_error: 'Paused: Sender domain not verified in Resend. Custom domain required.',
          }).eq('id', session.session_id);
        }
        results.push({
          session_id: session.session_id,
          participant_code: session.participant_code,
          recipient,
          status: 'paused_unverified_sender_domain',
          error: skipReason,
        });
        continue;
      }

      const { subject, textBody, htmlBody } = generateTemplates({
        firstName,
        participantCode: session.participant_code,
        appUrl: APP_BASE_URL,
        isTest: Boolean(testRecipientOverride),
      });

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
      let messageId: string | null = null;

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

          const resData = await res.json().catch(() => null);

          if (res.ok) {
            sendSuccess = true;
            messageId = resData?.id || null;
          } else {
            sendError = resData?.message || `Resend HTTP ${res.status}`;
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
        sendError = 'No email provider credentials configured (RESEND_API_KEY required)';
      }

      // Record result in database
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
        messageId,
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
