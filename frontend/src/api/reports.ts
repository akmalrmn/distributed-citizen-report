const API_URL = import.meta.env.VITE_API_URL || '';

export interface Attachment {
  id: string;
  report_id: string;
  filename: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string | null;
  title: string;
  description: string;
  category: string;
  visibility: string;
  status: string;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  assigned_department_id: string | null;
  department_name?: string;
  department_code?: string;
  upvote_count: number;
  created_at: string;
  updated_at: string;
  reporter_username?: string;
  attachments?: Attachment[];
  has_upvoted?: boolean;
  is_owner?: boolean;
}

export interface CreateReportData {
  title: string;
  description: string;
  category: string;
  visibility: string;
  reporter_id: string
  location?: {
    lat?: number;
    lng?: number;
    address?: string;
  };
  files?: File[];
}

export interface ReportsResponse {
  success: boolean;
  data: Report[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReportResponse {
  success: boolean;
  data: Report;
  message?: string;
}

export async function createReport(data: CreateReportData): Promise<ReportResponse> {
  const formData = new FormData();
  
  formData.append('title', data.title);
  formData.append('description', data.description);
  formData.append('category', data.category);
  formData.append('visibility', data.visibility);
  formData.append('reporterId', data.reporter_id);
  
  if (data.location) {
    formData.append('location', JSON.stringify(data.location));
  }
  
  // Append files if present
  if (data.files && data.files.length > 0) {
    data.files.forEach(file => {
      formData.append('files', file);
    });
  }

  const response = await fetch(`${API_URL}/api/reports`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create report');
  }

  return response.json();
}

export async function getReports(params?: {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
}): Promise<ReportsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.status) searchParams.set('status', params.status);
  if (params?.category) searchParams.set('category', params.category);

  const url = `${API_URL}/api/reports${searchParams.toString() ? `?${searchParams}` : ''}`;

  const response = await fetch(url, { credentials: 'include' });

  if (!response.ok) {
    throw new Error('Failed to fetch reports');
  }

  return response.json();
}

export async function getPrivateReports(params?: {
  page?: number;
  limit?: number;
  reporterId?: string;
  role?: string;
  status?: string;
  category?: string;
}): Promise<ReportsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.reporterId) searchParams.set('reporterId', params.reporterId);
  if (params?.role) searchParams.set('role', params.role);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.category) searchParams.set('category', params.category);

  const url = `${API_URL}/api/reports/private${searchParams.toString() ? `?${searchParams}` : ''}`;

  const response = await fetch(url, { credentials: 'include' });

  if (!response.ok) {
    throw new Error('Failed to fetch reports');
  }

  return response.json();
}

export async function getReportById(id: string): Promise<ReportResponse> {
  const response = await fetch(`${API_URL}/api/reports/${id}`, { credentials: 'include' });

  if (!response.ok) {
    throw new Error('Failed to fetch report');
  }

  return response.json();
}

export async function upvoteReport(id: string): Promise<ReportResponse> {
  const response = await fetch(`${API_URL}/api/reports/${id}/upvote`, {
    method: 'POST',
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upvote report');
  }

  return response.json();
}

export async function removeUpvote(id: string): Promise<ReportResponse> {
  const response = await fetch(`${API_URL}/api/reports/${id}/upvote`, {
    method: 'DELETE',
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove upvote');
  }

  return response.json();
}

export async function updateReport(id: string, data: Partial<CreateReportData>): Promise<ReportResponse> {
  const response = await fetch(`${API_URL}/api/reports/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update report');
  }

  return response.json();
}

export async function cancelReport(id: string, notes?: string): Promise<ReportResponse> {
  const response = await fetch(`${API_URL}/api/reports/${id}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({ notes })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel report');
  }

  return response.json();
}

export async function updateReportStatus(id: string, status: string, notes?: string): Promise<ReportResponse> {
  const response = await fetch(`${API_URL}/api/reports/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({ status, notes })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update report status');
  }

  return response.json();
}

export interface DepartmentSummary {
  statusCounts: Record<string, number>;
  openOverSla: number;
  averageOpenAgeHours: number;
  slaHours: number;
}

export async function getDepartmentSummary(): Promise<{ success: boolean; data: DepartmentSummary }> {
  const response = await fetch(`${API_URL}/api/reports/department/summary`, { credentials: 'include' });

  if (!response.ok) {
    throw new Error('Failed to fetch department summary');
  }

  return response.json();
}

export interface AdminDepartmentSummaryItem {
  category: string;
  submitted: number;
  in_progress: number;
  resolved: number;
}

export async function getAdminDepartmentSummary(): Promise<{ success: boolean; data: AdminDepartmentSummaryItem[] }> {
  const response = await fetch(`${API_URL}/api/reports/admin/summary`, { credentials: 'include' });

  if (!response.ok) {
    throw new Error('Failed to fetch admin summary');
  }

  return response.json();
}

export async function getEscalatedReports(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<ReportsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const url = `${API_URL}/api/reports/admin/escalated${searchParams.toString() ? `?${searchParams}` : ''}`;
  const response = await fetch(url, { credentials: 'include' });

  if (!response.ok) {
    throw new Error('Failed to fetch escalated reports');
  }

  return response.json();
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    crime: 'Crime',
    cleanliness: 'Cleanliness',
    health: 'Health',
    infrastructure: 'Infrastructure',
    other: 'Other',
  };
  return labels[category] || category;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    submitted: 'Submitted',
    routed: 'Routed',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    escalated: 'Escalated',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    submitted: 'bg-yellow-100 text-yellow-800',
    routed: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    resolved: 'bg-green-100 text-green-800',
    escalated: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-200 text-gray-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
