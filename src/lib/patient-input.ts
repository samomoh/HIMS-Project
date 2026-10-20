export type PatientInput = {
  firstName: string;
  lastName: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other' | 'Unknown';
  contact: string;
  patientCategory: 'Walked in' | 'Emergency' | 'Referred In';
  emergencyContact: string | null;
  address: string | null;
  bloodGroup: string | null;
};

const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;

export function parsePatientInput(value: unknown): PatientInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (!text(data.firstName, 255) || !text(data.lastName, 255) || !text(data.contact, 50)) return null;
  if (typeof data.dob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.dob) || Number.isNaN(Date.parse(`${data.dob}T00:00:00Z`)) || new Date(`${data.dob}T00:00:00Z`).toISOString().slice(0, 10) !== data.dob) return null;
  if (data.dob > new Date().toISOString().slice(0, 10)) return null;
  if (!['Male', 'Female', 'Other', 'Unknown'].includes(String(data.gender))) return null;
  const patientCategory = data.patientCategory === undefined ? 'Walked in' : data.patientCategory;
  if (!['Walked in', 'Emergency', 'Referred In'].includes(String(patientCategory))) return null;
  if (data.address != null && (typeof data.address !== 'string' || data.address.length > 5000)) return null;
  if (data.emergencyContact != null && (typeof data.emergencyContact !== 'string' || data.emergencyContact.trim().length > 50)) return null;
  if (data.bloodGroup != null && data.bloodGroup !== '' && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(String(data.bloodGroup))) return null;
  return {
    firstName: String(data.firstName).trim(),
    lastName: String(data.lastName).trim(),
    dob: data.dob,
    gender: data.gender as PatientInput['gender'],
    contact: String(data.contact).trim(),
    patientCategory: patientCategory as PatientInput['patientCategory'],
    emergencyContact: typeof data.emergencyContact === 'string' && data.emergencyContact.trim() ? data.emergencyContact.trim() : null,
    address: typeof data.address === 'string' && data.address.trim() ? data.address.trim() : null,
    bloodGroup: typeof data.bloodGroup === 'string' && data.bloodGroup ? data.bloodGroup : null,
  };
}
