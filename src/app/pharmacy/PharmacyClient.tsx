'use client';

import { useState } from 'react';
import { Pill, Check, Clock, AlertTriangle, PackageSearch, Plus, X, Search, Edit } from 'lucide-react';
import Link from 'next/link';
import { dispenseMedicationAction, updateInventoryAction } from './actions';

type Prescription = {
  id: number;
  medication: string;
  dosage: string;
  instructions: string | null;
  status: string;
  prescribedDate: Date;
  dispensedDate: Date | null;
  patient: { id: number; firstName: string; lastName: string };
  doctor: { id: number; name: string };
};

type InventoryItem = {
  id: number;
  medicationName: string;
  stockLevel: number;
  reorderLevel: number;
  unitPrice: string;
  lastUpdated: Date;
};

export default function PharmacyClient({ 
  initialPrescriptions,
  initialInventory 
}: { 
  initialPrescriptions: Prescription[],
  initialInventory: InventoryItem[]
}) {
  const [activeTab, setActiveTab] = useState<'Prescriptions' | 'Inventory'>('Prescriptions');
  
  // Dispense State
  const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [dispenseQuantity, setDispenseQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inventory State
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [invFormData, setInvFormData] = useState({ medicationName: '', stockLevel: 0, reorderLevel: 20, unitPrice: '0.00' });

  // Drug Interactions Mock System
  const [interactionWarning, setInteractionWarning] = useState<string | null>(null);

  // Computed Filters
  const filteredInventory = initialInventory.filter(item => 
    item.medicationName.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  const pendingPrescriptions = initialPrescriptions.filter(p => p.status === 'Pending');
  const dispensedPrescriptions = initialPrescriptions.filter(p => p.status === 'Dispensed');

  const openDispenseModal = (p: Prescription) => {
    setSelectedPrescription(p);
    setDispenseQuantity(1);
    
    // Mock Drug Interaction Check
    const activeMeds = initialPrescriptions
      .filter(presc => presc.patient.id === p.patient.id && presc.id !== p.id)
      .map(presc => presc.medication.toLowerCase());
      
    if (p.medication.toLowerCase().includes('warfarin') && activeMeds.some(m => m.includes('aspirin') || m.includes('ibuprofen'))) {
      setInteractionWarning('SEVERE: High risk of bleeding. Patient is currently prescribed other NSAIDs/Anticoagulants.');
    } else if (p.medication.toLowerCase().includes('lisinopril') && activeMeds.some(m => m.includes('potassium'))) {
      setInteractionWarning('MODERATE: Risk of hyperkalemia detected with concurrent potassium supplements.');
    } else {
      setInteractionWarning(null);
    }
    
    setDispenseModalOpen(true);
  };

  const handleDispense = async () => {
    if (!selectedPrescription) return;
    setIsSubmitting(true);
    try {
      await dispenseMedicationAction(selectedPrescription.id, selectedPrescription.medication, dispenseQuantity);
      window.location.reload();
    } catch (err) {
      alert('Failed to dispense medication');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddInventory = () => {
    setEditingItem(null);
    setInvFormData({ medicationName: '', stockLevel: 0, reorderLevel: 20, unitPrice: '0.00' });
    setInventoryModalOpen(true);
  };

  const openEditInventory = (item: InventoryItem) => {
    setEditingItem(item);
    setInvFormData({
      medicationName: item.medicationName,
      stockLevel: item.stockLevel,
      reorderLevel: item.reorderLevel,
      unitPrice: item.unitPrice
    });
    setInventoryModalOpen(true);
  };

  const handleInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateInventoryAction({
        id: editingItem?.id,
        medicationName: invFormData.medicationName,
        stockLevel: Number(invFormData.stockLevel),
        reorderLevel: Number(invFormData.reorderLevel),
        unitPrice: invFormData.unitPrice,
      });
      window.location.reload();
    } catch (err) {
      alert('Failed to update inventory');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('Prescriptions')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${
            activeTab === 'Prescriptions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Pill className="w-4 h-4 mr-2" />
          Queue & Dispense
        </button>
        <button
          onClick={() => setActiveTab('Inventory')}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center ${
            activeTab === 'Inventory' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <PackageSearch className="w-4 h-4 mr-2" />
          Medication Inventory
        </button>
      </div>

      {activeTab === 'Prescriptions' && (
        <div className="space-y-8">
          {/* Pending Queue */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-yellow-600" /> Pending Fulfillment
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingPrescriptions.length === 0 ? (
                <div className="col-span-full py-6 text-center text-sm text-gray-500 bg-white rounded-xl shadow-sm ring-1 ring-gray-200">
                  No pending prescriptions.
                </div>
              ) : (
                pendingPrescriptions.map((prescription) => (
                  <div key={prescription.id} className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-blue-200 flex flex-col border-l-4 border-l-blue-500">
                    <div className="p-5 flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{prescription.medication}</h3>
                        <span className="text-xs text-gray-500">{new Date(prescription.prescribedDate).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-bold text-blue-600 mb-4">{prescription.dosage}</p>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><span className="font-medium text-gray-900">Patient:</span> <Link href={`/patients/${prescription.patient.id}`} className="hover:underline">{prescription.patient.firstName} {prescription.patient.lastName}</Link></p>
                        <p><span className="font-medium text-gray-900">Doctor:</span> Dr. {prescription.doctor.name}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
                      <button onClick={() => openDispenseModal(prescription)} className="w-full flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
                        <Check className="h-4 w-4 mr-2" /> Process & Dispense
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Dispensed History */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Check className="w-5 h-5 mr-2 text-green-600" /> Recently Dispensed
            </h2>
            <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Medication</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Patient</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Prescribed By</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Dispensed On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dispensedPrescriptions.length === 0 ? (
                    <tr><td colSpan={4} className="py-4 text-center text-sm text-gray-500">No recent dispensations.</td></tr>
                  ) : (
                    dispensedPrescriptions.slice(0, 10).map((p) => (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm font-medium text-gray-900">{p.medication} ({p.dosage})</td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">{p.patient.firstName} {p.patient.lastName}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">Dr. {p.doctor.name}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">{p.dispensedDate ? new Date(p.dispensedDate).toLocaleString() : 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'Inventory' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search medication..."
                value={inventorySearch}
                onChange={e => setInventorySearch(e.target.value)}
                className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              />
            </div>
            <button onClick={openAddInventory} className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
              <Plus className="h-4 w-4 mr-2" /> Add Stock
            </button>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Medication</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Stock Level</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Unit Price</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInventory.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-500">No inventory matches found.</td></tr>
                ) : (
                  filteredInventory.map((item) => {
                    const isLow = item.stockLevel <= item.reorderLevel;
                    const isOut = item.stockLevel === 0;
                    return (
                      <tr key={item.id} className={isOut ? 'bg-red-50' : isLow ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                        <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm font-bold text-gray-900">{item.medicationName}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-900">{item.stockLevel}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm">
                          {isOut ? (
                            <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700"><AlertTriangle className="w-3 h-3 mr-1"/> Out of Stock</span>
                          ) : isLow ? (
                            <span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1"/> Reorder Alert</span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">Healthy</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">SLe {item.unitPrice}</td>
                        <td className="relative whitespace-nowrap py-3 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button onClick={() => openEditInventory(item)} className="text-blue-600 hover:text-blue-900">Update<span className="sr-only">, {item.medicationName}</span></button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dispense Modal */}
      {dispenseModalOpen && selectedPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setDispenseModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Dispense Medication</h2>
              <button onClick={() => setDispenseModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            
            {interactionWarning && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-sm font-bold text-red-800">DRUG INTERACTION WARNING</p>
                </div>
                <p className="mt-1 text-sm text-red-700 ml-7">{interactionWarning}</p>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6 text-sm text-gray-700">
              <p className="mb-2"><span className="font-semibold text-gray-900">Prescription:</span> <span className="text-blue-700 font-bold">{selectedPrescription.medication} ({selectedPrescription.dosage})</span></p>
              <p className="mb-2"><span className="font-semibold text-gray-900">Patient:</span> {selectedPrescription.patient.firstName} {selectedPrescription.patient.lastName}</p>
              <p className="mb-2"><span className="font-semibold text-gray-900">Prescribing Dr:</span> Dr. {selectedPrescription.doctor.name}</p>
              <p className="mb-2"><span className="font-semibold text-gray-900">Instructions:</span> {selectedPrescription.instructions || 'None provided.'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Dispense (Deducts from Inventory)</label>
              <input
                type="number"
                min="1"
                value={dispenseQuantity}
                onChange={(e) => setDispenseQuantity(parseInt(e.target.value) || 1)}
                className="block w-full max-w-xs rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button onClick={() => setDispenseModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleDispense} disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50">
                {isSubmitting ? 'Processing...' : 'Confirm & Dispense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Form Modal */}
      {inventoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setInventoryModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">{editingItem ? 'Update Stock' : 'Add Medication'}</h2>
              <button onClick={() => setInventoryModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleInventorySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medication Name</label>
                <input required type="text" value={invFormData.medicationName} onChange={e => setInvFormData({...invFormData, medicationName: e.target.value})} disabled={!!editingItem} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 disabled:bg-gray-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock Level</label>
                  <input required type="number" min="0" value={invFormData.stockLevel} onChange={e => setInvFormData({...invFormData, stockLevel: parseInt(e.target.value) || 0})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Alert Level</label>
                  <input required type="number" min="0" value={invFormData.reorderLevel} onChange={e => setInvFormData({...invFormData, reorderLevel: parseInt(e.target.value) || 0})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (SLe)</label>
                <input required type="text" pattern="^\d+(\.\d{1,2})?$" value={invFormData.unitPrice} onChange={e => setInvFormData({...invFormData, unitPrice: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" placeholder="0.00" />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setInventoryModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Stock Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
