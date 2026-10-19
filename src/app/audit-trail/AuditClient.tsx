'use client';

import { useState } from 'react';
import { Eye, Search, FileSpreadsheet } from 'lucide-react';

type AuditLog = any;

export default function AuditClient({ logs }: { logs: AuditLog[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredLogs = logs.filter((log: any) => 
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
    log.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const exportAuditData = () => {
    const header = "Timestamp,User,Module,Action,Details,IP_Address\n";
    const rows = filteredLogs.map((l: any) => 
      `"${new Date(l.timestamp).toISOString()}","${l.user?.name || 'System'}","${l.module}","${l.action}","${l.details || ''}","${l.ipAddress || ''}"`
    ).join("\n");
    
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_audit_trail_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-200">
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by action, module, or details..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
          />
        </div>
        <button onClick={exportAuditData} className="flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Logs
        </button>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Timestamp</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Actor / User</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Module</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Action Taken</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-500 font-sans">No audit logs found matching criteria.</td></tr>
            ) : (
              filteredLogs.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap py-3 pl-4 pr-3 text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-blue-700 font-bold">{log.user?.name || 'System / Batch'}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-gray-900">{log.module}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-gray-900">{log.action}</td>
                  <td className="px-3 py-3 text-gray-600 max-w-sm truncate" title={log.details}>{log.details || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
