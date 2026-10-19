'use server';

import { db } from '@/db';
import { emergencyTriage, labResults, imagingResults, patients, users } from '@/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { logAuditTrail } from '@/lib/audit';
import { requireUser } from '@/lib/auth';

type TriageResult = {
  success: boolean;
  message: string;
  triageId?: number;
  patientId?: number;
  statLabsQueued?: number;
  statImagingQueued?: number;
  warnings?: string[];
};

export async function createTriageAction(data: {
  staffId: number;
  triageLevel: string;
  chiefComplaint: string;
  mechanismOfInjury: string;
  patientType: 'registered' | 'unidentified';
  patientId?: number;
  unidentifiedName?: string;
  orderStatLabs: boolean;
  orderStatImaging: boolean;
}): Promise<TriageResult> {
  const actor = await requireUser(['super_admin', 'admin', 'emergency', 'doctor', 'nurse']);
  const acceptedLevels = ['Resuscitation', 'Emergent', 'Urgent', 'Less Urgent', 'Non-Urgent'];
  if (!['registered', 'unidentified'].includes(data.patientType) || !acceptedLevels.includes(data.triageLevel) || data.chiefComplaint.length > 10000 || data.mechanismOfInjury.length > 10000 || (data.unidentifiedName?.length ?? 0) > 240 || (data.patientId !== undefined && (!Number.isSafeInteger(data.patientId) || data.patientId <= 0))) return { success: false, message: 'Triage details are invalid.' };
  const warnings: string[] = [];

  // ---------- 1. Resolve a valid staff id (with graceful fallback) ----------
  let resolvedStaffId = actor.id;
  try {
    if (!resolvedStaffId || resolvedStaffId <= 0) {
      const fallback = await db.query.users.findFirst({
        where: inArray(users.role, ['emergency', 'doctor', 'nurse', 'super_admin', 'admin']),
        orderBy: [desc(users.id)],
      });
      if (fallback) {
        resolvedStaffId = fallback.id;
        warnings.push('No attending staff selected — auto-assigned a fallback operator.');
      } else {
        return {
          success: false,
          message: 'Cannot register triage: there are no authorised operators in the system. Please add a Doctor, Nurse, or ER staff member first.',
        };
      }
    } else {
      // Verify the provided id actually exists in the users table.
      const existing = await db.query.users.findFirst({ where: eq(users.id, resolvedStaffId) });
      if (!existing) {
        const fallback = await db.query.users.findFirst({
          where: inArray(users.role, ['emergency', 'doctor', 'nurse', 'super_admin', 'admin']),
          orderBy: [desc(users.id)],
        });
        if (fallback) {
          resolvedStaffId = fallback.id;
          warnings.push('Original operator id was invalid — auto-assigned a fallback operator.');
        } else {
          return {
            success: false,
            message: 'Selected operator is no longer valid and no fallback staff exists. Please review the staff directory.',
          };
        }
      }
    }
  } catch (err) {
    console.error('[triage] staff resolution failed', err);
    return { success: false, message: 'System error while resolving the attending operator. Please try again.' };
  }

  // ---------- 2. Sanitise chief complaint / unidentified alias ----------
  const chiefComplaint = (data.chiefComplaint || '').trim();
  if (!chiefComplaint) {
    return { success: false, message: 'Chief complaint is required to open a triage record.' };
  }

  const triageLevel = (data.triageLevel || '').trim();
  if (!triageLevel) {
    return { success: false, message: 'A triage level must be selected.' };
  }

  const mechanism = (data.mechanismOfInjury || '').trim() || null;
  const unidentifiedAlias = (data.unidentifiedName || '').trim();

  if (data.patientType === 'unidentified' && !unidentifiedAlias) {
    return { success: false, message: 'A trauma alias is required for unidentified patients (e.g. “John Doe – Bay 3”).' };
  }

  // ---------- 3. Resolve or create the patient row ----------
  let patientId: number | undefined;
  const createTemporaryPatient = data.patientType === 'unidentified';

  if (!createTemporaryPatient && data.patientId && data.patientId > 0) {
    // Validate that the registered patient actually exists before we link the triage.
    const found = await db.query.patients.findFirst({ where: eq(patients.id, data.patientId) });
    if (!found) {
      return { success: false, message: 'The selected registered patient could not be found. Please refresh and try again.' };
    }
    patientId = data.patientId;
  } else {
    return { success: false, message: 'Either a registered patient or an unidentified trauma alias must be provided.' };
  }

  // ---------- 4. Create any temporary patient and insert triage atomically ----------
  let triageId: number | undefined;
  try {
    const result = await db.transaction(async (tx) => {
      let resolvedPatientId = patientId;
      if (createTemporaryPatient) {
        const [temporary] = await tx.insert(patients).values({
          firstName: 'UNIDENTIFIED', lastName: unidentifiedAlias!.slice(0, 240),
          dob: '1900-01-01', gender: 'Unknown', contact: 'N/A', emergencyContact: 'PENDING ID',
        }).returning({ id: patients.id });
        if (!temporary) throw new Error('Temporary patient could not be created.');
        resolvedPatientId = temporary.id;
      }
      const [triage] = await tx.insert(emergencyTriage).values({
        staffId: resolvedStaffId,
        patientId: resolvedPatientId ?? null,
        unidentifiedName: createTemporaryPatient ? unidentifiedAlias : null,
        triageLevel, chiefComplaint, mechanismOfInjury: mechanism,
      }).returning({ id: emergencyTriage.id });
      return { patientId: resolvedPatientId, triageId: triage?.id };
    });
    patientId = result.patientId;
    triageId = result.triageId;
    if (!triageId) {
      return { success: false, message: 'Triage row was not returned by the database — please retry.' };
    }
  } catch (err) {
    console.error('[triage] triage insert failed', err);
    return {
      success: false,
      message: 'Could not save the triage record. Please retry or contact system support.',
    };
  }

  // ---------- 5. Queue STAT diagnostics (isolated — must not roll back the triage) ----------
  let statLabsQueued = 0;
  let statImagingQueued = 0;

  if (patientId) {
    if (data.orderStatLabs) {
      try {
        const rows = await db.insert(labResults).values([
          { patientId, doctorId: resolvedStaffId, testName: 'STAT Comprehensive Metabolic Panel (CMP)', priority: 'Emergency', status: 'Pending' },
          { patientId, doctorId: resolvedStaffId, testName: 'STAT Complete Blood Count (CBC)', priority: 'Emergency', status: 'Pending' },
          { patientId, doctorId: resolvedStaffId, testName: 'STAT Troponin & Cardiac Biomarkers', priority: 'Emergency', status: 'Pending' },
        ]).returning();
        statLabsQueued = rows.length;
      } catch (err) {
        console.error('[triage] stat labs failed', err);
        warnings.push('STAT lab panel could not be auto-queued — order them manually from the patient chart.');
      }
    }
    if (data.orderStatImaging) {
      try {
        const rows = await db.insert(imagingResults).values([
          { patientId, doctorId: resolvedStaffId, procedureName: 'STAT Portable Chest X-Ray', priority: 'Emergency', status: 'Pending' },
        ]).returning();
        statImagingQueued = rows.length;
      } catch (err) {
        console.error('[triage] stat imaging failed', err);
        warnings.push('STAT chest X-ray could not be auto-queued — order it manually from the patient chart.');
      }
    }
  }

  // ---------- 6. Audit trail ----------
  try {
    await logAuditTrail(
      resolvedStaffId,
      'Registered ER Triage',
      'Emergency',
      `Triage #${triageId} [${triageLevel}] — ${data.patientType === 'unidentified' ? `UNIDENTIFIED: ${unidentifiedAlias}` : `Patient #${patientId}`}`
    );
  } catch (err) {
    console.error('[triage] audit log failed', err);
    // Non-fatal — do not fail the triage because of a logging issue.
  }

  revalidatePath('/emergency');
  revalidatePath('/laboratory');
  revalidatePath('/radiology');
  revalidatePath('/patients');

  const summary = data.patientType === 'unidentified'
    ? `Trauma alias "${unidentifiedAlias}" registered on the board.`
    : `Registered patient linked to the trauma board.`;

  return {
    success: true,
    message: `${summary} Triage #${triageId} is live.`,
    triageId,
    patientId,
    statLabsQueued,
    statImagingQueued,
    warnings: warnings.length ? warnings : undefined,
  };
}

export async function dischargeEmergencyAction(id: number, status: string, actorId?: number): Promise<{ success: boolean; message: string }> {
  try {
    const actor = await requireUser(['super_admin', 'admin', 'emergency', 'doctor', 'nurse']);
    if (!id || id <= 0) return { success: false, message: 'Invalid triage id.' };
    const allowed = ['Active', 'Admitted', 'Discharged', 'Deceased'];
    if (!allowed.includes(status)) return { success: false, message: `Status "${status}" is not allowed.` };

    await db.update(emergencyTriage).set({
      status,
      dischargedTime: status === 'Active' ? null : new Date(),
    }).where(eq(emergencyTriage.id, id));

    await logAuditTrail(actor.id, 'Updated ER Triage', 'Emergency', `Triage #${id} → ${status}`);
    revalidatePath('/emergency');
    return { success: true, message: `Triage #${id} marked as ${status}.` };
  } catch (err) {
    console.error('[triage] discharge failed', err);
    return { success: false, message: `Could not update triage status: ${(err as Error)?.message || 'database error'}.` };
  }
}
