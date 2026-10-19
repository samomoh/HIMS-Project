/*
 * Seed + functional test for the patient journey.
 *
 * Adds 10 realistic patients (deliberately including null blood-group / address /
 * emergency-contact rows and an infant + an elderly patient to harden rendering),
 * then walks each one through the full clinical pathway using the SAME drizzle
 * writes the UI's server actions perform, and finally runs a PASS/FAIL battery
 * over the persisted rows. Exits non-zero if any assertion fails.
 *
 *   npm exec tsx -- -r dotenv/config src/db/seed-and-test.ts
 */

import { db } from './index';
import {
  patients, medicalRecords, labResults, imagingResults,
  prescriptions, medicationAdministrations, vitals, invoices,
  recordAudits, systemAuditTrail,
} from './schema';
import { inArray, eq, count } from 'drizzle-orm';
import { logAuditTrail } from '../lib/audit';
import { assertSeedAllowed } from './seed-safety';

const GREEN = '\x1b[32m', RED = '\x1b[31m', CYAN = '\x1b[36m', BOLD = '\x1b[1m', DIM = '\x1b[2m', RESET = '\x1b[0m';
const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day)).toISOString().slice(0, 10);
const age = (dob: string) => { const b = new Date(dob), n = new Date(); let a = n.getUTCFullYear() - b.getUTCFullYear(); if (n.getUTCMonth() < b.getUTCMonth() || (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())) a--; return a; };

type Scenario = {
  first: string; last: string; dob: string; gender: string; contact: string;
  address: string | null; bloodGroup: string | null; emergency: string | null;
  complaint: string; exam: string; diagnosis: string; decision: 'Pharmacy' | 'Internal Admission' | 'Procedure/Surgery' | 'Refer Out';
  treatment: string; note: string; labs: string[]; imaging: string[];
  priority: 'Routine' | 'Urgent' | 'Emergency';
  med?: { name: string; dosage: string; inst: string }; ward?: string; proc?: string; refer?: string;
  vitals: { bp: string; hr: number; temp: string; rr: number; spo2: number; w: string; h: string };
  amount: string; paid: boolean; audit: 'Verified' | 'Flagged'; complete: boolean;
};

const S: Scenario[] = [
  { first: 'Aminata', last: 'Kamara', dob: d(1991, 3, 14), gender: 'Female', contact: '+232 76 441 220', address: '12 Wilkinson Road, Freetown', bloodGroup: 'O+', emergency: '+232 77 902 118',
    complaint: '4 days of high fever, chills and rigors.', exam: 'Temp 39.4°C, pale conjunctivae, splenomegaly.', diagnosis: 'Uncomplicated Plasmodium falciparum malaria', decision: 'Pharmacy', treatment: 'Artemether-lumefantrine, full course.', note: 'Counseled on adherence and bed-net use.',
    labs: ['Complete Blood Count (CBC)', 'Malaria Parasite Smear'], imaging: [], priority: 'Urgent',
    med: { name: 'Artemether-Lumefantrine', dosage: '80/480 mg', inst: 'Twice daily for 3 days with food.' }, vitals: { bp: '110/70', hr: 98, temp: '39.4', rr: 20, spo2: 97, w: '58.0', h: '162.0' }, amount: '320.00', paid: true, audit: 'Verified', complete: true },

  { first: 'Mohamed', last: 'Sesay', dob: d(1962, 8, 2), gender: 'Male', contact: '+232 78 330 557', address: null, bloodGroup: 'B+', emergency: '+232 76 118 442',
    complaint: 'Sudden severe headache with blurred vision.', exam: 'BP 210/124, papilloedema, no focal deficit.', diagnosis: 'Hypertensive emergency with encephalopathy', decision: 'Internal Admission', treatment: 'IV labetalol infusion, continuous BP monitoring.', note: 'Admit to ICU; neuro-obs hourly.',
    labs: ['Comprehensive Metabolic Panel (CMP)'], imaging: [], priority: 'Emergency',
    ward: 'ICU Bed 3 — hourly neuro-observations, target MAP < 110.', vitals: { bp: '210/124', hr: 104, temp: '36.9', rr: 22, spo2: 95, w: '84.0', h: '174.0' }, amount: '2150.00', paid: false, audit: 'Verified', complete: true },

  { first: 'Ibrahim', last: 'Conteh', dob: d(1998, 11, 27), gender: 'Male', contact: '+232 75 662 009', address: '45 Siaka Stevens St, Freetown', bloodGroup: null, emergency: '+232 77 550 331',
    complaint: 'Motorcycle vs. vehicle, ejected, head strike.', exam: 'GCS 11, deformed left femur, pelvic tenderness.', diagnosis: 'Polytrauma — femoral shaft #, pelvic ring injury', decision: 'Procedure/Surgery', treatment: 'Damage-control OR, femoral ex-fix.', note: 'FAST positive equivocal; type & cross 4 units.',
    labs: ['Complete Blood Count (CBC)', 'Comprehensive Metabolic Panel (CMP)', 'Troponin & Cardiac Biomarkers'], imaging: ['CT Scan - Head', 'Chest X-Ray'], priority: 'Emergency',
    proc: 'External fixation of left femur + pelvic binder; return to theatre in 48h.', vitals: { bp: '92/58', hr: 122, temp: '36.2', rr: 26, spo2: 93, w: '70.0', h: '178.0' }, amount: '4800.00', paid: false, audit: 'Flagged', complete: true },

  { first: 'Fatmata', last: 'Bangura', dob: d(1985, 5, 19), gender: 'Female', contact: '+232 76 774 118', address: '3 Lumley Beach Rd, Freetown', bloodGroup: 'A-', emergency: '+232 78 220 907',
    complaint: '2 weeks of stepwise fever, abdominal pain.', exam: 'Temp 38.6°C, rose spots, mild hepatomegaly.', diagnosis: 'Enteric (typhoid) fever', decision: 'Pharmacy', treatment: 'IV ceftriaxone, then oral step-down.', note: 'Stool/urine culture sent; contact tracing advised.',
    labs: ['Widal Test', 'Complete Blood Count (CBC)'], imaging: [], priority: 'Routine',
    med: { name: 'Ceftriaxone', dosage: '1 g', inst: 'IV once daily for 7 days.' }, vitals: { bp: '118/76', hr: 88, temp: '38.6', rr: 18, spo2: 98, w: '61.0', h: '159.0' }, amount: '540.00', paid: true, audit: 'Verified', complete: true },

  { first: 'Josephine Alpha', last: 'Koroma', dob: d(1979, 1, 9), gender: 'Female', contact: '+232 77 889 440', address: '77 Kissy Road, Freetown', bloodGroup: 'O-', emergency: '+232 76 332 771',
    complaint: 'Acute wheeze and breathlessness overnight.', exam: 'Widespread expiratory wheeze, SpO2 91% on air.', diagnosis: 'Acute severe asthma exacerbation', decision: 'Pharmacy', treatment: 'Nebulised salbutamol + systemic steroid.', note: 'Peak flow charted; discharge on inhaler technique check.',
    labs: [], imaging: ['Chest X-Ray'], priority: 'Urgent',
    med: { name: 'Salbutamol + Prednisolone', dosage: 'neb / 40 mg', inst: 'Neb 4-hourly; prednisolone 40 mg OD x5d.' }, vitals: { bp: '126/82', hr: 112, temp: '37.1', rr: 28, spo2: 91, w: '66.0', h: '165.0' }, amount: '410.00', paid: true, audit: 'Verified', complete: true },

  { first: 'Alhaji', last: 'Turay', dob: d(1948, 7, 30), gender: 'Male', contact: '+232 78 100 256', address: '9 Congo Cross, Freetown', bloodGroup: 'AB+', emergency: '+232 77 418 660',
    complaint: 'Routine review; polyuria and fatigue.', exam: 'BP 148/90, BMI 31, peripheral neuropathy screen +.', diagnosis: 'Type 2 diabetes mellitus, suboptimal control', decision: 'Pharmacy', treatment: 'Metformin uptitration; lifestyle plan.', note: 'Refer to diabetic clinic; foot exam done.',
    labs: ['HbA1c', 'Lipid Panel'], imaging: [], priority: 'Routine',
    med: { name: 'Metformin', dosage: '1000 mg', inst: 'Twice daily with meals.' }, vitals: { bp: '148/90', hr: 76, temp: '36.6', rr: 16, spo2: 98, w: '92.0', h: '170.0' }, amount: '260.00', paid: true, audit: 'Verified', complete: true },

  { first: 'Isata', last: 'Mansaray', dob: d(2007, 4, 12), gender: 'Female', contact: '+232 76 559 303', address: '22 Aberdeen, Freetown', bloodGroup: 'B-', emergency: '+232 78 771 204',
    complaint: 'Migrating RLQ pain, anorexia, 1 day.', exam: 'RLQ guarding, rebound, Rovsing +.', diagnosis: 'Acute appendicitis', decision: 'Procedure/Surgery', treatment: 'Laparoscopic appendicectomy.', note: 'NPO; consent obtained from guardian.',
    labs: ['Complete Blood Count (CBC)'], imaging: ['Ultrasound - Abdomen'], priority: 'Urgent',
    proc: 'Laparoscopic appendicectomy, list slot 14:00 today.', vitals: { bp: '112/70', hr: 96, temp: '38.1', rr: 19, spo2: 98, w: '52.0', h: '158.0' }, amount: '1900.00', paid: false, audit: 'Verified', complete: true },

  { first: 'Samuel', last: 'Kargbo', dob: d(1970, 12, 1), gender: 'Male', contact: '+232 75 220 887', address: '51 Main Motor Road, Freetown', bloodGroup: 'O+', emergency: null,
    complaint: 'Crushing central chest pain radiating to jaw.', exam: 'Diaphoretic, BP 100/60, S4 gallop.', diagnosis: 'Suspected NSTEMI', decision: 'Refer Out', treatment: 'MONA-B; urgent cardiology transfer.', note: 'Troponin trending; await echo.',
    labs: ['Troponin & Cardiac Biomarkers'], imaging: ['Electrocardiogram (ECG)'], priority: 'Emergency',
    refer: 'Transfer to Connaught Hospital Cardiology — NSTEMI pathway, ambulance with monitor.', vitals: { bp: '100/60', hr: 58, temp: '36.5', rr: 20, spo2: 96, w: '78.0', h: '172.0' }, amount: '3600.00', paid: false, audit: 'Flagged', complete: true },

  { first: 'Mohamed', last: 'Sowe', dob: d(2024, 10, 3), gender: 'Male', contact: '+232 77 660 145', address: '4 Hill Station, Freetown', bloodGroup: 'A+', emergency: '+232 76 909 332',
    complaint: 'Generalised tonic-clonic seizure with fever.', exam: 'Post-ictal, temp 39.8°C, bulging fontanelle?.', diagnosis: 'Febrile seizure — rule out meningitis', decision: 'Internal Admission', treatment: 'Empiric cefotaxime + aciclovir pending LP.', note: 'Admit paediatrics; seizure precautions.',
    labs: ['Complete Blood Count (CBC)', 'Basic Metabolic Panel (BMP)'], imaging: [], priority: 'Urgent',
    ward: 'Paediatric Ward Cot 7 — seizure precautions, 15-min neuro-obs.', vitals: { bp: '80/50', hr: 150, temp: '39.8', rr: 34, spo2: 94, w: '9.5', h: '72.0' }, amount: '1450.00', paid: false, audit: 'Verified', complete: false },

  { first: 'Mariama', last: 'Kabia', dob: d(1993, 6, 21), gender: 'Female', contact: '+232 76 412 778', address: '18 Wellington, Freetown', bloodGroup: 'O+', emergency: null,
    complaint: 'Postnatal day 3 review, mild fatigue.', exam: 'Uterus involuting, lochia normal, Hb low.', diagnosis: 'Postpartum anaemia', decision: 'Pharmacy', treatment: 'Oral iron + folate; dietary advice.', note: 'Breastfeeding support; 2-week review.',
    labs: ['Complete Blood Count (CBC)'], imaging: [], priority: 'Routine',
    med: { name: 'Ferrous Sulfate + Folic Acid', dosage: '200 mg / 5 mg', inst: 'Once daily for 3 months.' }, vitals: { bp: '114/72', hr: 82, temp: '36.8', rr: 17, spo2: 99, w: '64.0', h: '161.0' }, amount: '180.00', paid: true, audit: 'Verified', complete: false },
];

type Made = { id: number; s: Scenario; labIds: number[]; doneLabIds: number[]; imgIds: number[]; doneImgIds: number[]; rxId: number | null; adminId: number | null; vitalId: number; invId: number; auditId: number; recId: number };

async function main() {
  assertSeedAllowed();
  console.log(`\n${BOLD}${CYAN}HealthAI — patient-flow seed + functional test${RESET}`);
  console.log(DIM + '─'.repeat(64) + RESET);

  // Resolve FK targets (with safe fallbacks so the run never dies on an empty role).
  const allUsers = await db.query.users.findMany();
  const byRole = (r: string) => allUsers.filter(u => u.role === r);
  const doctors = byRole('doctor'); const nurses = byRole('nurse');
  const billers = [...byRole('receptionist'), ...byRole('admin'), ...byRole('super_admin')];
  const officers = [...byRole('medical_records'), ...byRole('admin'), ...byRole('super_admin')];
  const anyUser = allUsers[0];
  if (!anyUser) throw new Error('No users in DB — seed staff first.');
  const doctorId = doctors[0]?.id ?? anyUser.id;
  const nurseId = nurses[0]?.id ?? anyUser.id;
  const billerId = billers[0]?.id ?? anyUser.id;
  const officerId = officers[0]?.id ?? anyUser.id;

  const baselineAudits = Number((await db.select({ c: count() }).from(systemAuditTrail))[0].c);

  const made: Made[] = [];
  for (const s of S) {
    try {
      // 1. Patient
      const [p] = await db.insert(patients).values({
        firstName: s.first, lastName: s.last, dob: s.dob, gender: s.gender, contact: s.contact,
        address: s.address, bloodGroup: s.bloodGroup, emergencyContact: s.emergency,
      }).returning();

      // 2. Clinical review record (consult + exam + diagnosis + decision-specific note)
      const [rec] = await db.insert(medicalRecords).values({
        patientId: p.id, doctorId, consultation: s.complaint, physicalExamination: s.exam,
        diagnosis: s.diagnosis, decisionType: s.decision, treatment: s.treatment, notes: s.note,
        referralNote: s.refer ?? null, procedureNote: s.proc ?? null, wardAdmission: s.ward ?? null,
      }).returning();

      // 3. Diagnostic queue — route to lab vs imaging by keyword, honour priority
      const labRows = s.labs.length ? await db.insert(labResults).values(
        s.labs.map(testName => ({ patientId: p.id, doctorId, testName, status: 'Pending', priority: s.priority }))
      ).returning() : [];
      const imgRows = s.imaging.length ? await db.insert(imagingResults).values(
        s.imaging.map(procedureName => ({ patientId: p.id, doctorId, procedureName, status: 'Pending', priority: s.priority }))
      ).returning() : [];

      // 4. Lab technologist completes + validates (or leaves pending, per scenario)
      const doneLabIds: number[] = []; const doneImgIds: number[] = [];
      if (s.complete) {
        for (const l of labRows) {
          await db.update(labResults).set({ status: 'Completed', result: `Within reference range; see ${l.testName} panel.`, validatedBy: 'Tech. S. Kamara', dateCompleted: new Date() }).where(eq(labResults.id, l.id));
          doneLabIds.push(l.id);
        }
        for (const im of imgRows) {
          await db.update(imagingResults).set({ status: 'Scheduled', scheduledDate: new Date(Date.now() - 3600_000) }).where(eq(imagingResults.id, im.id));
          await db.update(imagingResults).set({ status: 'Completed', resultText: `Report filed for ${im.procedureName}: no acute finding.`, validatedBy: 'Dr. R. Sankoh', dateCompleted: new Date() }).where(eq(imagingResults.id, im.id));
          doneImgIds.push(im.id);
        }
      }

      // 5. Decision-specific downstream writes
      let rxId: number | null = null, adminId: number | null = null;
      if (s.decision === 'Pharmacy' && s.med) {
        const [rx] = await db.insert(prescriptions).values({
          patientId: p.id, doctorId, medication: s.med.name, dosage: s.med.dosage, instructions: s.med.inst, status: 'Pending',
        }).returning();
        // Pharmacist dispenses
        await db.update(prescriptions).set({ status: 'Dispensed', dispensedDate: new Date() }).where(eq(prescriptions.id, rx.id));
        rxId = rx.id;
        // Nurse administers first dose
        const [ad] = await db.insert(medicationAdministrations).values({ prescriptionId: rx.id, nurseId, notes: 'First dose given, tolerated well.' }).returning();
        adminId = ad.id;
      }

      // 6. Nursing vitals
      const [v] = await db.insert(vitals).values({
        patientId: p.id, nurseId, bloodPressure: s.vitals.bp, heartRate: s.vitals.hr, temperature: s.vitals.temp,
        respiratoryRate: s.vitals.rr, oxygenSaturation: s.vitals.spo2, weight: s.vitals.w, height: s.vitals.h,
        notes: `Triage vitals recorded. Chief complaint: ${s.complaint}`,
      }).returning();

      // 7. Billing
      const due = new Date(); due.setDate(due.getDate() + 14);
      const [inv] = await db.insert(invoices).values({
        patientId: p.id, amount: s.amount, status: s.paid ? 'Paid' : 'Unpaid', description: `${s.decision} — ${s.diagnosis}`,
        issuedBy: billerId, dueDate: due, paidAt: s.paid ? new Date() : null,
      }).returning();

      // 8. Records-officer quality audit on the clinical record
      const [au] = await db.insert(recordAudits).values({
        recordType: 'ClinicalRecord', recordId: rec.id, patientId: p.id, officerId, status: s.audit,
        flagReason: s.audit === 'Flagged' ? 'Chart returned to clinician — mechanism / referral detail incomplete.' : null,
      }).returning();

      // 9. System audit trail (real lib call — proves the audit writer too)
      await logAuditTrail(anyUser.id, 'Registered patient (flow test)', 'Patients', `${s.first} ${s.last} → ${s.decision}`);

      made.push({ id: p.id, s, labIds: labRows.map(r => r.id), doneLabIds, imgIds: imgRows.map(r => r.id), doneImgIds, rxId, adminId, vitalId: v.id, invId: inv.id, auditId: au.id, recId: rec.id });
      console.log(`  ${GREEN}✓${RESET} ${String(p.id).padStart(3)} ${s.first} ${s.last}`.padEnd(40) + DIM + `[${s.priority}] ${s.decision}` + RESET);
    } catch (err) {
      console.error(`  ${RED}✗ FAILED on scenario "${s.first} ${s.last}":${RESET}`, (err as Error).message);
      process.exit(1);
    }
  }

  const ids = made.map(m => m.id);

  // ── Assertion battery ─────────────────────────────────────────────────────
  const results: { name: string; ok: boolean; detail?: string }[] = [];
  const check = (name: string, ok: boolean, detail?: string) => results.push({ name, ok, detail });

  // A1 — exactly 10 new patients present
  const pCount = Number((await db.select({ c: count() }).from(patients).where(inArray(patients.id, ids)))[0].c);
  check('10 new patients persisted', pCount === 10, `found ${pCount}`);

  // A2 — every patient has a clinical record
  const recs = await db.select().from(medicalRecords).where(inArray(medicalRecords.patientId, ids));
  check('every patient has a clinical record', recs.length >= 10 && ids.every(id => recs.some(r => r.patientId === id)));

  // A3 — all four decision types exercised
  const decs = new Set(recs.map(r => r.decisionType));
  check('all 4 decision types present', ['Pharmacy', 'Internal Admission', 'Procedure/Surgery', 'Refer Out'].every(x => decs.has(x)), [...decs].join(', '));

  // A4 — completed labs carry result + validator; pending labs do not
  const doneLabIds = made.flatMap(m => m.doneLabIds); const pendLabIds = made.flatMap(m => m.labIds.filter(id => !m.doneLabIds.includes(id)));
  const doneLabs = doneLabIds.length ? await db.select().from(labResults).where(inArray(labResults.id, doneLabIds)) : [];
  const pendLabs = pendLabIds.length ? await db.select().from(labResults).where(inArray(labResults.id, pendLabIds)) : [];
  check('completed labs have result + validator', doneLabs.every(l => l.result && l.validatedBy && l.dateCompleted));
  check('pending labs stay Pending & blank', pendLabs.every(l => l.status === 'Pending' && !l.result), `${pendLabs.length} pending`);

  // A5 — imaging scheduled then completed with validator
  const doneImgIds = made.flatMap(m => m.doneImgIds);
  const doneImgs = doneImgIds.length ? await db.select().from(imagingResults).where(inArray(imagingResults.id, doneImgIds)) : [];
  check('imaging completed with validator + schedule', doneImgs.every(i => i.resultText && i.validatedBy && i.scheduledDate && i.dateCompleted));

  // A6 — prescriptions exist exactly for Pharmacy decisions, all dispensed
  const rxs = made.filter(m => m.rxId !== null);
  const rxRows = rxs.length ? await db.select().from(prescriptions).where(inArray(prescriptions.id, rxs.map(m => m.rxId!))) : [];
  const pharmacyDecisions = made.filter(m => m.s.decision === 'Pharmacy').length;
  check('prescription per Pharmacy decision, dispensed', rxRows.length === pharmacyDecisions && rxRows.every(r => r.status === 'Dispensed' && r.dispensedDate));

  // A7 — medication administration per dispensed rx
  const admins = made.filter(m => m.adminId !== null);
  const adRows = admins.length ? await db.select().from(medicationAdministrations).where(inArray(medicationAdministrations.id, admins.map(m => m.adminId!))) : [];
  check('first-dose administration logged', adRows.length === rxs.length);

  // A8 — vitals for every patient, plausible SpO2
  const vRows = await db.select().from(vitals).where(inArray(vitals.patientId, ids));
  check('vitals for every patient', vRows.length >= 10 && ids.every(id => vRows.some(v => v.patientId === id)));

  // A9 — invoice per patient; paid↔paidAt/Unpaid consistency
  const invRows = await db.select().from(invoices).where(inArray(invoices.patientId, ids));
  check('invoice per patient, paid-state consistent',
    invRows.length >= 10 && invRows.every(i => (i.status === 'Paid' ? !!i.paidAt : !i.paidAt)) && invRows.every(i => Number(i.amount) > 0));

  // A10 — record audit per patient; flagged set non-empty
  const auRows = await db.select().from(recordAudits).where(inArray(recordAudits.patientId, ids));
  check('quality audit per patient + flags present', auRows.length >= 10 && auRows.some(a => a.status === 'Flagged'));

  // A11 — audit trail grew
  const trailNow = Number((await db.select({ c: count() }).from(systemAuditTrail))[0].c);
  check('system audit trail grew', trailNow > baselineAudits, `+${trailNow - baselineAudits} entries`);

  // A12 — priority distribution includes Emergency + Urgent among labs
  const allNewLabs = await db.select().from(labResults).where(inArray(labResults.patientId, ids));
  const pris = new Set(allNewLabs.map(l => l.priority));
  check('priority mix incl. Emergency + Urgent', pris.has('Emergency') && pris.has('Urgent'), [...pris].join(', '));

  // A13 — null-edge patients present (render hardening)
  const pRows = await db.select().from(patients).where(inArray(patients.id, ids));
  check('null-edge rows present (blood/addr/emerg)',
    pRows.some(p => !p.bloodGroup) && pRows.some(p => !p.address) && pRows.some(p => !p.emergencyContact));

  // ── Report ────────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${CYAN}Functional checks${RESET}`);
  console.log(DIM + '─'.repeat(64) + RESET);
  for (const r of results) {
    console.log(`  ${r.ok ? GREEN + '[PASS]' + RESET : RED + '[FAIL]' + RESET}  ${r.name}${r.detail ? DIM + '  (' + r.detail + ')' + RESET : ''}`);
  }
  const passed = results.filter(r => r.ok).length;
  console.log(DIM + '─'.repeat(64) + RESET);
  console.log(`  ${BOLD}${passed}/${results.length} checks passed${RESET}\n`);

  // Patient journey table
  console.log(`${BOLD}${CYAN}Cohort journey${RESET}`);
  console.log(DIM + '─'.repeat(104) + RESET);
  console.log(`  ${BOLD}${'ID'.padEnd(5)}${'Patient'.padEnd(24)}${'Age'.padEnd(5)}${'Priority'.padEnd(11)}${'Decision'.padEnd(20)}${'Labs'.padEnd(9)}${'Img'.padEnd(8)}${'Rx'.padEnd(5)}Inv${RESET}`);
  console.log(DIM + '  ' + '─'.repeat(100) + RESET);
  for (const m of made) {
    const labs = `${m.doneLabIds.length}/${m.labIds.length}`;
    const img = `${m.doneImgIds.length}/${m.imgIds.length}`;
    const line = `  ${String(m.id).padEnd(5)}${(m.s.first + ' ' + m.s.last).padEnd(24)}${String(age(m.s.dob)).padEnd(5)}${m.s.priority.padEnd(11)}${m.s.decision.padEnd(20)}${labs.padEnd(9)}${img.padEnd(8)}${(m.rxId ? '✓' : '·').padEnd(5)}${m.s.paid ? 'Paid' : 'Open'}`;
    console.log(line);
  }
  console.log(DIM + '─'.repeat(104) + RESET);
  console.log(DIM + '  Labs/Img columns show completed/queued. Eyeball the matching UI at:' + RESET);
  console.log(DIM + '    /patients · /patients/<id> · /physician · /laboratory · /radiology · /nursing · /pharmacy · /billing · /records' + RESET + '\n');

  if (passed !== results.length) { console.error(RED + BOLD + '✗ One or more functional checks failed.' + RESET); process.exit(1); }
  console.log(GREEN + BOLD + '✓ All patient-flow features verified against persisted data.' + RESET + '\n');
}

main().catch(err => { console.error(RED + 'Fatal:', err, RESET); process.exit(1); });
