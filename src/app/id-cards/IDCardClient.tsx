'use client';

import { useState } from 'react';
import { Badge, Download, Printer, Search, Shield, User, Edit3, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import { updateStaffIDDetailsAction } from './actions';

type Staff = any;

export default function IDCardClient({ staff }: { staff: Staff[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [cardTemplate, setCardTemplate] = useState<'standard' | 'security'>('standard');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    contactNumber: '',
    hireDate: '',
    licenseNumber: '',
  });

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateEmployeeId = (id: number) => `HOS-${String(id).padStart(4, '0')}`;

  const openEditModal = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setEditFormData({
      name: staffMember.name || '',
      email: staffMember.email || '',
      role: staffMember.role || '',
      department: staffMember.department || '',
      contactNumber: staffMember.contactNumber || '',
      hireDate: staffMember.hireDate ? new Date(staffMember.hireDate).toISOString().split('T')[0] : '',
      licenseNumber: staffMember.licenseNumber || '',
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setIsSubmitting(true);
    try {
      await updateStaffIDDetailsAction(editingStaff.id, editFormData);
      window.location.reload();
    } catch (err) {
      alert('Failed to update staff details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadCard = async (staffMember: Staff) => {
    // Set the selected staff so the hidden card renders
    setSelectedStaff(staffMember);
    setCardTemplate('security');
    
    setTimeout(async () => {
      const cardEl = document.getElementById('printable-card');
      if (cardEl) {
        try {
          const dataUrl = await toPng(cardEl, { 
            backgroundColor: '#ffffff',
            width: 600,
            height: 380
          });
          
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `ID_Card_${staffMember.name.replace(/\s+/g, '_')}.png`;
          link.click();
        } catch (err) {
          console.error('Failed to generate card image', err);
          alert('Failed to generate card. Please try again.');
        }
      }
      setSelectedStaff(null);
    }, 500);
  };

  const printCard = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setCardTemplate('security');
    
    setTimeout(() => {
      const printContents = document.getElementById('printable-card')?.innerHTML;
      if (printContents) {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head>
                <title>Print ID Card</title>
                <style>
                  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                  body { margin: 0; padding: 20px; font-family: 'Inter', sans-serif; }
                  .id-card { width: 600px; margin: 0 auto; }
                </style>
              </head>
              <body>
                <div class="id-card">${printContents}</div>
                <script>window.onload = () => { window.print(); window.close(); }<\/script>
              </body>
            </html>
          `);
          newWindow.document.close();
        }
      }
      setSelectedStaff(null);
    }, 500);
  };

  const renderCard = (staffMember: Staff, template: 'standard' | 'security', showEdit: boolean = false) => {
    const empId = generateEmployeeId(staffMember.id);
    const initials = staffMember.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
    
    return (
      <div 
        id={template === 'security' ? 'printable-card' : undefined}
        className={`relative w-[600px] h-[380px] rounded-2xl overflow-hidden shadow-2xl border-8 border-gray-800 ${
          template === 'security' 
            ? 'bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white'
            : 'bg-gradient-to-br from-blue-50 via-white to-blue-50 text-gray-900'
        }`}
      >
        {/* Security Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <Shield className="h-52 w-52" />
        </div>

        {/* Header Strip */}
        <div className={`absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-8 ${
          template === 'security' ? 'bg-blue-950' : 'bg-blue-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xl ${
              template === 'security' ? 'bg-white text-blue-900' : 'bg-blue-100 text-blue-800'
            }`}>
              {initials}
            </div>
            <div>
              <h2 className={`text-xl font-bold ${template === 'security' ? 'text-white' : 'text-white'}`}>
                HealthAI HMIS
              </h2>
              <p className={`text-xs ${template === 'security' ? 'text-blue-300' : 'text-blue-200'}`}>
                Hospital Management Information System
              </p>
            </div>
          </div>
          <div className={`text-right ${template === 'security' ? 'text-blue-300' : 'text-blue-100'}`}>
            <p className="text-xs">EMPLOYEE ID</p>
            <p className="font-bold text-lg">{empId}</p>
          </div>
        </div>

        {/* Photo Placeholder & Details */}
        <div className="absolute top-28 left-8 right-8">
          <div className="flex gap-8">
            {/* Photo Area */}
            <div className={`relative w-32 h-40 rounded-xl flex items-center justify-center border-2 border-dashed ${
              template === 'security' ? 'border-blue-700 bg-blue-800' : 'border-gray-300 bg-gray-100'
            }`}>
              <User className={`h-16 w-16 ${template === 'security' ? 'text-blue-600' : 'text-gray-400'}`} />
              {showEdit && (
                <button 
                  onClick={() => openEditModal(staffMember)}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  title="Edit Staff Details"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 space-y-4">
              <div>
                <p className={`text-xs uppercase ${template === 'security' ? 'text-blue-300' : 'text-gray-500'} font-medium`}>Full Name</p>
                <p className={`text-2xl font-bold ${template === 'security' ? 'text-white' : 'text-gray-900'}`}>
                  {staffMember.name}
                </p>
              </div>
              <div>
                <p className={`text-xs uppercase ${template === 'security' ? 'text-blue-300' : 'text-gray-500'} font-medium`}>Role / Department</p>
                <p className={`text-lg font-semibold capitalize ${template === 'security' ? 'text-blue-200' : 'text-gray-700'}`}>
                  {staffMember.role.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className={`text-xs uppercase ${template === 'security' ? 'text-blue-300' : 'text-gray-500'} font-medium`}>Contact</p>
                <p className={`text-sm ${template === 'security' ? 'text-blue-300' : 'text-gray-600'}`}>
                  {staffMember.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Strip */}
        <div className={`absolute bottom-0 left-0 right-0 h-16 flex items-center justify-between px-8 ${
          template === 'security' ? 'bg-blue-950 border-t border-blue-800' : 'bg-gray-100 border-t border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              template === 'security' ? 'bg-red-500' : 'bg-red-100'
            }`}>
              <Shield className={`h-5 w-5 ${template === 'security' ? 'text-white' : 'text-red-600'}`} />
            </div>
            <div>
              <p className={`text-xs font-bold ${template === 'security' ? 'text-blue-300' : 'text-gray-500'}`}>SECURITY LEVEL</p>
              <p className={`text-sm font-bold ${template === 'security' ? 'text-white' : 'text-gray-900'}`}>AUTHORIZED PERSONNEL ONLY</p>
            </div>
          </div>
          <div className={`text-right ${template === 'security' ? 'text-blue-400' : 'text-gray-400'}`}>
            <p className="text-xs">Issued: {new Date().toLocaleDateString()}</p>
            <p className="text-xs">Expiry: {new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Barcode Area */}
        <div className="absolute bottom-20 right-8">
          <div className="flex items-end gap-1 h-8">
            {[...Array(20)].map((_, i) => (
              <div key={i} className={`w-1 ${template === 'security' ? 'bg-blue-300' : 'bg-gray-400'} rounded-sm`} style={{ height: `${Math.random() * 6 + 2}px` }} />
            ))}
          </div>
          <p className={`text-[6px] font-mono text-center mt-1 ${template === 'security' ? 'text-blue-400' : 'text-gray-400'}`}>
            {empId}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
          />
        </div>
        <select value={cardTemplate} onChange={e => setCardTemplate(e.target.value as any)} className="rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm">
          <option value="standard">Standard Template</option>
          <option value="security">Security Template</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredStaff.map((s) => (
          <div key={s.id} className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-center">
              {renderCard(s, 'standard', true)}
            </div>
            <div className="p-5 flex gap-2">
              <button 
                onClick={() => downloadCard(s)}
                className="flex-1 flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                <Download className="h-4 w-4 mr-2" /> Download
              </button>
              <button 
                onClick={() => printCard(s)}
                className="flex-1 flex items-center justify-center rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-200"
              >
                <Printer className="h-4 w-4 mr-2" /> Print
              </button>
              <button 
                onClick={() => openEditModal(s)}
                className="flex-1 flex items-center justify-center rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-200"
              >
                <Edit3 className="h-4 w-4 mr-2" /> Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Staff Modal */}
      {editModalOpen && editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setEditModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Staff ID Details</h2>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input required type="text" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input required type="email" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select required value={editFormData.role} onChange={e => setEditFormData({...editFormData, role: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 capitalize">
                    <option value="admin">Admin</option>
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
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input type="text" value={editFormData.department} onChange={e => setEditFormData({...editFormData, department: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" placeholder="e.g. Cardiology" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input type="tel" value={editFormData.contactNumber} onChange={e => setEditFormData({...editFormData, contactNumber: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                  <input type="date" value={editFormData.hireDate} onChange={e => setEditFormData({...editFormData, hireDate: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                  <input type="text" value={editFormData.licenseNumber} onChange={e => setEditFormData({...editFormData, licenseNumber: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" placeholder="e.g. MD-12345, RN-67890" />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
