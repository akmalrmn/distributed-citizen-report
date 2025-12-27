import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getReportById,
  Report,
  getCategoryLabel,
  getStatusLabel,
  getStatusColor,
} from '../api/reports';

export function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchReport(id);
    }
  }, [id]);

  const fetchReport = async (reportId: string) => {
    setLoading(true);
    try {
      const response = await getReportById(reportId);
      setReport(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          {error || 'Report not found'}
        </div>
        <Link to="/" className="text-blue-600 hover:underline">
          Back to reports
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to reports
      </Link>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold text-gray-800">{report.title}</h1>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
              report.status
            )}`}
          >
            {getStatusLabel(report.status)}
          </span>
        </div>

        <div className="flex gap-4 mb-6">
          <span className="bg-gray-100 px-3 py-1 rounded text-sm">
            {getCategoryLabel(report.category)}
          </span>
          <span className="bg-gray-100 px-3 py-1 rounded text-sm capitalize">
            {report.visibility}
          </span>
        </div>

        <div className="prose max-w-none mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Description</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{report.description}</p>
        </div>

        {report.department_name && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Assigned Department
            </h3>
            <p className="text-blue-600 font-medium">{report.department_name}</p>
          </div>
        )}

        {(report.location_lat && report.location_lng) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Location</h3>
            <p className="text-gray-600">
              Coordinates: {report.location_lat}, {report.location_lng}
            </p>
            {report.location_address && (
              <p className="text-gray-600">{report.location_address}</p>
            )}
          </div>
        )}

        <div className="border-t pt-4 mt-6">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
            <div>
              <span className="font-medium">Created:</span>{' '}
              {formatDate(report.created_at)}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span>{' '}
              {formatDate(report.updated_at)}
            </div>
            <div>
              <span className="font-medium">Report ID:</span>{' '}
              <code className="bg-gray-100 px-1 rounded">{report.id}</code>
            </div>
            <div>
              <span className="font-medium">Upvotes:</span> {report.upvote_count}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
