'use client';

import { useState, useRef } from 'react';
import { Download, Upload, Plus, FileSpreadsheet, Trash2, Edit, X } from 'lucide-react';
import { createStaffAction, updateStaffAction, deleteStaffAction, batchCreateStaffAction } from './actions';

type Staff = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
};

export default function StaffClient({ initialStaff }: { initialStaff: Staff[] }) {
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'doctor' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAddModal = () => {
    setEditingStaff(null);
    setFormData({ name: '', email: '', role: 'doctor' });
    setIsModalOpen(true);
  };

  const openEditModal = (s: Staff) => {
    setEditingStaff(s);
    setFormData({ name: s.name, email: s.email, role: s.role });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingStaff) {
        await updateStaffAction(editingStaff.id, formData);
        setStaff(staff.map(s => s.id === editingStaff.id ? { ...s, ...formData } : s));
      } else {
        await createStaffAction(formData);
        // Refresh handled by server action revalidation, but for instant UI:
        window.location.reload();
      }
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Failed to save staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    try {
      await deleteStaffAction(id);
      setStaff(staff.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete staff');
    }
  };

  const downloadTemplate = () => {
    const csvContent = "name,email,role\nJohn Doe,john@example.com,doctor\nJane Smith,jane@example.com,nurse";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportData = () => {
    const header = "id,name,email,role,createdAt\n";
    const rows = staff.map(s => `${s.id},"${s.name}","${s.email}",${s.role},${new Date(s.createdAt).toISOString()}`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        alert('Invalid CSV format or empty file.');
        return;
      }

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const nameIdx = headers.indexOf('name');
      const emailIdx = headers.indexOf('email');
      const roleIdx = headers.indexOf('role');

      if (nameIdx === -1 || emailIdx === -1 || roleIdx === -1) {
        alert('CSV must contain "name", "email", and "role" columns.');
        return;
      }

      const staffList = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 3) {
          staffList.push({
            name: cols[nameIdx],
            email: cols[emailIdx],
            role: cols[roleIdx],
          });
        }
      }

      if (staffList.length > 0) {
        try {
          await batchCreateStaffAction(staffList);
          window.location.reload();
        } catch (err) {
          console.error(err);
          alert('Failed to batch upload staff.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={openAddModal} className="flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
          <Plus className="h-4 w-4 mr-2" /> Add Staff
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          <Upload className="h-4 w-4 mr-2" /> Batch Upload
        </button>
        <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
        
        <button onClick={downloadTemplate} className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Download Template
        </button>
        <button onClick={exportData} className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          <Download className="h-4 w-4 mr-2" /> Export Data
        </button>
      </div>

      <div className="mt-6 overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Role</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Joined</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {staff.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-gray-500">
                  No staff members found.
                </td>
              </tr>
            ) : (
              staff.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{s.name}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{s.email}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 capitalize">{s.role}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => openEditModal(s)} className="text-indigo-600 hover:text-indigo-900">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-900/50" onClick={closeModal} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{editingStaff ? 'Edit Staff' : 'Add Staff'}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6">
                  <option value="doctor">Doctor</option>
                  <option value="specialist">Specialist</option>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="laboratory">Laboratory</option>
                  <option value="radiology">Radiology</option>
                  <option value="emergency">ER Staff</option>
                  <option value="medical_records">Medical Records</option>
                  <option value="health_authority">Health Authority</option>
                  <option value="ict_support">ICT Support</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
