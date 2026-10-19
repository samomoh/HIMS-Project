'use client';

import { useState } from 'react';
import { HeartPulse, ClipboardList, Pill, User, Plus, X, Search, Activity } from 'lucide-react';
import Link from 'next/link';
import { recordVitalsAction, administerMedicationAction } from './actions';

type Patient = any;
type Nurse = any;
type Prescription = any;

export default function NursingClient({ 
  patients,
  nurses,
  prescriptions
}: { 
  patients: Patient[],
  nurses: Nurse[],
  prescriptions: Prescription[]
}) {
  const [activeTab, setActiveTab] = useState<'Vitals' | 'Medications' | 'Care Coordination'>('Vitals');
  
  // Vitals State
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [vitalsData, setVitalsData] = useState({
    nurseId: nurses.length > 0 ? nurses[0].id : 0,
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
    notes: '',
  });

  // Medication Administration State
  const [medsModalOpen, setMedsModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [medsData, setMedsData] = useState({
    nurseId: nurses.length > 0 ? nurses[0].id : 0,
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPatients = patients.filter((p: any) => 
    p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openVitalsModal = (p: Patient) => {
    setSelectedPatient(p);
    setVitalsData({
      nurseId: nurses.length > 0 ? nurses[0].id : 0,
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      weight: '',
      height: '',
      notes: '',
    });
    setVitalsModalOpen(true);
  };

  const handleVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    setIsSubmitting(true);
    try {
      await recordVitalsAction({
        patientId: selectedPatient.id,
        nurseId: vitalsData.nurseId,
        bloodPressure: vitalsData.bloodPressure,
        heartRate: Number(vitalsData.heartRate),
        temperature: Number(vitalsData.temperature),
        respiratoryRate: Number(vitalsData.respiratoryRate),
        oxygenSaturation: Number(vitalsData.oxygenSaturation),
        weight: Number(vitalsData.weight),
        height: Number(vitalsData.height),
        notes: vitalsData.notes,
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to save vitals');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openMedsModal = (p: Prescription) => {
    setSelectedPrescription(p);
    setMedsData({
      nurseId: nurses.length > 0 ? nurses[0].id : 0,
      notes: '',
    });
    setMedsModalOpen(true);
  };

  const handleMedsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrescription) return;

    setIsSubmitting(true);
    try {
      await administerMedicationAction({
        prescriptionId: selectedPrescription.id,
        nurseId: medsData.nurseId,
        notes: medsData.notes,
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to record administration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex border-b border-gray-200 mb-6 space-x-2">
        <button
          onClick={() => setActiveTab('Vitals')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${activeTab === 'Vitals' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <HeartPulse className="w-4 h-4 mr-2" /> Vitals & Notes
        </button>
        <button
          onClick={() => setActiveTab('Medications')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${activeTab === 'Medications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Pill className="w-4 h-4 mr-2" /> Medication Administration
        </button>
        <button
          onClick={() => setActiveTab('Care Coordination')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${activeTab === 'Care Coordination' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <ClipboardList className="w-4 h-4 mr-2" /> Care Coordination
        </button>
      </div>

      {activeTab === 'Vitals' && (
        <div className="space-y-6">
          <div className="relative max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPatients.map((patient: any) => {
              const lastVitals = patient.vitals?.[0];
              const lastRecord = patient.medicalRecords?.[0];
              
              return (
                <div key={patient.id} className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200">
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                        {patient.firstName[0]}{patient.lastName[0]}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          <Link href={`/patients/${patient.id}`} className="hover:underline">{patient.firstName} {patient.lastName}</Link>
                        </h3>
                        <p className="text-xs text-gray-500">{patient.gender}, {patient.bloodGroup || 'No BG'}</p>
                      </div>
                    </div>
                    
                    {lastRecord?.wardAdmission ? (
                      <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20 mb-3">
                        Inpatient: {lastRecord.wardAdmission}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 mb-3">
                        Outpatient / Observation
                      </span>
                    )}

                    <div className="text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded-md border border-gray-100">
                      <p className="font-semibold text-gray-900 flex items-center gap-1"><Activity className="w-4 h-4"/> Last Vitals</p>
                      {lastVitals ? (
                        <>
                          <p>BP: {lastVitals.bloodPressure} | HR: {lastVitals.heartRate} bpm</p>
                          <p>Temp: {lastVitals.temperature}°C | SpO2: {lastVitals.oxygenSaturation}%</p>
                          <p className="text-xs text-gray-400 mt-1">Recorded: {new Date(lastVitals.recordedAt).toLocaleString()}</p>
                        </>
                      ) : (
                        <p className="text-gray-500 italic">No vitals recorded yet.</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3 flex gap-2">
                    <button onClick={() => openVitalsModal(patient)} className="flex-1 flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
                      <Plus className="h-4 w-4 mr-2" /> Record Vitals
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'Medications' && (
        <div className="space-y-6">
          <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Active Prescriptions (To Be Administered)</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Record when a patient takes their dispensed medication.</p>
            </div>
            <ul role="list" className="divide-y divide-gray-100">
              {prescriptions.length === 0 ? (
                <li className="p-6 text-center text-sm text-gray-500">No active dispensed prescriptions found.</li>
              ) : (
                prescriptions.map((presc: any) => (
                  <li key={presc.id} className="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-gray-50 sm:px-6">
                    <div className="flex min-w-0 gap-x-4">
                      <div className="h-10 w-10 flex-none rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Pill className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-auto">
                        <p className="text-sm font-bold leading-6 text-gray-900">{presc.medication} ({presc.dosage})</p>
                        <p className="mt-1 flex text-xs leading-5 text-gray-600">Patient: <span className="font-semibold ml-1">{presc.patient.firstName} {presc.patient.lastName}</span></p>
                        <p className="mt-1 text-xs text-gray-500 italic">Instructions: {presc.instructions}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-x-6">
                      <div className="hidden sm:flex sm:flex-col sm:items-end">
                        {presc.administrations?.length > 0 ? (
                          <>
                            <p className="text-sm leading-6 text-green-600 font-medium">Last Administered:</p>
                            <p className="text-xs text-gray-500">{new Date(presc.administrations[0].administeredAt).toLocaleString()}</p>
                            <p className="text-xs text-gray-500">by Nurse {presc.administrations[0].nurse.name}</p>
                          </>
                        ) : (
                          <p className="text-sm leading-6 text-yellow-600 font-medium">Not yet administered</p>
                        )}
                      </div>
                      <button onClick={() => openMedsModal(presc)} className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-blue-600 shadow-sm ring-1 ring-inset ring-blue-300 hover:bg-blue-50">
                        Record Dose
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'Care Coordination' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredPatients.filter((p:any) => p.medicalRecords?.[0]?.wardAdmission).map((patient: any) => {
            const record = patient.medicalRecords[0];
            return (
              <div key={`coord-${patient.id}`} className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-purple-50 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-purple-900">{patient.firstName} {patient.lastName}</h3>
                  <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                    Admitted
                  </span>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Ward & Bed</h4>
                    <p className="text-sm text-gray-900 font-medium">{record.wardAdmission}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Diagnosis</h4>
                    <p className="text-sm text-gray-900">{record.diagnosis}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Doctor&apos;s Orders</h4>
                    <div className="bg-gray-50 p-3 rounded border border-gray-100 mt-1">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.treatment}</p>
                      {record.notes && <p className="text-sm text-gray-500 italic mt-2">&quot;{record.notes}&quot;</p>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredPatients.filter((p:any) => p.medicalRecords?.[0]?.wardAdmission).length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-gray-500 bg-white rounded-xl shadow-sm ring-1 ring-gray-200">
              No admitted patients requiring care coordination at this time.
            </div>
          )}
        </div>
      )}

      {/* Vitals Modal */}
      {vitalsModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setVitalsModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Record Vitals: {selectedPatient.firstName}</h2>
              <button onClick={() => setVitalsModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleVitalsSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attending Nurse</label>
                <select required value={vitalsData.nurseId} onChange={e => setVitalsData({...vitalsData, nurseId: parseInt(e.target.value)})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6">
                  {nurses.map((n:any) => <option key={n.id} value={n.id}>Nurse {n.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blood Pressure (mmHg)</label>
                  <input required type="text" placeholder="120/80" value={vitalsData.bloodPressure} onChange={e => setVitalsData({...vitalsData, bloodPressure: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heart Rate (bpm)</label>
                  <input required type="number" placeholder="72" value={vitalsData.heartRate} onChange={e => setVitalsData({...vitalsData, heartRate: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
                  <input required type="number" step="0.1" placeholder="36.5" value={vitalsData.temperature} onChange={e => setVitalsData({...vitalsData, temperature: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resp. Rate (breaths/min)</label>
                  <input required type="number" placeholder="16" value={vitalsData.respiratoryRate} onChange={e => setVitalsData({...vitalsData, respiratoryRate: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SpO2 (%)</label>
                  <input required type="number" placeholder="98" value={vitalsData.oxygenSaturation} onChange={e => setVitalsData({...vitalsData, oxygenSaturation: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                    <input required type="number" step="0.1" placeholder="70" value={vitalsData.weight} onChange={e => setVitalsData({...vitalsData, weight: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                    <input required type="number" step="0.1" placeholder="175" value={vitalsData.height} onChange={e => setVitalsData({...vitalsData, height: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nursing Notes / Observations</label>
                <textarea rows={3} value={vitalsData.notes} onChange={e => setVitalsData({...vitalsData, notes: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" placeholder="Patient condition, complaints, observations..." />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setVitalsModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Vitals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medication Administration Modal */}
      {medsModalOpen && selectedPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setMedsModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Administer Medication</h2>
              <button onClick={() => setMedsModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6 text-sm text-gray-700">
              <p className="mb-2"><span className="font-semibold text-gray-900">Patient:</span> {selectedPrescription.patient.firstName} {selectedPrescription.patient.lastName}</p>
              <p className="mb-2"><span className="font-semibold text-gray-900">Medication:</span> <span className="font-bold text-blue-700">{selectedPrescription.medication} ({selectedPrescription.dosage})</span></p>
              <p><span className="font-semibold text-gray-900">Instructions:</span> {selectedPrescription.instructions}</p>
            </div>

            <form onSubmit={handleMedsSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Administering Nurse</label>
                <select required value={medsData.nurseId} onChange={e => setMedsData({...medsData, nurseId: parseInt(e.target.value)})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6">
                  {nurses.map((n:any) => <option key={n.id} value={n.id}>Nurse {n.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Administration Notes</label>
                <textarea rows={3} value={medsData.notes} onChange={e => setMedsData({...medsData, notes: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" placeholder="E.g. Taken with food, patient tolerated well..." />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setMedsModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50">
                  {isSubmitting ? 'Recording...' : 'Record Dose Given'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
