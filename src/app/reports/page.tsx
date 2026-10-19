import { FileText, BarChart3, TrendingUp } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold leading-6 text-gray-900">Reports & Analytics</h1>
          <p className="mt-2 text-sm text-gray-700">
            Comprehensive dashboards for hospital performance, financial health, and clinical outcomes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200">
          <div className="p-6">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Patient Demographics</h3>
            <p className="text-sm text-gray-500 mt-2">Analysis of patient age, gender, and geographic distribution across all departments.</p>
            <span className="mt-4 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Report not configured</span>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200">
          <div className="p-6">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-green-600 mb-4">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Financial Revenue</h3>
            <p className="text-sm text-gray-500 mt-2">Monthly breakdown of billed services, insurance claims, and outstanding payments.</p>
            <span className="mt-4 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Report not configured</span>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-xl ring-1 ring-gray-200">
          <div className="p-6">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Clinical Outcomes</h3>
            <p className="text-sm text-gray-500 mt-2">AI-generated summary of treatment efficacy, readmission rates, and average recovery times.</p>
            <span className="mt-4 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Report not configured</span>
          </div>
        </div>
      </div>
    </div>
  );
}
