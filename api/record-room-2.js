import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ummiczxtncwvozgvqlih.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_edu6CvEJ0QECXm-ZQByfJg_LvIjOK6n';

/**
 * Serverless API handler to record Room 2 start and initialize the unlock countdown.
 * Sets rooms_3_4_unlock_at to 1 minute (60 seconds) after Room 2 is started
 * so participants/researchers can test the unlock flow immediately,
 * while the website displays protocol text of 24 hours.
 */
export default async function handler(req, res) {
  // Enable CORS
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

  const { sessionId } = req.body || {};
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Missing sessionId parameter' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Sign in as admin to bypass RLS restrictions on session updates
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: 'admin@mindlab.io',
      password: 'mindlab2024',
    });

    if (authErr) {
      console.error('[API /record-room-2] Admin authentication error:', authErr);
      return res.status(500).json({ success: false, error: 'Admin authentication failed' });
    }

    // Retrieve active session
    const { data: sess, error: sErr } = await supabase
      .from('sessions')
      .select('id, room_2_started_at, rooms_3_4_unlock_at')
      .eq('id', sessionId)
      .maybeSingle();

    if (sErr || !sess) {
      console.error('[API /record-room-2] Session query error:', sErr);
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const now = new Date();
    let room2StartedAt = sess.room_2_started_at;
    let unlockAt = sess.rooms_3_4_unlock_at;

    // 1-minute unlock interval (60 seconds)
    if (!room2StartedAt) {
      room2StartedAt = now.toISOString();
      unlockAt = new Date(now.getTime() + 60 * 1000).toISOString();

      await supabase
        .from('sessions')
        .update({
          room_2_started_at: room2StartedAt,
          rooms_3_4_unlock_at: unlockAt,
          unlock_email_status: 'pending',
          updated_at: now.toISOString(),
        })
        .eq('id', sessionId);
    } else if (
      !unlockAt ||
      new Date(unlockAt).getTime() - new Date(room2StartedAt).getTime() > 120 * 1000
    ) {
      // If previously set to 24 hours, adjust to 1 minute from startedAt or 1 minute from now
      const targetTime = new Date(room2StartedAt).getTime() + 60 * 1000;
      unlockAt = new Date(Math.max(Date.now() + 60 * 1000, targetTime)).toISOString();

      await supabase
        .from('sessions')
        .update({
          rooms_3_4_unlock_at: unlockAt,
          updated_at: now.toISOString(),
        })
        .eq('id', sessionId);
    }

    const remainingSeconds = Math.max(0, Math.floor((new Date(unlockAt).getTime() - Date.now()) / 1000));
    const unlocked = remainingSeconds <= 0;

    return res.status(200).json({
      success: true,
      sessionId,
      room_2_started_at: room2StartedAt,
      rooms_3_4_unlock_at: unlockAt,
      server_now: now.toISOString(),
      remaining_seconds: remainingSeconds,
      unlocked,
    });
  } catch (err) {
    console.error('[API /record-room-2] Unexpected error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
