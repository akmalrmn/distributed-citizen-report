import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getNotificationsForUser, markAllNotificationsRead, markNotificationRead } from '../services/notificationService';

export const notificationRoutes = Router();

// GET /api/notifications - List notifications for current user
notificationRoutes.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { status = 'all', limit = '20' } = req.query;

    const parsedLimit = parseInt(limit as string, 10);
    const safeLimit = Number.isFinite(parsedLimit) ? parsedLimit : 20;

    const result = await getNotificationsForUser(req.session.userId as string, {
      status: status === 'unread' ? 'unread' : 'all',
      limit: safeLimit
    });

    res.json({
      success: true,
      data: result.data,
      unreadCount: result.unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read - Mark one notification as read
notificationRoutes.patch('/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await markNotificationRead(id, req.session.userId as string);

    if (!updated) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// POST /api/notifications/read-all - Mark all notifications as read
notificationRoutes.post('/read-all', requireAuth, async (req: Request, res: Response) => {
  try {
    await markAllNotificationsRead(req.session.userId as string);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});
