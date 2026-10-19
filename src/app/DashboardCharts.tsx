'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area } from 'recharts';

export default function DashboardCharts({ showRevenue = true }: { showRevenue?: boolean }) {
  // Mock data for analytics
  const patientFlowData = [
    { name: 'Mon', ER: 12, Outpatient: 45, Admitted: 5 },
    { name: 'Tue', ER: 19, Outpatient: 52, Admitted: 8 },
    { name: 'Wed', ER: 15, Outpatient: 48, Admitted: 4 },
    { name: 'Thu', ER: 22, Outpatient: 61, Admitted: 9 },
    { name: 'Fri', ER: 28, Outpatient: 55, Admitted: 12 },
    { name: 'Sat', ER: 35, Outpatient: 30, Admitted: 15 },
    { name: 'Sun', ER: 30, Outpatient: 25, Admitted: 11 },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 45000, expenses: 32000 },
    { month: 'Feb', revenue: 52000, expenses: 34000 },
    { month: 'Mar', revenue: 48000, expenses: 33000 },
    { month: 'Apr', revenue: 61000, expenses: 36000 },
    { month: 'May', revenue: 59000, expenses: 35000 },
    { month: 'Jun', revenue: 65000, expenses: 38000 },
  ];

  return (
    <div className={`grid grid-cols-1 gap-6 mt-6 mb-6 ${showRevenue ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
      
      {/* Patient Flow Chart */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-5">
        <div className="mb-4 flex items-start justify-between gap-3"><h3 className="text-base font-semibold leading-6 text-gray-900">Weekly Patient Flow</h3><span className="text-[10px] text-slate-400">Illustrative demo data</span></div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={patientFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorER" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontSize: '13px' }}
                labelStyle={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="Outpatient" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorOut)" />
              <Area type="monotone" dataKey="ER" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorER)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Financial Health Chart */}
      {showRevenue && <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-5">
        <div className="mb-4 flex items-start justify-between gap-3"><h3 className="text-base font-semibold leading-6 text-gray-900">Financial Health (YTD)</h3><span className="text-[10px] text-slate-400">Illustrative demo data</span></div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `SLe ${value/1000}k`} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [`SLe ${Number(value).toLocaleString()}`, undefined]}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
              <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>}

    </div>
  );
}
