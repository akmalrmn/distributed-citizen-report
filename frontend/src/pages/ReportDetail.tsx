import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getReportById,
  Report,
  Attachment,
  getCategoryLabel,
  getStatusLabel,
  getStatusColor,
} from '../api/reports';

const API_URL = import.meta.env.VITE_API_URL || '';

export function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (attachment: Attachment): boolean => {
    return attachment.mime_type.startsWith('image/');
  };

  const getFileUrl = (attachment: Attachment): string => {
    return `${API_URL}${attachment.file_path}`;
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

        {report.attachments && report.attachments.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              Attachments ({report.attachments.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {report.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="border rounded-lg overflow-hidden bg-gray-50"
                >
                  {isImage(attachment) ? (
                    <div
                      className="cursor-pointer"
                      onClick={() => setLightboxImage(getFileUrl(attachment))}
                    >
                      <img
                        src={getFileUrl(attachment)}
                        alt={attachment.filename}
                        className="w-full h-32 object-cover hover:opacity-90 transition-opacity"
                      />
                    </div>
                  ) : (
                    <div className="h-32 bg-red-50 flex items-center justify-center">
                      <div className="text-center">
                        <svg
                          className="mx-auto h-10 w-10 text-red-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-xs font-medium text-red-600 mt-1">PDF</span>
                      </div>
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {attachment.filename}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">
                        {formatFileSize(attachment.file_size)}
                      </span>
                      <a
                        href={getFileUrl(attachment)}
                        download={attachment.filename}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
            {report.reporter_username && <div>
              <span className="font-medium">Reporter Name:</span>{' '}
              {report.reporter_username}
            </div>}
            <div>
              <span className="font-medium">Upvotes:</span> {report.upvote_count}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox for images */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <img
              src={lightboxImage}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
