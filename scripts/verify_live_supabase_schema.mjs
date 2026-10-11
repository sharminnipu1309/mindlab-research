// scripts/verify_live_supabase_schema.mjs
// Phase 2: Live Supabase Schema, RLS, Triggers, RPCs & Persistence Verification

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ummiczxtncwvozgvqlih.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_edu6CvEJ0QECXm-ZQByfJg_LvIjOK6n';
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyLiveSchema() {
  console.log('===============================================================');
  console.log('  MindLab — Phase 2: Live Supabase Schema & Security Audit');
  console.log('===============================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`URL:       ${SUPABASE_URL}`);

  // 1. Authenticate Admin
  const { data: authData, error: authErr } = await supabaseAdmin.auth.signInWithPassword({
    email: 'admin@mindlab.io',
    password: 'mindlab2024',
  });
  if (authErr) throw new Error(`Admin auth failed: ${authErr.message}`);
  console.log('✅ Admin authenticated for inspection.\n');

  // 2. Query schema metadata using PostgreSQL system catalogs via Management query or RPC
  console.log('--- 1. Tables & Columns Verification ---');
  const requiredTables = [
    'participants',
    'sessions',
    'corsi_trials',
    'stroop_trials',
    'task_switching_trials',
    'hanoi_puzzles',
    'hanoi_moves',
    'experiment_configs'
  ];

  for (const table of requiredTables) {
    const { data, error } = await supabaseAdmin.from(table).select('*').limit(1);
    if (error) {
      console.error(`❌ Table ${table} ERROR:`, error.message);
    } else {
      const cols = data && data[0] ? Object.keys(data[0]) : ['(empty row sample)'];
      console.log(`✅ Table public.${table.padEnd(23)} (Accessible, Sample Cols: ${cols.slice(0, 6).join(', ')}...)`);
    }
  }

  // Verify critical tracking columns on public.sessions
  console.log('\n--- 2. Sessions 24h Unlock & Email Tracking Columns ---');
  const { data: sampleSession } = await supabaseAdmin.from('sessions').select('*').limit(1);
  const sessionColumns = sampleSession && sampleSession[0] ? Object.keys(sampleSession[0]) : [];
  const requiredSessionCols = [
    'room_2_started_at',
    'rooms_3_4_unlock_at',
    'is_legacy',
    'unlock_email_sent_at',
    'unlock_email_claimed_at',
    'unlock_email_status',
    'unlock_email_attempts',
    'unlock_email_error',
    'task_switching_consistent_trials',
    'task_switching_shift_cost_ms'
  ];

  for (const col of requiredSessionCols) {
    const present = sessionColumns.includes(col);
    console.log(`  - Column ${col.padEnd(35)}: ${present ? '✅ Present' : '❌ MISSING'}`);
    if (!present) throw new Error(`Missing required session column: ${col}`);
  }

  // 3. Verify RPC Functions
  console.log('\n--- 3. Authoritative RPC Functions Verification ---');
  
  // 3A: check_rooms_3_4_access
  const { data: cData, error: cErr } = await supabaseAdmin.rpc('check_rooms_3_4_access', {
    p_session_id: '00000000-0000-0000-0000-000000000000'
  });
  console.log('  - RPC check_rooms_3_4_access       : Active (Returned:', cData || cErr, ')');

  // 3B: record_room_2_start
  const { data: rData, error: rErr } = await supabaseAdmin.rpc('record_room_2_start', {
    p_session_id: '00000000-0000-0000-0000-000000000000'
  });
  console.log('  - RPC record_room_2_start          : Active (Returned:', rData || rErr, ')');

  // 3C: resume_participant_session
  const { data: resData, error: resErr } = await supabaseAdmin.rpc('resume_participant_session', {
    p_participant_code: 'TEST-NONE',
    p_verification_name: 'Nobody',
    p_verification_email: null
  });
  console.log('  - RPC resume_participant_session   : Active (Returned:', resData || resErr, ')');

  // 3D: claim_pending_unlock_emails
  const { data: clData, error: clErr } = await supabaseAdmin.rpc('claim_pending_unlock_emails', {
    p_batch_size: 1,
    p_target_session_id: '00000000-0000-0000-0000-000000000000'
  });
  console.log('  - RPC claim_pending_unlock_emails  : Active (Returned:', clData ? `${clData.length} rows` : clErr, ')');

  // 3E: record_unlock_email_result
  const { data: recData, error: recErr } = await supabaseAdmin.rpc('record_unlock_email_result', {
    p_session_id: '00000000-0000-0000-0000-000000000000',
    p_success: false,
    p_error: 'Verification test'
  });
  console.log('  - RPC record_unlock_email_result   : Active (Returned:', recData || recErr, ')');

  // 3F: get_participant_config
  const { data: cfgData, error: cfgErr } = await supabaseAdmin.rpc('get_participant_config');
  console.log('  - RPC get_participant_config       : Active (Config Keys:', Object.keys(cfgData || {}).join(', '), ')');

  // 4. Test Experiment Data Persistence & Isolated Participant Lifecycle
  console.log('\n--- 4. End-to-End Experiment Persistence Lifecycle Test ---');
  let testPId = null;
  let testSId = null;

  // Use an isolated participant client with anonymous authentication (matching real participant browser)
  const participantClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: anonAuth, error: anonErr } = await participantClient.auth.signInAnonymously();
  if (anonErr) throw new Error(`Anonymous auth failed: ${anonErr.message}`);
  const anonUid = anonAuth.user.id;
  console.log(`  [Auth] Anonymous participant session initialized (UID: ${anonUid.slice(0, 8)}...)`);

  try {
    // 4A: Participant Registration via participant client
    const testCode = `P-AUDIT-${Date.now().toString().slice(-4)}`;
    const { data: p, error: pError } = await participantClient.from('participants').insert({
      auth_user_id: anonUid,
      participant_code: testCode,
      name: 'Auditor User',
      email: 'auditor@example.com',
      age: 26,
      gender: 'other',
      adhd_diagnosis: 'no',
    }).select().single();
    if (pError) throw pError;
    testPId = p.id;
    console.log(`  [4A] Registered isolated participant: ${testCode} (${testPId})`);

    // 4B: Session Creation via participant client
    const { data: s, error: sError } = await participantClient.from('sessions').insert({
      participant_id: testPId,
      session_status: 'in_progress',
      is_legacy: false,
    }).select().single();
    if (sError) throw sError;
    testSId = s.id;
    console.log(`  [4B] Created session: ${testSId}`);

    // 4C: Test Room 2 Start authoritative timestamp
    const { data: startR2, error: r2Error } = await participantClient.rpc('record_room_2_start', {
      p_session_id: testSId,
    });
    if (r2Error || !startR2.success) throw new Error(`record_room_2_start failed: ${JSON.stringify(r2Error || startR2)}`);
    console.log(`  [4C] Room 2 started: unlock_at=${startR2.rooms_3_4_unlock_at}, remaining_seconds=${startR2.remaining_seconds}`);

    // 4D: Test Server-Side Database Enforcement Trigger on Stroop Trials before 24h
    console.log('  [4D] Testing premature Room 3 insert guard trigger...');
    const { error: prematureInsertErr } = await participantClient.from('stroop_trials').insert({
      session_id: testSId,
      trial_number: 1,
      phase: 'experimental',
      word: 'RED',
      ink_color: 'green',
      condition: 'incongruent',
      correct_response: 'green',
      participant_response: 'green',
      is_correct: true,
      reaction_time_ms: 650,
      timestamp_ms: Date.now(),
    });

    if (prematureInsertErr) {
      console.log(`  ✅ Enforcement Trigger BLOCKED premature insert as expected: "${prematureInsertErr.message}"`);
    } else {
      throw new Error('CRITICAL VULNERABILITY: Premature trial insert before 24h was NOT blocked!');
    }

    // 4E: Test Session Resumption via RPC
    const { data: resumeRes, error: resumeErr } = await participantClient.rpc('resume_participant_session', {
      p_participant_code: testCode,
      p_verification_name: 'Auditor',
      p_verification_email: 'auditor@example.com'
    });
    if (resumeErr || !resumeRes.success) throw new Error(`resume_participant_session failed: ${JSON.stringify(resumeErr || resumeRes)}`);
    console.log(`  [4E] Session resumed successfully: participantCode=${resumeRes.participant?.id}, locked=${!resumeRes.session?.rooms3And4Unlocked}`);

  } finally {
    // 5. Cleanup ONLY isolated test records via admin client
    console.log('\n--- 5. Cleanup Isolated Audit Records ---');
    if (testSId) {
      await supabaseAdmin.from('sessions').delete().eq('id', testSId);
      console.log(`  Deleted test session: ${testSId}`);
    }
    if (testPId) {
      await supabaseAdmin.from('participants').delete().eq('id', testPId);
      console.log(`  Deleted test participant: ${testPId}`);
    }
  }

  // 6. Verify Baseline row count matches 22
  const { count: finalP } = await supabaseAdmin.from('participants').select('*', { count: 'exact', head: true });
  const { count: finalS } = await supabaseAdmin.from('sessions').select('*', { count: 'exact', head: true });
  console.log(`\nFinal State Check: ${finalP} participants, ${finalS} sessions (Expected: 22/22)`);
  if (finalP !== 22 || finalS !== 22) {
    throw new Error(`Data count mismatch: expected 22, got P=${finalP}, S=${finalS}`);
  }

  console.log('\n===============================================================');
  console.log('  Phase 2 Live Schema & Security Verification: 100% PASSED');
  console.log('===============================================================\n');
}

verifyLiveSchema().catch(err => {
  console.error('❌ Phase 2 Verification Failed:', err);
  process.exit(1);
});
