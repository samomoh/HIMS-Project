'use client';

import { useState } from 'react';
import { ServerCog, CheckCircle, Clock, AlertTriangle, Users, Cable, Plus, X, Search, Activity, ShieldCheck, Link as LinkIcon } from 'lucide-react';
import { createTicketAction, updateTicketStatusAction } from './actions';
import { requestPasswordResetAction } from '../auth/reset-password/actions';

type Ticket = any;
type User = any;

export default function ICTClient({ tickets, users }: { tickets: Ticket[], users: User[] }) {
  const [activeTab, setActiveTab] = useState<'Helpdesk' | 'Health' | 'Users' | 'Integrations'>('Helpdesk');
  
  // Ticket Form
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketData, setTicketData] = useState({
    userId: users.length > 0 ? users[0].id : 0,
    subject: '',
    description: '',
    priority: 'Low',
  });

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createTicketAction({
        userId: ticketData.userId,
        subject: ticketData.subject,
        description: ticketData.description,
        priority: ticketData.priority
      });
      window.location.reload();
    } catch(err) {
      alert('Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      // Hardcode actor ID for demo
      await updateTicketStatusAction(id, status, 1);
      window.location.reload();
    } catch (err) {
      alert('Failed to update ticket status');
    }
  };

  const triggerPasswordReset = async (email: string) => {
    if(!confirm(`Send password reset link to ${email}?`)) return;
    try {
      await requestPasswordResetAction(email);
      alert('Password reset link dispatched.');
    } catch(err) {
      alert('Error dispatching reset link.');
    }
  };

  return (
    <>
      <div className="flex border-b border-gray-200 mb-6 space-x-2 overflow-x-auto">
        <button onClick={() => setActiveTab('Helpdesk')} className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center shrink-0 ${activeTab === 'Helpdesk' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <ServerCog className="w-4 h-4 mr-2" /> Helpdesk (Tickets)
        </button>
        <button onClick={() => setActiveTab('Health')} className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center shrink-0 ${activeTab === 'Health' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Activity className="w-4 h-4 mr-2" /> Application Health
        </button>
        <button onClick={() => setActiveTab('Users')} className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center shrink-0 ${activeTab === 'Users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Users className="w-4 h-4 mr-2" /> User Assistance
        </button>
        <button onClick={() => setActiveTab('Integrations')} className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors flex items-center shrink-0 ${activeTab === 'Integrations' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Cable className="w-4 h-4 mr-2" /> API Integrations
        </button>
      </div>

      {activeTab === 'Helpdesk' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-600">Track and resolve IT issues reported by hospital staff.</p>
            <button onClick={() => setTicketModalOpen(true)} className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
              <Plus className="h-4 w-4 mr-2" /> Create Mock Ticket
            </button>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
            <ul role="list" className="divide-y divide-gray-100">
              {tickets.length === 0 ? (
                <li className="p-10 text-center text-sm text-gray-500">No support tickets found.</li>
              ) : (
                tickets.map((t: any) => (
                  <li key={t.id} className="relative flex justify-between gap-x-6 px-6 py-5 hover:bg-gray-50">
                    <div className="flex min-w-0 gap-x-4">
                      <div className="min-w-0 flex-auto">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold leading-6 text-gray-900">#{t.id} - {t.subject}</p>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${
                            t.priority === 'Critical' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                            t.priority === 'High' ? 'bg-orange-50 text-orange-700 ring-orange-600/20' :
                            t.priority === 'Medium' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' :
                            'bg-gray-50 text-gray-600 ring-gray-500/10'
                          }`}>
                            {t.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{t.description}</p>
                        <p className="mt-2 flex text-xs leading-5 text-gray-500">
                          Reported by: {t.user.name} ({t.user.email}) on {new Date(t.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        t.status === 'Resolved' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                        t.status === 'In Progress' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                      }`}>
                        {t.status}
                      </span>
                      {t.status === 'Open' && (
                        <button onClick={() => handleStatusUpdate(t.id, 'In Progress')} className="text-xs font-medium text-blue-600 hover:text-blue-500 mt-2">Mark In Progress &rarr;</button>
                      )}
                      {t.status === 'In Progress' && (
                        <button onClick={() => handleStatusUpdate(t.id, 'Resolved')} className="text-xs font-medium text-green-600 hover:text-green-500 mt-2">Resolve Ticket &rarr;</button>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'Health' && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200 p-5 flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500">System Uptime</p>
              <p className="text-2xl font-bold text-gray-900">99.99%</p>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200 p-5 flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <ServerCog className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">42ms</p>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200 p-5 flex items-center">
            <div className="flex-shrink-0 bg-gray-100 rounded-md p-3">
              <ShieldCheck className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500">Database Load</p>
              <p className="text-2xl font-bold text-gray-900">14%</p>
            </div>
          </div>
          
          <div className="col-span-full bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden mt-4">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Latest Security Advisories & Patches</h3>
            </div>
            <div className="p-4 text-sm text-gray-600">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0"/>
                  <span>All ORM drivers updated to latest stable version.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0"/>
                  <span>PostgreSQL backups ran successfully at 02:00 AM UTC.</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0"/>
                  <span>Pending SSL Certificate renewal in 14 days.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Users' && (
        <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">User Authentication Assistance</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Role</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm font-medium text-gray-900">{u.name}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">{u.email}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500 capitalize">{u.role}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm">
                    <button onClick={() => triggerPasswordReset(u.email)} className="text-blue-600 hover:text-blue-900 font-medium">Send Reset Link</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl p-5 border-l-4 border-green-500">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><LinkIcon className="w-4 h-4"/> External Lab API</h3>
                <p className="text-sm text-gray-500 mt-1">Syncs diagnostic orders with central city laboratory.</p>
              </div>
              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-bold text-green-700 ring-1 ring-inset ring-green-600/20">Operational</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
              <button className="text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">Refresh Keys</button>
              <button className="text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">Test Connection</button>
            </div>
          </div>
          
          <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl p-5 border-l-4 border-green-500">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><LinkIcon className="w-4 h-4"/> PACS Radiology Gateway</h3>
                <p className="text-sm text-gray-500 mt-1">DICOM image server synchronization.</p>
              </div>
              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-bold text-green-700 ring-1 ring-inset ring-green-600/20">Operational</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
              <button className="text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">Refresh Keys</button>
              <button className="text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">Test Connection</button>
            </div>
          </div>
          
          <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl p-5 border-l-4 border-yellow-500">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><LinkIcon className="w-4 h-4"/> National Insurance Portal</h3>
                <p className="text-sm text-gray-500 mt-1">Automated claims and coverage verification.</p>
              </div>
              <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-bold text-yellow-800 ring-1 ring-inset ring-yellow-600/20">Degraded Performance</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
              <button className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded border border-blue-200">View API Logs</button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {ticketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60" onClick={() => setTicketModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Create Support Ticket</h2>
              <button onClick={() => setTicketModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleTicketSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reporter (User)</label>
                <select required value={ticketData.userId} onChange={e => setTicketData({...ticketData, userId: parseInt(e.target.value)})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6">
                  {users.map((u:any) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input required type="text" value={ticketData.subject} onChange={e => setTicketData({...ticketData, subject: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" placeholder="E.g. Printer not working in ER..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select required value={ticketData.priority} onChange={e => setTicketData({...ticketData, priority: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea required rows={4} value={ticketData.description} onChange={e => setTicketData({...ticketData, description: e.target.value})} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6" placeholder="Detailed description of the issue..." />
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setTicketModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50">
                  {isSubmitting ? 'Submitting...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
