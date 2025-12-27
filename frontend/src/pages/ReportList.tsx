import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getReports,
  Report,
  getCategoryLabel,
  getStatusLabel,
  getStatusColor,
} from '../api/reports';

export function ReportList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchReports();
  }, [page, categoryFilter, statusFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await getReports({
        page,
        limit: 10,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
      });
      setReports(response.data);
      setTotalPages(response.pagination.totalPages);
      setError(null);
    } catch (err) {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Public Reports</h1>
        <Link
          to="/submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          + New Report
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="border rounded px-3 py-1"
          >
            <option value="">All Categories</option>
            <option value="crime">Crime</option>
            <option value="cleanliness">Cleanliness</option>
            <option value="health">Health</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border rounded px-3 py-1"
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="routed">Routed</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <button
          onClick={fetchReports}
          className="self-end bg-gray-100 px-4 py-1 rounded hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-6">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-500">No reports found</p>
          <Link to="/submit" className="text-blue-600 hover:underline">
            Submit the first report
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {reports.map((report) => (
              <Link
                key={report.id}
                to={`/report/${report.id}`}
                className="block bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-800 mb-1">
                      {report.title}
                    </h2>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {report.description}
                    </p>
                  </div>
                  <span
                    className={`ml-4 px-2 py-1 text-xs rounded-full ${getStatusColor(
                      report.status
                    )}`}
                  >
                    {getStatusLabel(report.status)}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                  <span className="bg-gray-100 px-2 py-0.5 rounded">
                    {getCategoryLabel(report.category)}
                  </span>
                  <span>{formatDate(report.created_at)}</span>
                  {report.department_name && (
                    <span className="text-blue-600">
                      Assigned to: {report.department_name}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white rounded border disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white rounded border disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
