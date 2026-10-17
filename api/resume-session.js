// api/resume-session.js
// Vercel Serverless Function: Resume Research Session by Participant ID or Name
// Allows returning participants to resume on any device using their Participant ID or Name.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ummiczxtncwvozgvqlih.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_edu6CvEJ0QECXm-ZQByfJg_LvIjOK6n';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ready', endpoint: '/api/resume-session' });
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

    const identifier = (body.identifier || body.code || body.id || '').trim();
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();

    const searchTerm = identifier || name || email;
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your Participant ID or Name.',
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // If using anon key, authenticate as admin to query participant records securely
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await supabase.auth.signInWithPassword({
        email: 'admin@mindlab.io',
        password: process.env.ADMIN_PASSWORD || 'mindlab2024',
      });
    }

    // 1. Search for participant
    let participants = [];

    // Search by participant code first if identifier resembles a code
    if (identifier) {
      const { data: byCode, error: cErr } = await supabase
        .from('participants')
        .select('id, participant_code, name, email, age, gender, adhd_diagnosis, created_at')
        .ilike('participant_code', identifier)
        .order('created_at', { ascending: false });

      if (!cErr && byCode && byCode.length > 0) {
        participants = byCode;
      }
    }

    // If not found yet and name provided or identifier could be a name
    if (participants.length === 0 && (name || identifier)) {
      const queryName = name || identifier;
      const { data: byName, error: nErr } = await supabase
        .from('participants')
        .select('id, participant_code, name, email, age, gender, adhd_diagnosis, created_at')
        .ilike('name', `%${queryName}%`)
        .order('created_at', { ascending: false });

      if (!nErr && byName && byName.length > 0) {
        participants = byName;
      }
    }

    // Backwards compatibility fallback if email provided
    if (participants.length === 0 && email && email.includes('@')) {
      const { data: byEmail } = await supabase
        .from('participants')
        .select('id, participant_code, name, email, age, gender, adhd_diagnosis, created_at')
        .ilike('email', email)
        .order('created_at', { ascending: false });

      if (byEmail && byEmail.length > 0) {
        participants = byEmail;
      }
    }

    if (!participants || participants.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No participant record found matching this Participant ID or Name. Please check your spelling.',
      });
    }

    const matchedParticipant = participants[0];

    // 2. Find active session for this participant
    const { data: sessions, error: sErr } = await supabase
      .from('sessions')
      .select('id, session_status, hanoi_completed, corsi_completed, stroop_completed, task_switching_completed, room_2_started_at, rooms_3_4_unlock_at, created_at')
      .eq('participant_id', matchedParticipant.id)
      .order('created_at', { ascending: false });

    if (sErr) {
      console.error('[API /resume-session] Database error finding session:', sErr);
      return res.status(500).json({ success: false, error: 'Database error retrieving session.' });
    }

    if (!sessions || sessions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active study session found for this participant.',
      });
    }

    const sess = sessions[0];

    // 3. Count completed tasks & trials
    const [hanoiRes, corsiRes, stroopRes, tsRes] = await Promise.all([
      supabase.from('hanoi_puzzles').select('*', { count: 'exact', head: true }).eq('session_id', sess.id),
      supabase.from('corsi_trials').select('*', { count: 'exact', head: true }).eq('session_id', sess.id),
      supabase.from('stroop_trials').select('*', { count: 'exact', head: true }).eq('session_id', sess.id),
      supabase.from('task_switching_trials').select('*', { count: 'exact', head: true }).eq('session_id', sess.id),
    ]);

    const participantData = {
      id: matchedParticipant.participant_code,
      dbId: matchedParticipant.id,
      name: matchedParticipant.name,
      email: matchedParticipant.email || undefined,
      age: matchedParticipant.age || 0,
      gender: matchedParticipant.gender || 'unspecified',
      adhdDiagnosis: matchedParticipant.adhd_diagnosis || 'none',
      hanoiCompleted: Boolean(sess.hanoi_completed),
      corsiCompleted: Boolean(sess.corsi_completed),
      stroopCompleted: Boolean(sess.stroop_completed),
      taskSwitchingCompleted: Boolean(sess.task_switching_completed),
      hanoiStatus: sess.hanoi_completed ? 'completed' : ((hanoiRes.count || 0) > 0 ? 'in_progress' : 'not_started'),
      corsiStatus: sess.corsi_completed ? 'completed' : ((corsiRes.count || 0) > 0 ? 'in_progress' : 'not_started'),
      stroopStatus: sess.stroop_completed ? 'completed' : ((stroopRes.count || 0) > 0 ? 'in_progress' : 'not_started'),
      taskSwitchingStatus: sess.task_switching_completed ? 'completed' : ((tsRes.count || 0) > 0 ? 'in_progress' : 'not_started'),
      hanoiProgressCount: hanoiRes.count || 0,
      corsiProgressCount: corsiRes.count || 0,
      stroopProgressCount: stroopRes.count || 0,
      taskSwitchingProgressCount: tsRes.count || 0,
      room2StartedAt: sess.room_2_started_at || new Date().toISOString(),
      rooms3And4UnlockAt: null,
      rooms3And4Unlocked: true,
    };

    return res.status(200).json({
      success: true,
      participant: participantData,
      sessionId: sess.id,
      remainingSeconds: 0,
    });
  } catch (err) {
    console.error('[API /resume-session] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error resuming session',
    });
  }
}
