'use client';

import { useState } from 'react';
import { CreditCard, Download, Plus, Search, DollarSign, Activity, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';
import { createInvoiceAction, markInvoicePaidAction } from './actions';

type Invoice = any;
type Patient = any;
type Staff = any;

export default function BillingClient({ 
  initialInvoices,
  patients,
  staff
}: { 
  initialInvoices: Invoice[],
  patients: Patient[],
  staff: Staff[]
}) {
  const [activeTab, setActiveTab] = useState<'All' | 'Unpaid' | 'Paid'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    patientId: patients.length > 0 ? patients[0].id : 0,
    amount: '',
    description: '',
    dueDate: '',
    issuedBy: staff.length > 0 ? staff[0].id : 1, // Fallback if staff list empty
  });

  const filteredInvoices = initialInvoices.filter(inv => {
    const matchesTab = activeTab === 'All' ? true : inv.status === activeTab;
    const matchesSearch = 
      inv.patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      inv.patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id.toString() === searchQuery;
    return matchesTab && matchesSearch;
  });

  const totalRevenue = initialInvoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  const outstandingRevenue = initialInvoices.filter(i => i.status === 'Unpaid').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId || !formData.amount || !formData.dueDate) return;

    setIsSubmitting(true);
    try {
      await createInvoiceAction({
        patientId: formData.patientId,
        amount: formData.amount,
        description: formData.description,
        dueDate: new Date(formData.dueDate),
        issuedBy: formData.issuedBy
      });
      window.location.reload();
    } catch(err) {
      alert('Failed to create invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async (id: number) => {
    if(!confirm('Confirm receipt of payment?')) return;
    try {
      await markInvoicePaidAction(id, formData.issuedBy);
      window.location.reload();
    } catch(err) {
      alert('Failed to process payment.');
    }
  };

  const downloadReceipt = (inv: any) => {
    const receipt = `HOSPITAL RECEIPT\n------------------\nInvoice: INV-${String(inv.id).padStart(4, '0')}\nDate: ${new Date().toLocaleDateString()}\nPatient: ${inv.patient.firstName} ${inv.patient.lastName}\nAmount Paid: SLe ${inv.amount}\nDescription: ${inv.description || 'Medical Services'}\n------------------\nTHANK YOU`;
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_INV-${inv.id}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
        <div className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200 p-5 flex items-center">
          <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-500">Collected Revenue</p>
            <p className="text-2xl font-bold text-gray-900">SLe {totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200 p-5 flex items-center">
          <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
            <Activity className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-500">Outstanding (Unpaid)</p>
            <p className="text-2xl font-bold text-gray-900">SLe {outstandingRevenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-200 mb-6">
        <div className="flex space-x-2">
          {['All', 'Unpaid', 'Paid'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab} Invoices
            </button>
          ))}
        </div>
        <button onClick={() => setInvoiceModalOpen(true)} className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
          <Plus className="h-4 w-4 mr-2" /> Create Invoice
        </button>
      </div>

      <div className="relative max-w-md mb-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by Patient Name or Invoice ID..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
        />
      </div>

      <div className="flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-gray-200 sm:rounded-xl">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Invoice ID</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Patient</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Description</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Amount</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Due Date</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-gray-500">
                        <CreditCard className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                        No invoices found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-gray-900 sm:pl-6">
                          INV-{String(inv.id).padStart(4, '0')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                          <Link href={`/patients/${inv.patient.id}`} className="text-blue-600 hover:underline">
                            {inv.patient.firstName} {inv.patient.lastName}
                          </Link>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 max-w-[200px] truncate" title={inv.description}>
                          {inv.description || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-gray-900">
                          SLe {parseFloat(inv.amount).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            inv.status === 'Paid' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                            'bg-red-50 text-red-700 ring-red-600/10 animate-pulse'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          {inv.status === 'Unpaid' ? (
                            <button onClick={() => handlePayment(inv.id)} className="text-blue-600 hover:text-blue-900">
                              Collect Payment
                            </button>
                          ) : (
                            <button onClick={() => downloadReceipt(inv)} className="text-gray-500 hover:text-gray-700 flex items-center justify-end w-full">
                              <Download className="h-4 w-4 mr-1" /> Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {invoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setInvoiceModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Create New Invoice</h2>
              <button onClick={() => setInvoiceModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Patient</label>
                <select required value={formData.patientId} onChange={e => setFormData({...formData, patientId: parseInt(e.target.value)})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6">
                  {patients.map((p:any) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} (ID: {p.id})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Services Description</label>
                <input required type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" placeholder="E.g. Consultation & Lab Tests" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (SLe)</label>
                  <input required type="text" pattern="^\d+(\.\d{1,2})?$" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input required type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issued By (Billing Officer)</label>
                <select required value={formData.issuedBy} onChange={e => setFormData({...formData, issuedBy: parseInt(e.target.value)})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6">
                  {staff.length === 0 ? <option value="1">System Admin</option> : staff.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setInvoiceModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50">
                  {isSubmitting ? 'Processing...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
