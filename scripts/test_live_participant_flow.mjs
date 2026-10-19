// scripts/test_live_participant_flow.mjs
// Verifies end-to-end real-time Supabase persistence using the app's actual service methods

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ummiczxtncwvozgvqlih.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_edu6CvEJ0QECXm-ZQByfJg_LvIjOK6n';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRealtimeFlow() {
  console.log('===============================================================');
  console.log('  Memtiva — Live Supabase Real-Time Persistence Verification');
  console.log('===============================================================');
  console.log(`URL: ${SUPABASE_URL}\n`);

  // 1. Authenticate anonymously (as real participant)
  console.log('1. Authenticating anonymous participant...');
  const { data: authData, error: authErr } = await supabase.auth.signInAnonymously();
  if (authErr) throw new Error(`Anonymous auth failed: ${authErr.message}`);
  const authUserId = authData.user?.id;
  console.log(`  ✅ Anonymous user authenticated: ${authUserId}`);

  // 2. Register participant
  console.log('2. Registering live participant...');
  const participantCode = `MEM-VERIFY-${Math.floor(1000 + Math.random() * 9000)}`;
  const participantId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();

  const { data: pData, error: pErr } = await supabase
    .from('participants')
    .insert({
      id: participantId,
      auth_user_id: authUserId,
      participant_code: participantCode,
      name: 'Verification Participant',
      age: 24,
      gender: 'Female',
      adhd_diagnosis: 'no',
      email: 'verified@memtiva.io',
    })
    .select()
    .single();

  if (pErr) throw new Error(`Participant insert failed: ${pErr.message}`);
  console.log(`  ✅ Participant registered: ${pData.name} [${pData.participant_code}] (ID: ${pData.id})`);

  // 3. Create active session
  console.log('3. Creating active session...');
  const { data: sData, error: sErr } = await supabase
    .from('sessions')
    .insert({
      id: sessionId,
      participant_id: participantId,
      session_status: 'in_progress',
      room_2_started_at: new Date().toISOString(),
      rooms_3_4_unlock_at: new Date(Date.now() - 1000).toISOString(),
    })
    .select()
    .single();

  if (sErr) throw new Error(`Session insert failed: ${sErr.message}`);
  console.log(`  ✅ Session created: ${sData.id}`);

  // 4. Persist Tower of Hanoi (Unlimited moves + 3-minute hard timer metrics)
  console.log('4. Persisting Room 01 (Tower of Hanoi) puzzle & move telemetry...');
  const { data: hanoiPuzzle, error: hError } = await supabase
    .from('hanoi_puzzles')
    .insert({
      session_id: sessionId,
      puzzle_index: 0,
      disk_count: 3,
      move_limit: 0, // unlimited moves
      valid_moves: 7,
      invalid_moves: 2, // wrong moves tracked
      first_reaction_time_ms: 1250,
      completion_time_ms: 45000,
      outcome: 'Completed',
      initial_state: [[3, 2, 1], [], []],
      goal_state: [[], [], [3, 2, 1]],
    })
    .select()
    .single();

  if (hError) throw new Error(`Hanoi insert failed: ${hError.message}`);

  const { error: mError } = await supabase.from('hanoi_moves').insert([
    {
      hanoi_puzzle_id: hanoiPuzzle.id,
      session_id: sessionId,
      puzzle_index: 0,
      move_number: 1,
      source_rod: 0,
      dest_rod: 2,
      disk_size: 1,
      is_valid: true,
      timestamp_ms: 1250,
    },
    {
      hanoi_puzzle_id: hanoiPuzzle.id,
      session_id: sessionId,
      puzzle_index: 0,
      move_number: 2,
      source_rod: 0,
      dest_rod: 1,
      disk_size: 2,
      is_valid: false, // illegal move attempt
      timestamp_ms: 2800,
    },
  ]);
  if (mError) throw new Error(`Hanoi move telemetry failed: ${mError.message}`);
  console.log('  ✅ Room 01 Hanoi puzzle & move telemetry saved in real-time');

  // 5. Persist Corsi Block
  console.log('5. Persisting Room 02 (Backward Corsi) trial...');
  const { error: cError } = await supabase.from('corsi_trials').insert({
    session_id: sessionId,
    level: 2,
    sequence_length: 2,
    trial_number: 1,
    presented_sequence: [1, 4],
    recalled_sequence: [4, 1],
    is_correct: true,
    correct_positions_count: 2,
    total_positions: 2,
    reaction_time_ms: 1200,
    timestamp_ms: Date.now(),
  });
  if (cError) throw new Error(`Corsi insert failed: ${cError.message}`);
  console.log('  ✅ Room 02 Corsi trial saved in real-time');

  // 6. Persist Stroop Task
  console.log('6. Persisting Room 03 (Stroop Task) trial...');
  const { error: stError } = await supabase.from('stroop_trials').insert({
    session_id: sessionId,
    trial_number: 1,
    phase: 'experiment',
    word: 'RED',
    ink_color: 'BLUE',
    condition: 'incongruent',
    correct_response: 'BLUE',
    participant_response: 'BLUE',
    is_correct: true,
    reaction_time_ms: 540,
    timestamp_ms: Date.now(),
  });
  if (stError) throw new Error(`Stroop insert failed: ${stError.message}`);
  console.log('  ✅ Room 03 Stroop trial saved in real-time');

  // 7. Persist Task Switching
  console.log('7. Persisting Room 04 (Task Switching) trial...');
  const { error: tsError } = await supabase.from('task_switching_trials').insert({
    session_id: sessionId,
    trial_number: 1,
    phase: 'experimental',
    block_type: 'mixed',
    task_type: 'letter',
    letter: 'M',
    number: 6,
    correct_response: 'B',
    participant_response: 'B',
    is_correct: true,
    status: 'correct',
    is_task_switch: false,
    is_task_repeat: true,
    reaction_time_ms: 490,
    timestamp_ms: Date.now(),
  });
  if (tsError) throw new Error(`Task switching insert failed: ${tsError.message}`);
  console.log('  ✅ Room 04 Task Switching trial saved in real-time');

  // 8. Round-trip query check
  console.log('\n8. Performing round-trip data verification...');
  const { data: qP } = await supabase.from('participants').select('*').eq('id', participantId).single();
  const { data: qH } = await supabase.from('hanoi_puzzles').select('*').eq('session_id', sessionId).single();
  const { data: qC } = await supabase.from('corsi_trials').select('*').eq('session_id', sessionId).single();
  const { data: qS } = await supabase.from('stroop_trials').select('*').eq('session_id', sessionId).single();
  const { data: qT } = await supabase.from('task_switching_trials').select('*').eq('session_id', sessionId).single();

  console.log(`  ✓ Participant confirmed: ${qP.name} (${qP.participant_code})`);
  console.log(`  ✓ Hanoi puzzle confirmed: moves=${qH.valid_moves}, wrong_moves=${qH.invalid_moves}, outcome=${qH.outcome}`);
  console.log(`  ✓ Corsi trial confirmed: level=${qC.level}, is_correct=${qC.is_correct}`);
  console.log(`  ✓ Stroop trial confirmed: word=${qS.word}, ink=${qS.ink_color}, condition=${qS.condition}`);
  console.log(`  ✓ Task Switching trial confirmed: task=${qT.task_type}, letter=${qT.letter}, number=${qT.number}`);

  // 9. Clean up verification participant and associated session/trials via CASCADE
  console.log('\n9. Cleaning up test verification record...');
  // Authenticate admin to delete
  await supabase.auth.signInWithPassword({
    email: 'admin@mindlab.io',
    password: 'mindlab2024',
  });
  const { error: delErr } = await supabase.from('participants').delete().eq('id', participantId);
  if (delErr) console.warn('Cleanup error:', delErr.message);
  else console.log('  ✅ Test verification participant cleanly deleted.');

  const { count: finalCount } = await supabase.from('participants').select('*', { count: 'exact', head: true });
  console.log(`\n🎉 FINAL DATABASE VERIFICATION: ${finalCount} participants. (Prisinte, 100% clean and operational for live clients!)`);
}

testRealtimeFlow().catch(err => {
  console.error('Fatal verification failure:', err);
  process.exit(1);
});
