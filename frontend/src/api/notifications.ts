const API_URL = import.meta.env.VITE_API_URL || '';
const NOTIFICATION_URL = import.meta.env.VITE_NOTIFICATION_URL || API_URL;

export interface Notification {
  id: string;
  report_id: string | null;
  notification_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  unreadCount: number;
}

export async function getNotifications(params?: { status?: 'all' | 'unread'; limit?: number }): Promise<NotificationsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const url = `${NOTIFICATION_URL}/api/notifications${searchParams.toString() ? `?${searchParams}` : ''}`;
  const response = await fetch(url, { credentials: 'include' });

  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }

  return response.json();
}

export async function markNotificationRead(id: string): Promise<void> {
  const response = await fetch(`${NOTIFICATION_URL}/api/notifications/${id}/read`, {
    method: 'PATCH',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to update notification');
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const response = await fetch(`${NOTIFICATION_URL}/api/notifications/read-all`, {
    method: 'POST',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to update notifications');
  }
}
