import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminDepartmentSummaryItem, exportReports, getAdminDepartmentSummary, getCategoryLabel, getEscalatedReports, Report, getStatusLabel, getStatusColor } from '../api/reports';

function getDepartmentLabel(category: string): string {
  const mapping: Record<string, string> = {
    crime: 'Police Department',
    cleanliness: 'Cleanliness Department',
    health: 'Health Department',
    infrastructure: 'Infrastructure Department',
    other: 'General Affairs'
  };
  return mapping[category] || getCategoryLabel(category);
}

export function AdminDashboard() {
  const [summary, setSummary] = useState<AdminDepartmentSummaryItem[]>([]);
  const [escalatedReports, setEscalatedReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const [summaryResponse, escalatedResponse] = await Promise.all([
        getAdminDepartmentSummary(),
        getEscalatedReports({ page: 1, limit: 5 })
      ]);
      setSummary(summaryResponse.data);
      setEscalatedReports(escalatedResponse.data);
      setError(null);
    } catch (err) {
      setError('Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { blob, filename } = await exportReports();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportError(null);
    } catch (err) {
      setExportError('Failed to export reports');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Admin Overview</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-60"
          >
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <button
            onClick={fetchSummary}
            className="bg-gray-100 px-4 py-2 rounded hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {exportError && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-6">{exportError}</div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Department Progress</h2>
        {summary.length === 0 ? (
          <p className="text-gray-500">No reports yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Department</th>
                  <th className="px-3 py-2 font-medium">Submitted</th>
                  <th className="px-3 py-2 font-medium">In Progress</th>
                  <th className="px-3 py-2 font-medium">Resolved</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((item) => {
                  const total = item.submitted + item.in_progress + item.resolved;
                  return (
                    <tr key={item.category} className="border-t">
                      <td className="px-3 py-2 text-gray-700">
                        {getDepartmentLabel(item.category)}
                      </td>
                      <td className="px-3 py-2">{item.submitted}</td>
                      <td className="px-3 py-2">{item.in_progress}</td>
                      <td className="px-3 py-2">{item.resolved}</td>
                      <td className="px-3 py-2 font-semibold">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Escalated Reports</h2>
        {escalatedReports.length === 0 ? (
          <p className="text-gray-500">No escalated reports.</p>
        ) : (
          <div className="space-y-3">
            {escalatedReports.map((report) => (
              <div key={report.id} className="flex items-start justify-between border rounded px-3 py-2">
                <div>
                  <Link to={`/report/${report.id}`} className="font-medium text-blue-600 hover:underline">
                    {report.title}
                  </Link>
                  <p className="text-sm text-gray-500">{getCategoryLabel(report.category)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(report.status)}`}>
                  {getStatusLabel(report.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
