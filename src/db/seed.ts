import { db } from './index';
import { users, patients, appointments, medicalRecords, labResults, prescriptions, invoices } from './schema';
import { addDays, subYears, subDays } from 'date-fns';
import { assertSeedAllowed } from './seed-safety';

async function seed() {
  assertSeedAllowed({ destructive: true });
  console.log('Seeding database...');
  
  // Clear existing data
  await db.delete(invoices);
  await db.delete(prescriptions);
  await db.delete(labResults);
  await db.delete(medicalRecords);
  await db.delete(appointments);
  await db.delete(patients);
  await db.delete(users);

  // Users
  const [admin] = await db.insert(users).values({
    name: 'Admin User',
    email: 'admin@hospital.com',
    role: 'admin',
  }).returning();

  const [drSmith] = await db.insert(users).values({
    name: 'Dr. Sarah Smith',
    email: 'sarah.smith@hospital.com',
    role: 'doctor',
  }).returning();

  const [drJones] = await db.insert(users).values({
    name: 'Dr. James Jones',
    email: 'james.jones@hospital.com',
    role: 'doctor',
  }).returning();
  
  const [nurseJoy] = await db.insert(users).values({
    name: 'Nurse Joy',
    email: 'joy@hospital.com',
    role: 'nurse',
  }).returning();

  const [receptionist] = await db.insert(users).values({
    name: 'Pam Beesly',
    email: 'pam@hospital.com',
    role: 'receptionist',
  }).returning();

  // Patients
  const patientData = [
    {
      firstName: 'John',
      lastName: 'Doe',
      dob: subYears(new Date(), 35).toISOString().split('T')[0],
      gender: 'Male',
      contact: '+1234567890',
      address: '123 Main St, Cityville',
      bloodGroup: 'O+',
      emergencyContact: '+0987654321',
    },
    {
      firstName: 'Jane',
      lastName: 'Smith',
      dob: subYears(new Date(), 28).toISOString().split('T')[0],
      gender: 'Female',
      contact: '+1122334455',
      address: '456 Elm St, Townsburg',
      bloodGroup: 'A-',
      emergencyContact: '+5544332211',
    },
    {
      firstName: 'Michael',
      lastName: 'Johnson',
      dob: subYears(new Date(), 50).toISOString().split('T')[0],
      gender: 'Male',
      contact: '+1555555555',
      address: '789 Oak Ave, Villagetown',
      bloodGroup: 'B+',
      emergencyContact: '+1444444444',
    }
  ];

  const insertedPatients = await db.insert(patients).values(patientData).returning();

  // Appointments
  const now = new Date();
  
  const appointmentData = [
    {
      patientId: insertedPatients[0].id,
      doctorId: drSmith.id,
      appointmentDate: addDays(now, 1),
      status: 'Scheduled',
      reason: 'Annual Checkup',
    },
    {
      patientId: insertedPatients[1].id,
      doctorId: drJones.id,
      appointmentDate: addDays(now, 2),
      status: 'Scheduled',
      reason: 'Severe Headache',
    },
    {
      patientId: insertedPatients[2].id,
      doctorId: drSmith.id,
      appointmentDate: subDays(now, 1),
      status: 'Completed',
      reason: 'Follow-up for hypertension',
    }
  ];

  await db.insert(appointments).values(appointmentData);

  // Medical Records
  await db.insert(medicalRecords).values({
    patientId: insertedPatients[2].id,
    doctorId: drSmith.id,
    diagnosis: 'Hypertension',
    treatment: 'Lisinopril 10mg daily',
    notes: 'Patient reports feeling better, blood pressure is stable at 120/80.',
    recordDate: subDays(now, 1),
  });

  // Prescriptions
  await db.insert(prescriptions).values({
    patientId: insertedPatients[2].id,
    doctorId: drSmith.id,
    medication: 'Lisinopril',
    dosage: '10mg',
    instructions: 'Take one tablet daily in the morning',
  });

  // Lab Results
  await db.insert(labResults).values({
    patientId: insertedPatients[2].id,
    doctorId: drSmith.id,
    testName: 'Complete Blood Count (CBC)',
    result: 'WBC: 6.5, RBC: 4.8, HGB: 14.2, HCT: 42%',
    status: 'Completed',
    dateRequested: subDays(now, 3),
    dateCompleted: subDays(now, 2),
  });
  
  // Invoices
  await db.insert(invoices).values([
    {
      patientId: insertedPatients[0].id,
      amount: '150.00',
      status: 'Unpaid',
      dueDate: addDays(now, 14),
    },
    {
      patientId: insertedPatients[2].id,
      amount: '75.50',
      status: 'Paid',
      dueDate: addDays(now, 30),
    }
  ]);

  console.log('Database seeded successfully!');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
