import { Router, Request, Response } from 'express';
import { createReport, getReports, getReportById, updateReportStatus, createReportAttachments, getReportAttachments, getPrivateReports } from '../services/reportService';
import { upload, UPLOAD_DIR } from '../services/uploadConfig';
import path from 'path';
import express from 'express';

export const reportRoutes = Router();

reportRoutes.use('/uploads', express.static(UPLOAD_DIR));

// POST /api/reports - Create a new report with optional file attachments
reportRoutes.post('/', upload.array('files', 5), async (req: Request, res: Response) => {
  try {
    const { title, description, category, visibility, reporterId, location } = req.body;

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

    const reporter_actual = visibility !== 'anonymous' ? reporterId : ''

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
reportRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      status,
      category,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const reports = await getReports({
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
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

// GET /api/reports/private - Get all private reports with pagination and filtering
reportRoutes.get('/private', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      reporterId,
      role,
      status,
      category,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const reports = await getPrivateReports({
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      reporterId: reporterId as string,
      role: role as string,
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

// GET /api/reports/:id - Get a specific report by ID
reportRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.session?.userId;
    const report = await getReportById(id, currentUserId);

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

// PATCH /api/reports/:id/status - Update report status
reportRoutes.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, changedBy, notes } = req.body;

    const validStatuses = ['submitted', 'routed', 'in_progress', 'resolved', 'escalated'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        validStatuses
      });
    }

    const updatedReport = await updateReportStatus(id, status, changedBy, notes);

    if (!updatedReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

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
