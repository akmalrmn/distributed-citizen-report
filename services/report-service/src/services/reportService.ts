import { pool } from '../db/connection';
import { publishReportCreated, publishReportStatusChanged } from './messagePublisher';

export interface CreateReportDto {
  title: string;
  description: string;
  category: 'crime' | 'cleanliness' | 'health' | 'infrastructure' | 'other';
  visibility: 'public' | 'private' | 'anonymous';
  reporterId?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

export interface GetReportsOptions {
  page: number;
  limit: number;
  status?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetPrivateReportsOptions {
  page: number;
  limit: number;
  reporterId: string;
  role: string;
  status?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface Attachment {
  id: string;
  report_id: string;
  filename: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: Date;
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
  upvote_count: number;
  created_at: Date;
  updated_at: Date;
  attachments?: Attachment[];
}

export async function createReport(dto: CreateReportDto): Promise<Report> {
  const { title, description, category, visibility, reporterId, location } = dto;

  const result = await pool.query(
    `INSERT INTO reports (
      title, description, category, visibility, reporter_id,
      location_lat, location_lng, location_address
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      title,
      description,
      category,
      visibility,
      reporterId,
      location?.lat || null,
      location?.lng || null,
      location?.address || null
    ]
  );

  const report = result.rows[0];

  // Publish to RabbitMQ for routing to appropriate department
  await publishReportCreated({
    reportId: report.id,
    category: report.category,
    title: report.title,
    description: report.description,
    visibility: report.visibility,
    location: location ? { lat: location.lat, lng: location.lng } : undefined
  });

  return report;
}

export async function getReports(opts: GetReportsOptions): Promise<{
  data: Report[];
  page: number;
  limit: number;
  total: number;
}> {
  const { page, limit, status, category, sortBy = 'created_at', sortOrder = 'desc' } = opts;
  const offset = (page - 1) * limit;

  // Build dynamic query
  let query = 'SELECT * FROM reports WHERE visibility = $1';
  let countQuery = 'SELECT COUNT(*) FROM reports WHERE visibility = $1';
  const params: (string | number)[] = ['public'];
  const countParams: string[] = ['public'];

  if (status) {
    params.push(status);
    countParams.push(status);
    query += ` AND status = $${params.length}`;
    countQuery += ` AND status = $${countParams.length}`;
  }

  if (category) {
    params.push(category);
    countParams.push(category);
    query += ` AND category = $${params.length}`;
    countQuery += ` AND category = $${countParams.length}`;
  }

  // Validate sortBy to prevent SQL injection
  const validSortColumns = ['created_at', 'updated_at', 'title', 'status', 'upvote_count'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  query += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;
  query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const [dataResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, countParams)
  ]);

  return {
    data: dataResult.rows,
    page,
    limit,
    total: parseInt(countResult.rows[0].count, 10)
  };
}

export async function getPrivateReports(opts: GetPrivateReportsOptions): Promise<{
  data: Report[];
  page: number;
  limit: number;
  total: number;
}> {
  const { page, limit, reporterId, role, status, category, sortBy = 'created_at', sortOrder = 'desc' } = opts;
  const offset = (page - 1) * limit;

  let query: string;
  let countQuery: string;
  let params: (string | number)[];
  let countParams: (string | number)[];

  // Build dynamic query
  if (role === 'Warga') {
    query = 'SELECT * FROM reports WHERE (visibility = $1 OR visibility = $3) AND reporter_id = $2';
    countQuery = 'SELECT COUNT(*) FROM reports WHERE (visibility = $1 OR visibility = $3) AND reporter_id = $2'
    params = ['private', reporterId, 'anonymous'];
    countParams = ['private', reporterId, 'anonymous'];
  } else {
    const roleIdentifier: string[] = role.split(' ');
    const department: string = roleIdentifier[1].toLowerCase();
    query = 'SELECT * FROM reports WHERE category = $1 AND (visibility = $2 OR visibility = $3)';
    countQuery = 'SELECT COUNT(*) FROM reports WHERE category = $1 AND (visibility = $2 OR visibility = $3)';
    params = [department, 'private', 'anonymous'];
    countParams = [department, 'private', 'anonymous'];
  }

  if (status) {
    params.push(status);
    countParams.push(status);
    query += ` AND status = $${params.length}`;
    countQuery += ` AND status = $${countParams.length}`;
  }

  if (category) {
    params.push(category);
    countParams.push(category);
    query += ` AND category = $${params.length}`;
    countQuery += ` AND category = $${countParams.length}`;
  }

  // Validate sortBy to prevent SQL injection
  const validSortColumns = ['created_at', 'updated_at', 'title', 'status', 'upvote_count'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  query += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;
  query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const [dataResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, countParams)
  ]);

  return {
    data: dataResult.rows,
    page,
    limit,
    total: parseInt(countResult.rows[0].count, 10)
  };
}

export async function getReportById(id: string, currentUserId?: string): Promise<any | null> {
  const result = await pool.query(
    `SELECT 
        r.*,
        CASE 
          WHEN r.visibility = 'anonymous' AND (r.reporter_id != $2 OR $2 IS NULL) THEN NULL 
          ELSE r.reporter_id 
        END as reporter_id,
        CASE 
          WHEN r.visibility = 'anonymous' AND (r.reporter_id != $2 OR $2 IS NULL) THEN 'Anonymous'
          ELSE a.username 
        END as reporter_username,
        d.name as department_name, 
        d.code as department_code
     FROM reports r
     LEFT JOIN departments d ON r.assigned_department_id = d.id
     LEFT JOIN accounts a ON r.reporter_id = a.id
     WHERE r.id = $1`,
    [id, currentUserId]
  );

  return result.rows[0] || null;
}

export async function updateReportStatus(
  id: string,
  newStatus: string,
  changedBy?: string,
  notes?: string
): Promise<Report | null> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current report
    const currentResult = await client.query(
      'SELECT * FROM reports WHERE id = $1',
      [id]
    );

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const currentReport = currentResult.rows[0];
    const oldStatus = currentReport.status;

    // Update report status
    const updateResult = await client.query(
      `UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newStatus, id]
    );

    // Record status change in history
    await client.query(
      `INSERT INTO report_status_history (report_id, old_status, new_status, changed_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, oldStatus, newStatus, changedBy || null, notes || null]
    );

    await client.query('COMMIT');

    const updatedReport = updateResult.rows[0];

    // Publish status change event
    await publishReportStatusChanged({
      reportId: id,
      oldStatus,
      newStatus,
      reporterId: currentReport.reporter_id
    });

    return updatedReport;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getDepartments(): Promise<Array<{ id: string; name: string; code: string }>> {
  const result = await pool.query('SELECT id, name, code FROM departments ORDER BY name');
  return result.rows;
}

export async function createReportAttachments(
  reportId: string,
  files: Array<{
    filename: string;
    storedFilename: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
  }>
): Promise<Attachment[]> {
  if (files.length === 0) return [];

  const values: (string | number)[] = [];
  const placeholders: string[] = [];

  files.forEach((file, index) => {
    const offset = index * 5;
    placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
    values.push(
      reportId,
      file.filename,
      file.storedFilename,
      file.filePath,
      file.fileSize,
      file.mimeType
    );
  });

  const result = await pool.query(
    `INSERT INTO report_attachments (report_id, filename, stored_filename, file_path, file_size, mime_type)
     VALUES ${placeholders.join(', ')}
     RETURNING *`,
    values
  );

  return result.rows;
}

export async function getReportAttachments(reportId: string): Promise<Attachment[]> {
  const result = await pool.query(
    'SELECT * FROM report_attachments WHERE report_id = $1 ORDER BY created_at',
    [reportId]
  );
  return result.rows;
}
