import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, markAllNotificationsRead, markNotificationRead, Notification } from '../api/notifications';

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const result = await getNotifications({ status: 'all', limit: 50 });
      setNotifications(result.data);
      setError(null);
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      await fetchNotifications();
      setError(null);
    } catch {
      setError('Failed to mark notifications as read');
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
      );
      setError(null);
    } catch {
      setError('Failed to mark notification as read');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
        <button
          onClick={handleMarkAllRead}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Mark all as read
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-6">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-500">No notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white p-4 rounded-lg shadow-sm border ${
                notification.is_read ? 'border-gray-200' : 'border-blue-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-gray-800 ${notification.is_read ? '' : 'font-semibold'}`}>
                    {notification.message}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{formatDate(notification.created_at)}</p>
                  {notification.report_id && (
                    <Link
                      to={`/report/${notification.report_id}`}
                      className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                    >
                      View report
                    </Link>
                  )}
                </div>
                {!notification.is_read && (
                  <button
                    onClick={() => handleMarkRead(notification.id)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
