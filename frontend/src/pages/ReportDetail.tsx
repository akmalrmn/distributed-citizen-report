import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getReportById,
  Report,
  Attachment,
  getCategoryLabel,
  getStatusLabel,
  getStatusColor,
  upvoteReport,
  removeUpvote,
  updateReport,
  updateReportStatus,
  cancelReport,
} from '../api/reports';
import { useUser } from '../context/UserContext';

const API_URL = import.meta.env.VITE_API_URL || '';

export function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: 'other',
  });
  const [statusForm, setStatusForm] = useState({
    status: '',
    notes: ''
  });
  const { user } = useUser();

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
      setEditForm({
        title: response.data.title,
        description: response.data.description,
        category: response.data.category,
      });
      setStatusForm({
        status: response.data.status,
        notes: ''
      });
      setIsEditing(false);
      setError(null);
      setActionError(null);
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

  const canEdit = report?.is_owner && ['submitted', 'routed'].includes(report.status);
  const canCancel = report?.is_owner && ['submitted', 'routed', 'in_progress'].includes(report.status);
  const canUpdateStatus = user?.role?.startsWith('Department ') || user?.role === 'Admin';

  const handleUpvote = async () => {
    if (!report) return;
    try {
      if (report.has_upvoted) {
        const response = await removeUpvote(report.id);
        setReport({
          ...report,
          upvote_count: response.data.upvote_count,
          has_upvoted: false,
        });
        setActionError(null);
      } else {
        const response = await upvoteReport(report.id);
        setReport({
          ...report,
          upvote_count: response.data.upvote_count,
          has_upvoted: true,
        });
        setActionError(null);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update upvote');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;
    try {
      const response = await updateReport(report.id, {
        title: editForm.title,
        description: editForm.description,
        category: editForm.category,
      });
      setReport({
        ...report,
        title: response.data.title,
        description: response.data.description,
        category: response.data.category,
        updated_at: response.data.updated_at,
      });
      setIsEditing(false);
      setActionError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update report');
    }
  };

  const handleCancelReport = async () => {
    if (!report) return;
    try {
      const response = await cancelReport(report.id);
      setReport({
        ...report,
        status: response.data.status,
        updated_at: response.data.updated_at,
      });
      setActionError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel report');
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;
    if (!statusForm.status) {
      setActionError('Please select a status');
      return;
    }

    try {
      const response = await updateReportStatus(
        report.id,
        statusForm.status,
        statusForm.notes.trim() || undefined
      );
      setReport({
        ...report,
        status: response.data.status,
        updated_at: response.data.updated_at,
      });
      setStatusForm({
        status: response.data.status,
        notes: ''
      });
      setActionError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update report status');
    }
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

        <div className="flex gap-4 mb-4">
          <span className="bg-gray-100 px-3 py-1 rounded text-sm">
            {getCategoryLabel(report.category)}
          </span>
          <span className="bg-gray-100 px-3 py-1 rounded text-sm capitalize">
            {report.visibility}
          </span>
        </div>

        {actionError && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {actionError}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-6">
          {report.visibility === 'public' && (
            <>
              <button
                onClick={handleUpvote}
                className={`px-3 py-1 rounded-md border ${
                  report.has_upvoted ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300'
                }`}
              >
                {report.has_upvoted ? 'Upvoted' : 'Upvote'}
              </button>
              <span className="text-sm text-gray-600">Upvotes: {report.upvote_count}</span>
            </>
          )}
          {canEdit && (
            <button
              onClick={() => setIsEditing((prev) => !prev)}
              className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              {isEditing ? 'Close Edit' : 'Edit'}
            </button>
          )}
          {canCancel && (
            <button
              onClick={handleCancelReport}
              className="px-3 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50"
            >
              Cancel Report
            </button>
          )}
        </div>

        {canUpdateStatus && (
          <form onSubmit={handleStatusSubmit} className="bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Update Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="submitted">Submitted</option>
                  <option value="routed">Routed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="escalated">Escalated</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Optional notes for the status change"
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Update Status
              </button>
            </div>
          </form>
        )}

        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={4}
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={editForm.category}
                onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="crime">Crime</option>
                <option value="cleanliness">Cleanliness</option>
                <option value="health">Health</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({
                    title: report.title,
                    description: report.description,
                    category: report.category,
                  });
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="prose max-w-none mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{report.description}</p>
          </div>
        )}

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

        {(report.location_address || report.location_lat !== null || report.location_lng !== null) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Location</h3>
            {(report.location_lat !== null && report.location_lng !== null) && (
              <p className="text-gray-600">
                Coordinates: {report.location_lat}, {report.location_lng}
              </p>
            )}
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
