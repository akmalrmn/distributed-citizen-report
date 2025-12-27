const API_URL = import.meta.env.VITE_API_URL || '';

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
}

export interface CreateReportData {
  title: string;
  description: string;
  category: string;
  visibility: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
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
  const response = await fetch(`${API_URL}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
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

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch reports');
  }

  return response.json();
}

export async function getReportById(id: string): Promise<ReportResponse> {
  const response = await fetch(`${API_URL}/api/reports/${id}`);

  if (!response.ok) {
    throw new Error('Failed to fetch report');
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
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
