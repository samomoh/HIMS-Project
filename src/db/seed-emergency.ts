/*
 * Seed + verification for the Emergency & Trauma Unit.
 *
 * Simulates one realistic ER shift: 9 arrivals covering all five triage levels,
 * registered patients AND unidentified trauma codes (with temp profiles
 * provisioned exactly as the live triage action does), active board cases plus
 * closed history (Admitted / Discharged / Deceased), STAT lab & imaging orders
 * for the critical arrivals, and staggered arrival times so the board reads
 * like a live department. Ends with a PASS/FAIL battery over persisted rows.
 *
 *   npm exec tsx -- -r dotenv/config src/db/seed-emergency.ts
 */

import { db } from './index';
import {
  patients, users, emergencyTriage, labResults, imagingResults, vitals,
} from './schema';
import { inArray, eq, count } from 'drizzle-orm';
import { logAuditTrail } from '../lib/audit';
import { assertSeedAllowed } from './seed-safety';

const G = '\x1b[32m', R = '\x1b[31m', C = '\x1b[36m', B = '\x1b[1m', D = '\x1b[2m', X = '\x1b[0m';
const hrsAgo = (h: number) => new Date(Date.now() - h * 3600_000);

type Case = {
  kind: 'registered' | 'unidentified';
  // registered → match an existing patient by last name (falls back to any)
  matchLast?: string;
  alias?: string;                       // unidentified board alias
  level: 'Resuscitation' | 'Emergent' | 'Urgent' | 'Less Urgent' | 'Non-Urgent';
  complaint: string;
  mechanism?: string;
  status: 'Active' | 'Admitted' | 'Discharged' | 'Deceased';
  arrivedHrsAgo: number;
  closedHrsAgo?: number;
  statLabs?: boolean;
  statImaging?: boolean;
  vitals?: { bp: string; hr: number; temp: string; rr: number; spo2: number };
};

const CASES: Case[] = [
  // ── ACTIVE BOARD ──────────────────────────────────────────────────────────
  { kind: 'unidentified', alias: 'John Doe – Bay 1 (MVA)', level: 'Resuscitation',
    complaint: 'Unresponsive post high-speed vehicle collision; intubated on scene.',
    mechanism: 'High-speed MVA, unrestrained driver, ejection.', status: 'Active', arrivedHrsAgo: 0.4,
    statLabs: true, statImaging: true, vitals: { bp: '78/44', hr: 138, temp: '35.8', rr: 8, spo2: 88 } },

  { kind: 'unidentified', alias: 'Jane Doe – Bay 2 (burns)', level: 'Emergent',
    complaint: 'Approx. 25% TBSA mixed-thickness burns from kerosene stove flash; airway patent.',
    mechanism: 'Domestic kerosene stove flash burn.', status: 'Active', arrivedHrsAgo: 1.1,
    statLabs: true, vitals: { bp: '104/66', hr: 118, temp: '36.4', rr: 24, spo2: 96 } },

  { kind: 'registered', matchLast: 'Kargbo', level: 'Emergent',
    complaint: 'Recurrent crushing chest pain at rest despite GTN; diaphoretic.',
    status: 'Active', arrivedHrsAgo: 1.8, statLabs: true, statImaging: true,
    vitals: { bp: '96/58', hr: 54, temp: '36.5', rr: 21, spo2: 95 } },

  { kind: 'registered', matchLast: 'Mansaray', level: 'Urgent',
    complaint: 'Post-operative day 2 — wound pain, fever 38.7°C, ?surgical site infection.',
    status: 'Active', arrivedHrsAgo: 2.6, statLabs: true,
    vitals: { bp: '108/70', hr: 102, temp: '38.7', rr: 20, spo2: 97 } },

  { kind: 'registered', matchLast: 'Turay', level: 'Less Urgent',
    complaint: 'Dizziness and one episode of vomiting; capillary glucose 22 mmol/L.',
    status: 'Active', arrivedHrsAgo: 3.2,
    vitals: { bp: '152/92', hr: 88, temp: '36.7', rr: 17, spo2: 98 } },

  { kind: 'registered', matchLast: 'Kabia', level: 'Non-Urgent',
    complaint: 'Superficial laceration to left forearm from market stall sheeting; tetanus status unknown.',
    mechanism: 'Laceration on corrugated metal sheeting.', status: 'Active', arrivedHrsAgo: 4.0,
    vitals: { bp: '116/74', hr: 79, temp: '36.6', rr: 16, spo2: 99 } },

  // ── HISTORY (closed) ──────────────────────────────────────────────────────
  { kind: 'registered', matchLast: 'Sesay', level: 'Resuscitation',
    complaint: 'Found collapsed; BP 224/130, GCS 12 — hypertensive emergency.',
    status: 'Admitted', arrivedHrsAgo: 26, closedHrsAgo: 24, statLabs: true },

  { kind: 'registered', matchLast: 'Koroma', level: 'Urgent',
    complaint: 'Severe asthma exacerbation; responded to burst therapy in ER.',
    status: 'Discharged', arrivedHrsAgo: 30, closedHrsAgo: 27 },

  { kind: 'unidentified', alias: 'John Doe – RTA pedestrian', level: 'Resuscitation',
    complaint: 'Pedestrian struck by lorry; traumatic cardiac arrest, ROSC never achieved.',
    mechanism: 'Pedestrian vs lorry at highway speed.', status: 'Deceased',
    arrivedHrsAgo: 48, closedHrsAgo: 47.5, statLabs: false },
];

async function main() {
  assertSeedAllowed();
  console.log(`\n${B}${C}HealthAI — Emergency & Trauma Unit seed${X}`);
  console.log(D + '─'.repeat(66) + X);

  const allUsers = await db.query.users.findMany();
  const anyUser = allUsers[0];
  if (!anyUser) throw new Error('No users in DB — seed staff first.');
  const erStaff = allUsers.filter(u => ['emergency', 'nurse', 'doctor'].includes(u.role));
  const staffPool = erStaff.length ? erStaff : [anyUser];
  const nurseId = (allUsers.find(u => u.role === 'nurse') ?? anyUser).id;

  const allPatients = await db.query.patients.findMany();
  const findPatient = (last?: string) =>
    (last && allPatients.find(p => p.lastName === last && p.firstName !== 'UNIDENTIFIED')) ?? allPatients[0];

  const triageIds: number[] = [];
  const tempPatientIds: number[] = [];
  let statLabCount = 0, statImgCount = 0;

  for (let i = 0; i < CASES.length; i++) {
    const cs = CASES[i];
    const staffId = staffPool[i % staffPool.length].id;

    // Resolve / provision the patient exactly like the live triage action.
    let patientId: number | null = null;
    if (cs.kind === 'unidentified') {
      const [tmp] = await db.insert(patients).values({
        firstName: 'UNIDENTIFIED', lastName: cs.alias!.slice(0, 240),
        dob: '1900-01-01', gender: 'Unknown', contact: 'N/A', emergencyContact: 'PENDING ID',
      }).returning();
      patientId = tmp.id; tempPatientIds.push(tmp.id);
    } else {
      const p = findPatient(cs.matchLast);
      if (!p) throw new Error(`No registered patient found for "${cs.matchLast}"`);
      patientId = p.id;
    }

    const [row] = await db.insert(emergencyTriage).values({
      staffId, patientId,
      unidentifiedName: cs.kind === 'unidentified' ? cs.alias : null,
      triageLevel: cs.level, chiefComplaint: cs.complaint,
      mechanismOfInjury: cs.mechanism ?? null,
      status: cs.status,
      arrivalTime: hrsAgo(cs.arrivedHrsAgo),
      dischargedTime: cs.status === 'Active' ? null : hrsAgo(cs.closedHrsAgo ?? cs.arrivedHrsAgo - 1),
    }).returning();
    triageIds.push(row.id);

    // STAT orders for critical arrivals (Emergency priority → pulses red in Lab/Radiology).
    if (cs.statLabs && patientId) {
      const rows = await db.insert(labResults).values([
        { patientId, doctorId: staffId, testName: 'STAT Comprehensive Metabolic Panel (CMP)', priority: 'Emergency', status: 'Pending' },
        { patientId, doctorId: staffId, testName: 'STAT Complete Blood Count (CBC)', priority: 'Emergency', status: 'Pending' },
        { patientId, doctorId: staffId, testName: 'STAT Troponin & Cardiac Biomarkers', priority: 'Emergency', status: 'Pending' },
      ]).returning();
      statLabCount += rows.length;
    }
    if (cs.statImaging && patientId) {
      const rows = await db.insert(imagingResults).values([
        { patientId, doctorId: staffId, procedureName: 'STAT Portable Chest X-Ray', priority: 'Emergency', status: 'Pending' },
        { patientId, doctorId: staffId, procedureName: 'STAT CT Scan - Head (trauma protocol)', priority: 'Emergency', status: 'Pending' },
      ]).returning();
      statImgCount += rows.length;
    }

    // Triage vitals for active cases.
    if (cs.status === 'Active' && cs.vitals && patientId) {
      await db.insert(vitals).values({
        patientId, nurseId,
        bloodPressure: cs.vitals.bp, heartRate: cs.vitals.hr, temperature: cs.vitals.temp,
        respiratoryRate: cs.vitals.rr, oxygenSaturation: cs.vitals.spo2,
        weight: '70.0', height: '170.0',
        notes: `ER triage vitals [${cs.level}] — ${cs.complaint.slice(0, 80)}`,
      });
    }

    const who = cs.kind === 'unidentified' ? cs.alias : `${cs.matchLast} (registered)`;
    console.log(`  ${G}✓${X} #${String(row.id).padStart(3)}  ${cs.level.padEnd(14)} ${String(cs.status).padEnd(11)} ${who}`);
  }

  await logAuditTrail(anyUser.id, 'Seeded ER shift', 'Emergency', `${CASES.length} triage cases (${CASES.filter(c => c.status === 'Active').length} active)`);

  // ── Assertions ─────────────────────────────────────────────────────────────
  const res: { n: string; ok: boolean; d?: string }[] = [];
  const chk = (n: string, ok: boolean, d?: string) => res.push({ n, ok, d });

  const rows = await db.select().from(emergencyTriage).where(inArray(emergencyTriage.id, triageIds));
  chk('all 9 triage rows persisted', rows.length === CASES.length, `found ${rows.length}`);

  const levels = new Set(rows.map(r => r.triageLevel));
  chk('all 5 triage levels on board', ['Resuscitation', 'Emergent', 'Urgent', 'Less Urgent', 'Non-Urgent'].every(l => levels.has(l)), [...levels].join(', '));

  const statuses = new Set(rows.map(r => r.status));
  chk('Active + Admitted + Discharged + Deceased present', ['Active', 'Admitted', 'Discharged', 'Deceased'].every(s => statuses.has(s)));

  chk('active cases have no discharge time; closed cases do',
    rows.every(r => r.status === 'Active' ? !r.dischargedTime : !!r.dischargedTime));

  chk('unidentified rows carry alias + temp profile',
    rows.filter(r => r.unidentifiedName).every(r => r.patientId && tempPatientIds.includes(r.patientId)),
    `${tempPatientIds.length} temp profiles`);

  const temps = await db.select().from(patients).where(inArray(patients.id, tempPatientIds));
  chk('temp profiles use UNIDENTIFIED convention', temps.every(t => t.firstName === 'UNIDENTIFIED' && t.emergencyContact === 'PENDING ID'));

  const patIds = rows.map(r => r.patientId!).filter(Boolean);
  const statLabs = await db.select().from(labResults).where(inArray(labResults.patientId, patIds));
  const newStatLabs = statLabs.filter(l => l.priority === 'Emergency' && l.status === 'Pending' && /^STAT /.test(l.testName));
  chk('STAT labs queued at Emergency priority', newStatLabs.length >= statLabCount, `${statLabCount} inserted`);

  const statImgs = await db.select().from(imagingResults).where(inArray(imagingResults.patientId, patIds));
  const newStatImgs = statImgs.filter(i => i.priority === 'Emergency' && i.status === 'Pending' && /^STAT /.test(i.procedureName));
  chk('STAT imaging queued at Emergency priority', newStatImgs.length >= statImgCount, `${statImgCount} inserted`);

  const activeIds = rows.filter(r => r.status === 'Active').map(r => r.patientId!);
  const vRows = await db.select().from(vitals).where(inArray(vitals.patientId, activeIds));
  chk('triage vitals recorded for active cases', activeIds.every(id => vRows.some(v => v.patientId === id)));

  const arrivals = rows.map(r => new Date(r.arrivalTime).getTime());
  chk('arrival times staggered across the shift', new Set(arrivals).size === arrivals.length && Math.max(...arrivals) - Math.min(...arrivals) > 24 * 3600_000);

  // ── Report ─────────────────────────────────────────────────────────────────
  console.log(`\n${B}${C}Functional checks${X}`);
  console.log(D + '─'.repeat(66) + X);
  for (const r of res) console.log(`  ${r.ok ? G + '[PASS]' + X : R + '[FAIL]' + X}  ${r.n}${r.d ? D + '  (' + r.d + ')' + X : ''}`);
  const passed = res.filter(r => r.ok).length;
  console.log(D + '─'.repeat(66) + X);
  console.log(`  ${B}${passed}/${res.length} checks passed${X}\n`);

  const active = rows.filter(r => r.status === 'Active').length;
  console.log(`${B}${C}Board summary${X}  ${D}(${active} active · ${rows.length - active} in history)${X}`);
  console.log(D + '  Active board : Resuscitation ×1 · Emergent ×2 · Urgent ×1 · Less Urgent ×1 · Non-Urgent ×1' + X);
  console.log(D + '  History      : Admitted ×1 · Discharged ×1 · Deceased ×1' + X);
  console.log(D + `  STAT queued  : ${statLabCount} labs + ${statImgCount} imaging (Emergency priority → /laboratory & /radiology)` + X);
  console.log(D + '  See it at    : /emergency (Active Trauma Board + ER History tabs)' + X + '\n');

  if (passed !== res.length) { console.error(R + B + '✗ A functional check failed.' + X); process.exit(1); }
  console.log(G + B + '✓ Emergency & Trauma Unit populated and verified.' + X + '\n');
}

main().catch(e => { console.error(R + 'Fatal:', e, X); process.exit(1); });
