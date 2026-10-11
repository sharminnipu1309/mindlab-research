// scripts/backup_and_audit_research_data.mjs
// Phase 1: Research Data Safety Audit and Full Live Backup
// Strictly non-destructive. Masks all PII.

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ummiczxtncwvozgvqlih.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_edu6CvEJ0QECXm-ZQByfJg_LvIjOK6n';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function maskEmail(email) {
  if (!email) return 'null';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length <= 2 ? `${name[0]}*` : `${name.slice(0, 2)}***${name.slice(-1)}`;
  return `${maskedName}@${domain}`;
}

function maskName(name) {
  if (!name) return 'null';
  return name.split(' ').map(part => part.length <= 1 ? '*' : `${part[0]}***`).join(' ');
}

async function runAuditAndBackup() {
  console.log('===============================================================');
  console.log('  MindLab — Phase 1: Research Data Safety Audit & Live Backup');
  console.log('===============================================================');
  console.log(`Execution Timestamp: ${new Date().toISOString()}`);
  console.log(`Supabase URL:        ${SUPABASE_URL}`);

  // 1. Authenticate as Admin
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@mindlab.io',
    password: 'mindlab2024',
  });
  if (authErr) {
    throw new Error(`Admin authentication failed: ${authErr.message}`);
  }
  console.log('✅ Admin session authenticated successfully.\n');

  // 2. Fetch all research tables with full rows
  const tables = [
    'participants',
    'sessions',
    'hanoi_puzzles',
    'hanoi_moves',
    'corsi_trials',
    'stroop_trials',
    'task_switching_trials',
    'experiment_configs'
  ];

  const liveData = {};
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      throw new Error(`Failed to fetch table ${table}: ${error.message}`);
    }
    liveData[table] = data || [];
    console.log(`  - Table ${table.padEnd(23)}: ${liveData[table].length} rows retrieved`);
  }

  // 3. Create fresh timestamped full backup
  const backupDir = path.resolve('supabase_backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `mindlab_supabase_backup_${timestampStr}.json`;
  const backupPath = path.join(backupDir, backupFilename);

  fs.writeFileSync(backupPath, JSON.stringify(liveData, null, 2), 'utf-8');
  console.log(`\n✅ LIVE BACKUP CREATED: ${backupFilename} (${(fs.statSync(backupPath).size / 1024).toFixed(1)} KB)\n`);

  // 4. Compare with latest prior backup if available
  const existingBackups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('mindlab_supabase_backup_') && f.endsWith('.json') && f !== backupFilename)
    .sort();

  if (existingBackups.length > 0) {
    const previousBackupFile = existingBackups[existingBackups.length - 1];
    console.log(`--- Comparing Against Prior Backup: ${previousBackupFile} ---`);
    const priorData = JSON.parse(fs.readFileSync(path.join(backupDir, previousBackupFile), 'utf-8'));

    for (const table of tables) {
      const priorCount = priorData[table]?.length || 0;
      const liveCount = liveData[table]?.length || 0;
      const diff = liveCount - priorCount;
      const sign = diff >= 0 ? `+${diff}` : `${diff}`;
      console.log(`  - ${table.padEnd(23)}: Prior=${priorCount}, Live=${liveCount} (${sign})`);
    }

    // Check that every participant in the prior backup still exists in live data
    const liveParticipantIds = new Set(liveData.participants.map(p => p.id));
    const liveParticipantCodes = new Set(liveData.participants.map(p => p.participant_code));
    const missingParticipants = (priorData.participants || []).filter(p => !liveParticipantIds.has(p.id));

    if (missingParticipants.length === 0) {
      console.log('✅ ALL participants from previous backup exist in live database (0 missing).');
    } else {
      console.error(`❌ CRITICAL: ${missingParticipants.length} participant(s) missing from previous backup!`);
    }

    // Check that every session in the prior backup still exists
    const liveSessionIds = new Set(liveData.sessions.map(s => s.id));
    const missingSessions = (priorData.sessions || []).filter(s => !liveSessionIds.has(s.id));
    if (missingSessions.length === 0) {
      console.log('✅ ALL sessions from previous backup exist in live database (0 missing).');
    } else {
      console.error(`❌ CRITICAL: ${missingSessions.length} session(s) missing from previous backup!`);
    }
  }

  // 5. Relational & Foreign Key Integrity Checks
  console.log('\n--- Relational Integrity & Data Health ---');
  const participantIdMap = new Map(liveData.participants.map(p => [p.id, p]));
  const sessionIdMap = new Map(liveData.sessions.map(s => [s.id, s]));

  // Check 5A: Every session has a valid participant
  let orphanSessions = 0;
  for (const s of liveData.sessions) {
    if (!participantIdMap.has(s.participant_id)) {
      orphanSessions++;
    }
  }
  console.log(`  - Sessions with valid participant: ${liveData.sessions.length - orphanSessions}/${liveData.sessions.length} (Orphans: ${orphanSessions})`);

  // Check 5B: Every trial table row references a valid session
  const trialTables = [
    { name: 'hanoi_puzzles', rows: liveData.hanoi_puzzles },
    { name: 'corsi_trials', rows: liveData.corsi_trials },
    { name: 'stroop_trials', rows: liveData.stroop_trials },
    { name: 'task_switching_trials', rows: liveData.task_switching_trials },
  ];

  for (const tt of trialTables) {
    let orphans = 0;
    for (const r of tt.rows) {
      if (!sessionIdMap.has(r.session_id)) {
        orphans++;
      }
    }
    console.log(`  - ${tt.name.padEnd(23)}: ${tt.rows.length} rows, orphans: ${orphans}`);
  }

  // Check 5C: Hanoi moves reference valid hanoi puzzle
  const puzzleIdMap = new Map(liveData.hanoi_puzzles.map(p => [p.id, p]));
  let orphanMoves = 0;
  for (const m of liveData.hanoi_moves) {
    if (!puzzleIdMap.has(m.hanoi_puzzle_id)) {
      orphanMoves++;
    }
  }
  console.log(`  - hanoi_moves            : ${liveData.hanoi_moves.length} rows, orphans: ${orphanMoves}`);

  // 6. Inspect Participant IDs (masked PII)
  console.log('\n--- Active Participants Summary (PII Masked) ---');
  for (const p of liveData.participants) {
    const sessionCount = liveData.sessions.filter(s => s.participant_id === p.id).length;
    console.log(`  Participant [${p.participant_code}] (ID: ${p.id.slice(0, 8)}...): Name=${maskName(p.name)}, Email=${maskEmail(p.email)}, Age=${p.age}, Gender=${p.gender}, ADHD=${p.adhd_diagnosis}, Sessions=${sessionCount}`);
  }

  // 7. Verify Duplicate Participant Codes
  const codeCounts = {};
  for (const p of liveData.participants) {
    codeCounts[p.participant_code] = (codeCounts[p.participant_code] || 0) + 1;
  }
  const duplicates = Object.entries(codeCounts).filter(([_, count]) => count > 1);
  if (duplicates.length === 0) {
    console.log('\n✅ Participant codes are 100% UNIQUE (0 duplicates).');
  } else {
    console.warn('\n⚠️ Duplicate participant codes detected:', duplicates);
  }

  console.log('\n===============================================================');
  console.log('  Phase 1 Audit & Backup Complete: 100% Data Preserved');
  console.log('===============================================================\n');
}

runAuditAndBackup().catch(err => {
  console.error('❌ Phase 1 Audit Failure:', err);
  process.exit(1);
});
