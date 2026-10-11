// scripts/test_isolated_db_email_flow.mjs
// Isolated end-to-end verification of 24h database unlock and Edge Function targeting
// Uses isolated temporary test record with researcher email (sharmin.nipu1309@gmail.com)
// Strictly deletes test record upon completion. Zero impact on real participants.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ummiczxtncwvozgvqlih.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_edu6CvEJ0QECXm-ZQByfJg_LvIjOK6n';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runIsolatedFlow() {
  console.log('=== Isolated 24h Unlock DB & Edge Function Workflow Test ===\n');

  // Authenticate as Admin
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@mindlab.io',
    password: 'mindlab2024',
  });
  if (authErr) throw new Error(`Admin auth failed: ${authErr.message}`);
  const adminToken = authData.session.access_token;

  let testParticipantId = null;
  let testSessionId = null;

  try {
    // 1. Create isolated test participant with researcher's email
    const testCode = `T-ISO-${Date.now().toString().slice(-4)}`;
    const { data: part, error: pErr } = await supabase.from('participants').insert({
      participant_code: testCode,
      name: 'Sharmin Nipu',
      email: 'sharmin.nipu1309@gmail.com',
      age: 28,
      gender: 'female',
      adhd_diagnosis: 'no',
    }).select().single();
    if (pErr) throw pErr;
    testParticipantId = part.id;
    console.log(`[1] Created isolated test participant: ${testCode} (${part.id})`);

    // 2. Create session with 25 hours elapsed (ready for unlock email)
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

    const { data: sess, error: sErr } = await supabase.from('sessions').insert({
      participant_id: testParticipantId,
      room_2_started_at: twentyFiveHoursAgo,
      rooms_3_4_unlock_at: oneHourAgo,
      unlock_email_status: 'pending',
      unlock_email_attempts: 0,
      is_legacy: false,
    }).select().single();
    if (sErr) throw sErr;
    testSessionId = sess.id;
    console.log(`[2] Created isolated test session: ${testSessionId} (rooms_3_4_unlock_at: ${oneHourAgo})`);

    // 3. Verify check_rooms_3_4_access confirms unlocked
    const { data: accessCheck } = await supabase.rpc('check_rooms_3_4_access', {
      p_session_id: testSessionId,
    });
    console.log(`[3] Access check result: unlocked=${accessCheck?.unlocked}, reason=${accessCheck?.reason}`);
    if (!accessCheck?.unlocked) throw new Error('Expected access to be unlocked after 24h elapsed.');

    // 4. Trigger Edge Function targeting ONLY this specific testSessionId
    console.log(`[4] Invoking Edge Function with targetSessionId=${testSessionId}...`);
    const edgeRes = await fetch('https://ummiczxtncwvozgvqlih.supabase.co/functions/v1/send-unlock-notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetSessionId: testSessionId,
        testRecipient: 'sharmin.nipu1309@gmail.com',
      }),
    });

    const edgeData = await edgeRes.json();
    console.log(`    Edge Function HTTP ${edgeRes.status}:`, JSON.stringify(edgeData, null, 2));

    // 5. Verify database state for this session
    const { data: updatedSess } = await supabase.from('sessions').select('*').eq('id', testSessionId).single();
    console.log(`[5] Updated session in DB: status=${updatedSess?.unlock_email_status}, sent_at=${updatedSess?.unlock_email_sent_at}, attempts=${updatedSess?.unlock_email_attempts}`);

    if (updatedSess?.unlock_email_status === 'sent' && updatedSess?.unlock_email_sent_at) {
      console.log('✅ End-to-end database workflow verified: session marked sent with timestamp!');
    } else {
      console.warn('⚠️ Session state check:', updatedSess);
    }

  } finally {
    // 6. Clean up temporary test records
    console.log('\n[6] Cleaning up isolated test records...');
    if (testSessionId) {
      await supabase.from('sessions').delete().eq('id', testSessionId);
      console.log(`    Deleted test session: ${testSessionId}`);
    }
    if (testParticipantId) {
      await supabase.from('participants').delete().eq('id', testParticipantId);
      console.log(`    Deleted test participant: ${testParticipantId}`);
    }

    // Verify final baseline count
    const { count: finalP } = await supabase.from('participants').select('*', { count: 'exact', head: true });
    const { count: finalS } = await supabase.from('sessions').select('*', { count: 'exact', head: true });
    console.log(`    Baseline check: ${finalP} participants, ${finalS} sessions remaining (Expected: 22/22)`);
  }
}

runIsolatedFlow().catch(console.error);
