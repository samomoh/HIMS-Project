/*
 * Seed + functional test for ONE radiology-led patient journey.
 *
 * Adds a single patient whose pathway is driven by imaging: a contrast CT Chest
 * whose report embeds a verbatim sample (Findings + Impression) adapted from a
 * published radiology teaching example (DocPanel — "Insider Guide to
 * Understanding Your Radiology Report"), plus the prompting Chest X-Ray. The
 * indeterminate ground-glass-nodule finding then drives a Refer-Out decision,
 * so the case also surfaces in the Specialist Hub.
 *
 *   npm exec tsx -- -r dotenv/config src/db/seed-radiology-flow.ts
 */

import { db } from './index';
import {
  patients, medicalRecords, labResults, imagingResults,
  vitals, invoices, recordAudits, systemAuditTrail,
} from './schema';
import { eq, count } from 'drizzle-orm';
import { logAuditTrail } from '../lib/audit';
import { assertSeedAllowed } from './seed-safety';

const G = '\x1b[32m', R = '\x1b[31m', C = '\x1b[36m', B = '\x1b[1m', D = '\x1b[2m', X = '\x1b[0m';

// ── Verbatim sample report (Findings + Impression) from DocPanel, wrapped in a
//    standard CT-Chest header. The two verbatim lines below are quoted exactly. ──
const CT_REPORT = `EXAMINATION: CT CHEST WITH INTRAVENOUS CONTRAST
INDICATION: Persistent dry cough and weight loss; abnormal chest radiograph. Rule out malignancy.
COMPARISON: Chest radiograph (PA) of the same episode.
TECHNIQUE: Volumetric acquisition of the chest following intravenous iodinated contrast; images reconstructed at 1.0 mm in lung and mediastinal windows. No acute motion artefact.
FINDINGS:
  Lungs: Scattered centrilobular ground-glass nodules, most prominent in the right middle lobe.
  Pleural space: Unremarkable. No pneumothorax. No effusion.
  Heart: Unremarkable. No cardiomegaly. No pericardial effusion.
  Airways: Trachea midline; central airways patent. No endobronchial lesion.
  Mediastinum / hila: No pathologically enlarged lymph nodes by size criteria.
  Upper abdomen (visualised): No focal hepatic or adrenal lesion on included sections.
  Bones / soft tissues: No aggressive osseous lesion.
IMPRESSION:
  1. Scattered centrilobular ground-glass nodules are more prominent in the right middle lobe. Differential diagnosis includes hypersensitivity pneumonitis, respiratory bronchiolitis, endobronchial spread of infection (TB, non-tuberculous mycobacterial infection, aspergillosis).
  2. No mediastinal or hilar lymphadenopathy; no pleural disease.
  3. Clinical correlation advised; bronchoscopy with BAL and follow-up per MDT recommended.
[Report core adapted from a published radiology teaching example: DocPanel.]`;

const CXR_REPORT = `EXAMINATION: CHEST RADIOGRAPH (PA)
FINDINGS: Increased reticulonodular shadowing in the right mid-zone; right heart border partially obscured. Cardiac silhouette within normal limits. Costophrenic angles sharp. No pneumothorax. Bony thorax unremarkable.
IMPRESSION: Right mid-zone reticulonodular opacity of indeterminate aetiology; CT correlation advised (performed same episode).`;

const dob = '1968-02-11';

async function main() {
  assertSeedAllowed();
  console.log(`\n${B}${C}HealthAI — radiology patient flow (single case)${X}`);
  console.log(D + '─'.repeat(64) + X);

  const allUsers = await db.query.users.findMany();
  const byRole = (r: string) => allUsers.filter(u => u.role === r);
  const anyUser = allUsers[0];
  if (!anyUser) throw new Error('No users in DB.');
  const doctorId = (byRole('doctor')[0] ?? anyUser).id;
  const nurseId = (byRole('nurse')[0] ?? anyUser).id;
  const billerId = (byRole('receptionist')[0] ?? byRole('admin')[0] ?? anyUser).id;
  const officerId = (byRole('medical_records')[0] ?? byRole('admin')[0] ?? anyUser).id;
  const radA = 'Dr. F. Conteh, FRCR';
  const radB = 'Dr. A. Kamara, FRCR';

  const baselineTrail = Number((await db.select({ c: count() }).from(systemAuditTrail))[0].c);

  // 1. Patient — a complete showcase record (no nulls)
  const [p] = await db.insert(patients).values({
    firstName: 'Abdul', lastName: 'Jalloh', dob, gender: 'Male',
    contact: '+232 76 305 884', address: '14 Fourah Bay Road, Freetown',
    bloodGroup: 'B+', emergencyContact: '+232 77 612 440',
  }).returning();
  console.log(`  ${G}✓${X} patient #${p.id}  Abdul Jalloh (58, M)  ${D}radiology-led case${X}`);

  // 2. Clinical review (consult + exam + diagnosis) — decision made after imaging
  const [rec] = await db.insert(medicalRecords).values({
    patientId: p.id, doctorId,
    consultation: '8-week history of dry cough, anorexia and 6 kg weight loss. 30 pack-year smoking history. No haemoptysis, fevers or night sweats.',
    physicalExamination: 'Chest clear to auscultation, no wheeze or crepitations. No cervical or supraclavicular lymphadenopathy. Cachectic; weight 62 kg.',
    diagnosis: 'Right middle lobe ground-glass nodules — indeterminate (differential per CT: hypersensitivity pneumonitis vs respiratory bronchiolitis vs endobronchial infection incl. TB); exclude early adenocarcinoma spectrum.',
    decisionType: 'Refer Out',
    referralNote: 'Referred to Respiratory Medicine / Thoracic & TB MDT. Request bronchoscopy with BAL (cell count, culture, AFB/NAAT, cytology) and clinical correlation; consider PET-CT if nodules persist or grow. Smoking-cessation support initiated. CXR and contrast CT Chest attached.',
    treatment: 'Symptom control; smoking cessation; await MDT outcome. Safety-net if haemoptysis or worsening dyspnoea.',
    notes: 'Counselled regarding diagnostic uncertainty and the plan; written information given; escort present.',
  }).returning();

  // 3. Diagnostic queue — labs + two imaging studies, all Urgent
  const labRows = await db.insert(labResults).values([
    { patientId: p.id, doctorId, testName: 'Complete Blood Count (CBC)', status: 'Pending', priority: 'Urgent' },
    { patientId: p.id, doctorId, testName: 'C-reactive Protein (CRP)', status: 'Pending', priority: 'Urgent' },
  ]).returning();
  const ctRow = (await db.insert(imagingResults).values({ patientId: p.id, doctorId, procedureName: 'CT Chest with IV contrast', status: 'Pending', priority: 'Urgent' }).returning())[0];
  const cxrRow = (await db.insert(imagingResults).values({ patientId: p.id, doctorId, procedureName: 'Chest X-Ray (PA)', status: 'Pending', priority: 'Urgent' }).returning())[0];

  // 4. Laboratory completes + validates
  await db.update(labResults).set({ status: 'Completed', result: 'Hb 12.8 g/dL, WBC 7.1 x10^9/L, platelets 286 x10^9/L — within reference range.', validatedBy: 'Tech. S. Kamara', dateCompleted: new Date() }).where(eq(labResults.id, labRows[0].id));
  await db.update(labResults).set({ status: 'Completed', result: 'CRP 18 mg/L (mildly elevated).', validatedBy: 'Tech. S. Kamara', dateCompleted: new Date() }).where(eq(labResults.id, labRows[1].id));

  // 5. Radiology schedules then reports both studies (CT carries the verbatim sample)
  const past = new Date(Date.now() - 2 * 3600_000);
  await db.update(imagingResults).set({ status: 'Scheduled', scheduledDate: past }).where(eq(imagingResults.id, cxrRow.id));
  await db.update(imagingResults).set({ status: 'Completed', resultText: CXR_REPORT, validatedBy: radB, dateCompleted: new Date() }).where(eq(imagingResults.id, cxrRow.id));
  await db.update(imagingResults).set({ status: 'Scheduled', scheduledDate: new Date(past.getTime() + 3600_000) }).where(eq(imagingResults.id, ctRow.id));
  await db.update(imagingResults).set({ status: 'Completed', resultText: CT_REPORT, validatedBy: radA, dateCompleted: new Date() }).where(eq(imagingResults.id, ctRow.id));

  // 6. Nursing vitals
  const [v] = await db.insert(vitals).values({
    patientId: p.id, nurseId, bloodPressure: '128/80', heartRate: 84, temperature: '36.9',
    respiratoryRate: 18, oxygenSaturation: 97, weight: '62.0', height: '172.0',
    notes: 'Persistent dry cough; no haemoptysis; SpO2 stable on air. Smoking-cessation advice reinforced.',
  }).returning();

  // 7. Billing (unpaid — awaiting MDT)
  const due = new Date(); due.setDate(due.getDate() + 14);
  const [inv] = await db.insert(invoices).values({
    patientId: p.id, amount: '2750.00', status: 'Unpaid',
    description: 'CT Chest + Chest X-Ray + labs — indeterminate pulmonary nodules',
    issuedBy: billerId, dueDate: due, paidAt: null,
  }).returning();

  // 8. Records-officer quality audit
  const [au] = await db.insert(recordAudits).values({
    recordType: 'ClinicalRecord', recordId: rec.id, patientId: p.id, officerId, status: 'Verified', flagReason: null,
  }).returning();

  await logAuditTrail(anyUser.id, 'Completed radiology-led pathway', 'Radiology', `CT Chest + CXR for Abdul Jalloh → Refer Out to MDT`);

  // ── Assertions ─────────────────────────────────────────────────────────────
  const res: { n: string; ok: boolean; d?: string }[] = [];
  const chk = (n: string, ok: boolean, d?: string) => res.push({ n, ok, d });

  chk('patient persisted', p.id > 0);
  const recs = await db.select().from(medicalRecords).where(eq(medicalRecords.patientId, p.id));
  chk('clinical record = Refer Out w/ referral note',
    recs.length === 1 && recs[0].decisionType === 'Refer Out' && !!recs[0].referralNote?.trim());

  const imgs = await db.select().from(imagingResults).where(eq(imagingResults.patientId, p.id));
  const ct = imgs.find(i => /CT/i.test(i.procedureName));
  chk('two imaging studies, both completed + validated',
    imgs.length === 2 && imgs.every(i => i.status === 'Completed' && i.validatedBy && i.scheduledDate && i.dateCompleted));
  chk('CT report embeds verbatim web sample',
    !!ct && !!ct.resultText && ct.resultText.includes('centrilobular ground-glass nodules') && ct.resultText.includes('hypersensitivity pneumonitis'),
    ct ? 'sample text present in DB' : 'CT row missing');

  const labs = await db.select().from(labResults).where(eq(labResults.patientId, p.id));
  chk('both labs completed + validated',
    labs.length === 2 && labs.every(l => l.status === 'Completed' && l.result && l.validatedBy));

  const vs = await db.select().from(vitals).where(eq(vitals.patientId, p.id));
  chk('vitals recorded, plausible SpO2', vs.length === 1 && (vs[0].oxygenSaturation ?? 0) >= 90 && (vs[0].oxygenSaturation ?? 0) <= 100);

  const invs = await db.select().from(invoices).where(eq(invoices.patientId, p.id));
  chk('invoice unpaid, amount > 0', invs.length === 1 && invs[0].status === 'Unpaid' && Number(invs[0].amount) > 0 && !invs[0].paidAt);

  const aus = await db.select().from(recordAudits).where(eq(recordAudits.patientId, p.id));
  chk('quality audit verified', aus.length === 1 && aus[0].status === 'Verified');

  const trailNow = Number((await db.select({ c: count() }).from(systemAuditTrail))[0].c);
  chk('audit trail grew', trailNow > baselineTrail, `+${trailNow - baselineTrail}`);

  chk('showcase record fully populated', !!p.bloodGroup && !!p.address && !!p.emergencyContact);

  // ── Report ─────────────────────────────────────────────────────────────────
  console.log(`\n${B}${C}Functional checks${X}`);
  console.log(D + '─'.repeat(64) + X);
  for (const r of res) console.log(`  ${r.ok ? G + '[PASS]' + X : R + '[FAIL]' + X}  ${r.n}${r.d ? D + '  (' + r.d + ')' + X : ''}`);
  const passed = res.filter(r => r.ok).length;
  console.log(D + '─'.repeat(64) + X);
  console.log(`  ${B}${passed}/${res.length} checks passed${X}\n`);

  console.log(`${B}${C}Radiology showcase — patient #${p.id} (Abdul Jalloh)${X}`);
  console.log(D + '─'.repeat(64) + X);
  console.log(`  Priority       : Urgent`);
  console.log(`  Decision       : Refer Out → Respiratory / Thoracic & TB MDT`);
  console.log(`  Imaging on file: CT Chest with IV contrast (reported by ${radA})`);
  console.log(`                   Chest X-Ray (PA)        (reported by ${radB})`);
  console.log(`  Labs on file   : CBC, CRP (both completed & validated)`);
  console.log(D + '  CT report excerpt (verbatim sample embedded):' + X);
  for (const line of CT_REPORT.split('\n').filter(l => /^  (Lungs|Pleural|Heart):|^  1\.|^IMPRESSION/.test(l)).slice(0, 5)) {
    console.log(D + '   ' + line + X);
  }
  console.log(D + '─'.repeat(64) + X);
  console.log(D + '  Eyeball it at:' + X);
  console.log(D + `    /radiology            → Completed tab shows the CT + CXR with full reports` + X);
  console.log(D + `    /patients/${p.id}          → EMR "Imaging & Radiology" section` + X);
  console.log(D + `    /physician            → Diagnostic Results Review inbox` + X);
  console.log(D + `    /specialist           → incoming Refer-Out (this case)` + X + '\n');

  if (passed !== res.length) { console.error(R + B + '✗ A functional check failed.' + X); process.exit(1); }
  console.log(G + B + '✓ Radiology patient flow completed and verified.' + X + '\n');
}

main().catch(e => { console.error(R + 'Fatal:', e, X); process.exit(1); });
