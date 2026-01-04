import { Router, Request, Response } from 'express';
import { createReport, getReports, getReportById, updateReportStatus, createReportAttachments, getReportAttachments, getPrivateReports, getReportAccessInfo, getAttachmentByStoredFilename, addUpvote, removeUpvote, updateReport, isReportOwner, getDepartmentSummary, getAdminDepartmentSummary, getEscalatedReports } from '../services/reportService';
import { upload, UPLOAD_DIR } from '../services/uploadConfig';
import path from 'path';
import { requireAuth, requireAdmin, requireDepartmentOrAdmin, requireDepartmentRole } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import { getDepartmentCategoryFromRole, isAdminRole } from '../utils/role';
import { logAuditEvent } from '../services/auditLog';

export const reportRoutes = Router();

reportRoutes.get('/uploads/:filename', requireAuth, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const attachment = await getAttachmentByStoredFilename(filename);

    if (!attachment) {
      return res.status(404).json({ error: 'File not found' });
    }

    const report = await getReportById(attachment.report_id, {
      userId: req.session.userId,
      role: req.session.role
    });

    if (!report) {
      return res.status(404).json({ error: 'File not found' });
    }

    return res.sendFile(path.join(UPLOAD_DIR, attachment.stored_filename));
  } catch (error) {
    console.error('Error fetching attachment:', error);
    res.status(500).json({ error: 'Failed to fetch attachment' });
  }
});

const reportCreateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many report submissions, try again later'
});

const statusUpdateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many status updates, try again later'
});

const upvoteLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many upvote requests, try again later'
});

// POST /api/reports - Create a new report with optional file attachments
reportRoutes.post('/', requireAuth, reportCreateLimiter, upload.array('files', 5), async (req: Request, res: Response) => {
  try {
    const { title, description, category, visibility, location } = req.body;
    const reporterId = req.session.userId;

    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'description', 'category']
      });
    }

    // Validate category
    const validCategories = ['crime', 'cleanliness', 'health', 'infrastructure', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        validCategories
      });
    }

    // Validate visibility if provided
    const validVisibilities = ['public', 'private', 'anonymous'];
    if (visibility && !validVisibilities.includes(visibility)) {
      return res.status(400).json({
        error: 'Invalid visibility',
        validVisibilities
      });
    }

    // Parse location if it's a string (from FormData)
    let parsedLocation = location;
    if (typeof location === 'string') {
      try {
        parsedLocation = JSON.parse(location);
      } catch {
        parsedLocation = undefined;
      }
    }

    const report = await createReport({
      title,
      description,
      category,
      visibility: visibility || 'public',
      reporterId,
      location: parsedLocation
    });

    // Handle file attachments if present
    const files = req.files as Express.Multer.File[] | undefined;
    let attachments: Awaited<ReturnType<typeof createReportAttachments>> = [];

    if (files && files.length > 0) {
      const fileData = files.map(file => ({
        filename: file.originalname,
        storedFilename: file.filename,
        filePath: `/api/reports/uploads/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype
      }));

      attachments = await createReportAttachments(report.id, fileData);
    }

    res.status(201).json({
      success: true,
      data: { ...report, attachments },
      message: 'Report created successfully'
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// GET /api/reports - Get all public reports with pagination and filtering
reportRoutes.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      status,
      category,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;
    const departmentCategory = getDepartmentCategoryFromRole(req.session.role);
    const isAdmin = isAdminRole(req.session.role);
    const effectiveCategory = !isAdmin && departmentCategory ? departmentCategory : (category as string | undefined);

    const reports = await getReports({
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      status: status as string | undefined,
      category: effectiveCategory,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      userId: req.session.userId
    });

    res.json({
      success: true,
      data: reports.data,
      pagination: {
        page: reports.page,
        limit: reports.limit,
        total: reports.total,
        totalPages: Math.ceil(reports.total / reports.limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/reports/department/summary - Summary for department dashboard
reportRoutes.get('/department/summary', requireAuth, requireDepartmentRole, async (req: Request, res: Response) => {
  try {
    const departmentCategory = getDepartmentCategoryFromRole(req.session.role);
    if (!departmentCategory) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const slaHours = parseInt(process.env.SLA_HOURS || '48', 10);
    const summary = await getDepartmentSummary(departmentCategory, slaHours);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching department summary:', error);
    res.status(500).json({ error: 'Failed to fetch department summary' });
  }
});

// GET /api/reports/admin/summary - Summary for admin dashboard
reportRoutes.get('/admin/summary', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const summary = await getAdminDepartmentSummary();

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching admin summary:', error);
    res.status(500).json({ error: 'Failed to fetch admin summary' });
  }
});

// GET /api/reports/admin/escalated - Escalated reports for admin
reportRoutes.get('/admin/escalated', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const reports = await getEscalatedReports({
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      userId: req.session.userId
    });

    res.json({
      success: true,
      data: reports.data,
      pagination: {
        page: reports.page,
        limit: reports.limit,
        total: reports.total,
        totalPages: Math.ceil(reports.total / reports.limit)
      }
    });
  } catch (error) {
    console.error('Error fetching escalated reports:', error);
    res.status(500).json({ error: 'Failed to fetch escalated reports' });
  }
});

// GET /api/reports/private - Get all private reports with pagination and filtering
reportRoutes.get('/private', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      status,
      category,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const reports = await getPrivateReports({
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      userId: req.session.userId as string,
      role: req.session.role || 'Warga',
      status: status as string | undefined,
      category: category as string | undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    res.json({
      success: true,
      data: reports.data,
      pagination: {
        page: reports.page,
        limit: reports.limit,
        total: reports.total,
        totalPages: Math.ceil(reports.total / reports.limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// POST /api/reports/:id/upvote - Upvote a report
reportRoutes.post('/:id/upvote', requireAuth, upvoteLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await getReportById(id, {
      userId: req.session.userId,
      role: req.session.role
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.visibility !== 'public') {
      return res.status(403).json({ error: 'Upvotes are only allowed for public reports' });
    }

    const updated = await addUpvote(id, req.session.userId as string);

    if (!updated) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      success: true,
      data: updated
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Already upvoted' });
    }
    if (error?.code === '23503') {
      return res.status(404).json({ error: 'Report not found' });
    }
    console.error('Error upvoting report:', error);
    res.status(500).json({ error: 'Failed to upvote report' });
  }
});

// DELETE /api/reports/:id/upvote - Remove an upvote
reportRoutes.delete('/:id/upvote', requireAuth, upvoteLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await getReportById(id, {
      userId: req.session.userId,
      role: req.session.role
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.visibility !== 'public') {
      return res.status(403).json({ error: 'Upvotes are only allowed for public reports' });
    }

    const updated = await removeUpvote(id, req.session.userId as string);

    if (!updated) {
      return res.status(404).json({ error: 'Upvote not found' });
    }

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error removing upvote:', error);
    res.status(500).json({ error: 'Failed to remove upvote' });
  }
});

// GET /api/reports/:id - Get a specific report by ID
reportRoutes.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await getReportById(id, {
      userId: req.session?.userId,
      role: req.session?.role
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Fetch attachments for this report
    const attachments = await getReportAttachments(id);

    res.json({
      success: true,
      data: { ...report, attachments }
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// PATCH /api/reports/:id - Edit report fields (owner only)
reportRoutes.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, category, location } = req.body;

    let parsedLocation = location;
    if (typeof location === 'string') {
      try {
        parsedLocation = JSON.parse(location);
      } catch {
        parsedLocation = undefined;
      }
    }

    if (parsedLocation === null) {
      parsedLocation = undefined;
    }

    if (parsedLocation && (typeof parsedLocation.lat !== 'number' || typeof parsedLocation.lng !== 'number')) {
      return res.status(400).json({ error: 'Invalid location' });
    }

    const isOwner = await isReportOwner(id, req.session.userId as string);
    if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const reportInfo = await getReportAccessInfo(id);
    if (!reportInfo) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (!['submitted', 'routed'].includes(reportInfo.status)) {
      return res.status(400).json({ error: 'Report cannot be edited in current status' });
    }

    const validCategories = ['crime', 'cleanliness', 'health', 'infrastructure', 'other'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        validCategories
      });
    }

    const updated = await updateReport(id, {
      title,
      description,
      category,
      location: parsedLocation
    });

    if (!updated) {
      return res.status(400).json({ error: 'No changes to update' });
    }

    await logAuditEvent({
      actorId: req.session.userId,
      action: 'report_update',
      targetType: 'report',
      targetId: id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// PATCH /api/reports/:id/cancel - Cancel report (owner only)
reportRoutes.patch('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const isOwner = await isReportOwner(id, req.session.userId as string);
    if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const reportInfo = await getReportAccessInfo(id);
    if (!reportInfo) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (!['submitted', 'routed', 'in_progress'].includes(reportInfo.status)) {
      return res.status(400).json({ error: 'Report cannot be cancelled in current status' });
    }

    const updatedReport = await updateReportStatus(id, 'cancelled', req.session.userId, notes);

    await logAuditEvent({
      actorId: req.session.userId,
      action: 'report_cancel',
      targetType: 'report',
      targetId: id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined
    });

    res.json({
      success: true,
      data: updatedReport,
      message: 'Report cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling report:', error);
    res.status(500).json({ error: 'Failed to cancel report' });
  }
});

// PATCH /api/reports/:id/status - Update report status
reportRoutes.patch('/:id/status', requireAuth, requireDepartmentOrAdmin, statusUpdateLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['submitted', 'routed', 'in_progress', 'resolved', 'escalated'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        validStatuses
      });
    }

    const reportInfo = await getReportAccessInfo(id);
    if (!reportInfo) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const isAdmin = isAdminRole(req.session.role);
    if (!isAdmin) {
      const departmentCategory = getDepartmentCategoryFromRole(req.session.role);
      if (!departmentCategory || reportInfo.category !== departmentCategory) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const updatedReport = await updateReportStatus(id, status, req.session.userId, notes);

    if (!updatedReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await logAuditEvent({
      actorId: req.session.userId,
      action: 'status_change',
      targetType: 'report',
      targetId: id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      metadata: {
        newStatus: status
      }
    });

    res.json({
      success: true,
      data: updatedReport,
      message: 'Report status updated successfully'
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ error: 'Failed to update report status' });
  }
});
