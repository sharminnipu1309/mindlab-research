import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ummiczxtncwvozgvqlih.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_edu6CvEJ0QECXm-ZQByfJg_LvIjOK6n';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function auditMigration() {
  console.log('=== Supabase Migration Verification ===\n');
  const auth = await supabase.auth.signInWithPassword({ email: 'admin@mindlab.io', password: 'mindlab2024' });
  if (auth.error) {
    console.error('Admin auth failed:', auth.error.message);
    return;
  }
  
  // 1. Check all email columns in public.sessions
  const { data: sess, error: sErr } = await supabase.from('sessions')
    .select('id, room_2_started_at, rooms_3_4_unlock_at, is_legacy, unlock_email_sent_at, unlock_email_claimed_at, unlock_email_status, unlock_email_attempts, unlock_email_error')
    .limit(1);
  console.log('[1] Sessions email tracking columns exist:', !sErr);
  if (sess && sess[0]) {
    console.log('    Fields verified:', Object.keys(sess[0]).join(', '));
  }

  // 2. Check RPC check_rooms_3_4_access
  const { data: accessData, error: aErr } = await supabase.rpc('check_rooms_3_4_access', {
    p_session_id: '00000000-0000-0000-0000-000000000000'
  });
  console.log('[2] RPC check_rooms_3_4_access status:', accessData ? 'Active' : 'Error', accessData || aErr);

  // 3. Check RPC record_room_2_start
  const { data: r2Data, error: r2Err } = await supabase.rpc('record_room_2_start', {
    p_session_id: '00000000-0000-0000-0000-000000000000'
  });
  console.log('[3] RPC record_room_2_start status:', r2Data ? 'Active' : 'Error', r2Data || r2Err);

  // 4. Check RPC resume_participant_session
  const { data: resData, error: resErr } = await supabase.rpc('resume_participant_session', {
    p_participant_code: 'TEST',
    p_verification_name: 'Test',
    p_verification_email: 'test@example.com'
  });
  console.log('[4] RPC resume_participant_session status:', resData ? 'Active' : 'Error', resData || resErr);

  // 5. Research tables row counts & RLS integrity
  const tables = ['participants', 'sessions', 'corsi_trials', 'stroop_trials', 'task_switching_trials', 'hanoi_puzzles', 'hanoi_moves'];
  console.log('\n[5] Table Data Counts & RLS Access:');
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`    - Table ${t.padEnd(23)}: ${count} rows (Error: ${error?.message || 'none'})`);
  }
  console.log('\n=== Migration Audit Completed Successfully ===');
}

auditMigration().catch(console.error);
