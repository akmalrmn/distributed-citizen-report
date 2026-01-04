import { useEffect, useState } from 'react';
import { DepartmentSummary, exportReports, getDepartmentSummary } from '../api/reports';

export function AuthorityDashboard() {
  const [summary, setSummary] = useState<DepartmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await getDepartmentSummary();
      setSummary(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard');
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
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          {error || 'Dashboard unavailable'}
        </div>
      </div>
    );
  }

  const statusEntries = Object.entries(summary.statusCounts);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Department Dashboard</h1>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Over SLA</p>
          <p className="text-2xl font-semibold text-red-600">{summary.openOverSla}</p>
          <p className="text-xs text-gray-400 mt-1">SLA: {summary.slaHours} hours</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Average Open Age (hrs)</p>
          <p className="text-2xl font-semibold text-blue-600">{summary.averageOpenAgeHours}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Total Status Buckets</p>
          <p className="text-2xl font-semibold text-gray-700">{statusEntries.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Status Breakdown</h2>
        {statusEntries.length === 0 ? (
          <p className="text-gray-500">No reports yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {statusEntries.map(([status, count]) => (
              <div key={status} className="flex justify-between items-center border rounded px-3 py-2">
                <span className="text-gray-600 capitalize">{status.replace('_', ' ')}</span>
                <span className="font-semibold text-gray-800">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
