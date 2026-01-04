import { pool } from '../db/connection';
import { publishReportCreated, publishReportStatusChanged } from './messagePublisher';
import { getAnonReporterHash } from '../utils/anon';
import { getDepartmentCategoryFromRole, isAdminRole } from '../utils/role';

export interface CreateReportDto {
  title: string;
  description: string;
  category: 'crime' | 'cleanliness' | 'health' | 'infrastructure' | 'other';
  visibility: 'public' | 'private' | 'anonymous';
  reporterId?: string | null;
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
  userId?: string | null;
}

export interface GetPrivateReportsOptions {
  page: number;
  limit: number;
  userId: string;
  role: string;
  status?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateReportDto {
  title?: string;
  description?: string;
  category?: 'crime' | 'cleanliness' | 'health' | 'infrastructure' | 'other';
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
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
  department_name?: string;
  department_code?: string;
  reporter_username?: string;
  upvote_count: number;
  created_at: Date;
  updated_at: Date;
  attachments?: Attachment[];
  has_upvoted?: boolean;
  is_owner?: boolean;
}


export async function createReport(dto: CreateReportDto): Promise<Report> {
  const { title, description, category, visibility, reporterId, location } = dto;
  const client = await pool.connect();
  const storedReporterId = visibility === 'anonymous' ? null : (reporterId || null);

  try {
    await client.query('BEGIN');

    const result = await client.query(
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
        storedReporterId,
        location?.lat || null,
        location?.lng || null,
        location?.address || null
      ]
    );

    const report = result.rows[0];

    if (visibility === 'anonymous' && reporterId) {
      const reporterHash = getAnonReporterHash(reporterId);
      await client.query(
        `INSERT INTO anonymous_reporters (report_id, reporter_hash)
         VALUES ($1, $2)`,
        [report.id, reporterHash]
      );
    }

    await client.query('COMMIT');

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
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getReports(opts: GetReportsOptions): Promise<{
  data: Report[];
  page: number;
  limit: number;
  total: number;
}> {
  const { page, limit, status, category, sortBy = 'created_at', sortOrder = 'desc', userId } = opts;
  const offset = (page - 1) * limit;

  // Build dynamic query
  let query = 'FROM reports r WHERE r.visibility = $1';
  let countQuery = 'SELECT COUNT(*) FROM reports r WHERE r.visibility = $1';
  const params: (string | number)[] = ['public'];
  const countParams: (string | number)[] = ['public'];

  if (status) {
    params.push(status);
    countParams.push(status);
    query += ` AND r.status = $${params.length}`;
    countQuery += ` AND r.status = $${countParams.length}`;
  }

  if (category) {
    params.push(category);
    countParams.push(category);
    query += ` AND r.category = $${params.length}`;
    countQuery += ` AND r.category = $${countParams.length}`;
  }

  let selectClause = 'SELECT r.*, false as has_upvoted';
  if (userId) {
    params.push(userId);
    selectClause = `SELECT r.*, EXISTS (
      SELECT 1 FROM report_upvotes u WHERE u.report_id = r.id AND u.user_id = $${params.length}
    ) as has_upvoted`;
  }

  // Validate sortBy to prevent SQL injection
  const validSortColumns = ['created_at', 'updated_at', 'title', 'status', 'upvote_count'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  query = `${selectClause} ${query}`;
  query += ` ORDER BY r.${safeSortBy} ${safeSortOrder}`;
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
  const { page, limit, userId, role, status, category, sortBy = 'created_at', sortOrder = 'desc' } = opts;
  const offset = (page - 1) * limit;

  let query: string;
  let countQuery: string;
  let params: (string | number)[];
  let countParams: (string | number)[];

  const departmentCategory = getDepartmentCategoryFromRole(role);

  // Build dynamic query
  if (!departmentCategory) {
    const reporterHash = getAnonReporterHash(userId);
    query = `FROM reports r
      LEFT JOIN anonymous_reporters ar ON r.id = ar.report_id
      WHERE ((r.visibility = $1 AND r.reporter_id = $2)
         OR (r.visibility = $3 AND ar.reporter_hash = $4))`;
    countQuery = `SELECT COUNT(*) FROM reports r
      LEFT JOIN anonymous_reporters ar ON r.id = ar.report_id
      WHERE ((r.visibility = $1 AND r.reporter_id = $2)
         OR (r.visibility = $3 AND ar.reporter_hash = $4))`;
    params = ['private', userId, 'anonymous', reporterHash];
    countParams = ['private', userId, 'anonymous', reporterHash];
  } else {
    query = 'FROM reports r WHERE r.category = $1 AND (r.visibility = $2 OR r.visibility = $3)';
    countQuery = 'SELECT COUNT(*) FROM reports r WHERE r.category = $1 AND (r.visibility = $2 OR r.visibility = $3)';
    params = [departmentCategory, 'private', 'anonymous'];
    countParams = [departmentCategory, 'private', 'anonymous'];
  }

  if (status) {
    params.push(status);
    countParams.push(status);
    query += ` AND r.status = $${params.length}`;
    countQuery += ` AND r.status = $${countParams.length}`;
  }

  if (category) {
    params.push(category);
    countParams.push(category);
    query += ` AND r.category = $${params.length}`;
    countQuery += ` AND r.category = $${countParams.length}`;
  }

  params.push(userId);
  const selectClause = `SELECT r.*, EXISTS (
    SELECT 1 FROM report_upvotes u WHERE u.report_id = r.id AND u.user_id = $${params.length}
  ) as has_upvoted`;

  // Validate sortBy to prevent SQL injection
  const validSortColumns = ['created_at', 'updated_at', 'title', 'status', 'upvote_count'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  query = `${selectClause} ${query}`;
  query += ` ORDER BY r.${safeSortBy} ${safeSortOrder}`;
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

export async function getReportById(
  id: string,
  access?: { userId?: string; role?: string }
): Promise<Report | null> {
  const userId = access?.userId || null;
  const reporterHash = access?.userId ? getAnonReporterHash(access.userId) : null;
  const departmentCategory = getDepartmentCategoryFromRole(access?.role);
  const isAdmin = isAdminRole(access?.role);

  const result = await pool.query(
    `SELECT 
        r.*,
        EXISTS (
          SELECT 1 FROM report_upvotes u WHERE u.report_id = r.id AND u.user_id = $2::uuid
        ) as has_upvoted,
        CASE
          WHEN r.reporter_id = $2 THEN true
          WHEN r.visibility = 'anonymous' AND $3::text IS NOT NULL AND ar.reporter_hash = $3::text THEN true
          ELSE false
        END as is_owner,
        CASE 
          WHEN r.visibility = 'anonymous' THEN NULL 
          ELSE r.reporter_id 
        END as reporter_id,
        CASE 
          WHEN r.visibility = 'anonymous' THEN 'Anonymous'
          ELSE a.username 
        END as reporter_username,
        d.name as department_name, 
        d.code as department_code
     FROM reports r
     LEFT JOIN departments d ON r.assigned_department_id = d.id
     LEFT JOIN accounts a ON r.reporter_id = a.id
     LEFT JOIN anonymous_reporters ar ON r.id = ar.report_id
     WHERE r.id = $1
       AND (
         $5::boolean IS TRUE
         OR r.visibility = 'public'
         OR ($2::uuid IS NOT NULL AND r.visibility = 'private' AND r.reporter_id = $2)
         OR ($3::text IS NOT NULL AND r.visibility = 'anonymous' AND ar.reporter_hash = $3::text)
         OR ($4::report_category IS NOT NULL AND r.visibility IN ('private','anonymous'))
       )
       AND ($4::report_category IS NULL OR r.category = $4::report_category)`,
    [id, userId, reporterHash, departmentCategory, isAdmin]
  );

  return result.rows[0] || null;
}

export async function getReportAccessInfo(id: string): Promise<{ id: string; category: string; status: string } | null> {
  const result = await pool.query(
    'SELECT id, category, status FROM reports WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}

export async function isReportOwner(reportId: string, userId: string): Promise<boolean> {
  const reporterHash = getAnonReporterHash(userId);
  const result = await pool.query(
    `SELECT 1
     FROM reports r
     LEFT JOIN anonymous_reporters ar ON r.id = ar.report_id
     WHERE r.id = $1
       AND (
         r.reporter_id = $2
         OR (r.visibility = 'anonymous' AND ar.reporter_hash = $3)
       )`,
    [reportId, userId, reporterHash]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function updateReport(
  id: string,
  dto: UpdateReportDto
): Promise<Report | null> {
  const fields: string[] = [];
  const values: Array<string | number | null> = [];

  if (typeof dto.title !== 'undefined') {
    values.push(dto.title);
    fields.push(`title = $${values.length}`);
  }

  if (typeof dto.description !== 'undefined') {
    values.push(dto.description);
    fields.push(`description = $${values.length}`);
  }

  if (typeof dto.category !== 'undefined') {
    values.push(dto.category);
    fields.push(`category = $${values.length}`);
  }

  if (typeof dto.location !== 'undefined') {
    values.push(dto.location.lat);
    fields.push(`location_lat = $${values.length}`);
    values.push(dto.location.lng);
    fields.push(`location_lng = $${values.length}`);
    values.push(dto.location.address || null);
    fields.push(`location_address = $${values.length}`);
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(id);
  const result = await pool.query(
    `UPDATE reports
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function addUpvote(reportId: string, userId: string): Promise<Report | null> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'INSERT INTO report_upvotes (report_id, user_id) VALUES ($1, $2)',
      [reportId, userId]
    );

    const updated = await client.query(
      'UPDATE reports SET upvote_count = upvote_count + 1 WHERE id = $1 RETURNING *',
      [reportId]
    );

    await client.query('COMMIT');

    return updated.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function removeUpvote(reportId: string, userId: string): Promise<Report | null> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const deleted = await client.query(
      'DELETE FROM report_upvotes WHERE report_id = $1 AND user_id = $2',
      [reportId, userId]
    );

    const deletedCount = deleted.rowCount ?? 0;
    if (deletedCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const updated = await client.query(
      'UPDATE reports SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = $1 RETURNING *',
      [reportId]
    );

    await client.query('COMMIT');

    return updated.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getDepartmentSummary(departmentCategory: string, slaHours: number): Promise<{
  statusCounts: Record<string, number>;
  openOverSla: number;
  averageOpenAgeHours: number;
  slaHours: number;
}> {
  const openStatuses = ['submitted', 'routed', 'in_progress'];

  const statusResult = await pool.query(
    `SELECT status, COUNT(*)::int as count
     FROM reports
     WHERE category = $1
     GROUP BY status`,
    [departmentCategory]
  );

  const statusCounts: Record<string, number> = {};
  statusResult.rows.forEach((row) => {
    statusCounts[row.status] = row.count;
  });

  const overSlaResult = await pool.query(
    `SELECT COUNT(*)::int as count
     FROM reports
     WHERE category = $1
       AND status = ANY($2::report_status[])
       AND created_at < NOW() - ($3 || ' hours')::interval`,
    [departmentCategory, openStatuses, slaHours.toString()]
  );

  const avgAgeResult = await pool.query(
    `SELECT AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_age_seconds
     FROM reports
     WHERE category = $1
       AND status = ANY($2::report_status[])`,
    [departmentCategory, openStatuses]
  );

  const avgAgeSeconds = Number(avgAgeResult.rows[0]?.avg_age_seconds || 0);

  return {
    statusCounts,
    openOverSla: Number(overSlaResult.rows[0]?.count || 0),
    averageOpenAgeHours: Math.round((avgAgeSeconds / 3600) * 100) / 100,
    slaHours
  };
}

export interface AdminDepartmentSummaryItem {
  category: string;
  submitted: number;
  in_progress: number;
  resolved: number;
}

export async function getAdminDepartmentSummary(): Promise<AdminDepartmentSummaryItem[]> {
  const categories = ['crime', 'cleanliness', 'health', 'infrastructure', 'other'];
  const summaryMap: Record<string, AdminDepartmentSummaryItem> = {};

  categories.forEach((category) => {
    summaryMap[category] = {
      category,
      submitted: 0,
      in_progress: 0,
      resolved: 0
    };
  });

  const result = await pool.query(
    `SELECT category::text as category, status::text as status, COUNT(*)::int as count
     FROM reports
     GROUP BY category, status`
  );

  result.rows.forEach((row) => {
    const category = row.category as string;
    const status = row.status as string;
    const count = Number(row.count) || 0;
    const summary = summaryMap[category];

    if (!summary) return;

    if (status === 'submitted') {
      summary.submitted += count;
    } else if (status === 'routed' || status === 'in_progress') {
      summary.in_progress += count;
    } else if (status === 'resolved') {
      summary.resolved += count;
    }
  });

  return categories.map((category) => summaryMap[category]);
}

export async function getEscalatedReports(opts: GetReportsOptions): Promise<{
  data: Report[];
  page: number;
  limit: number;
  total: number;
}> {
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc', userId } = opts;
  const offset = (page - 1) * limit;

  let selectClause = 'SELECT r.*, false as has_upvoted';
  const params: (string | number)[] = ['escalated'];
  if (userId) {
    params.push(userId);
    selectClause = `SELECT r.*, EXISTS (
      SELECT 1 FROM report_upvotes u WHERE u.report_id = r.id AND u.user_id = $${params.length}
    ) as has_upvoted`;
  }

  const validSortColumns = ['created_at', 'updated_at', 'title', 'status', 'upvote_count'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const query = `${selectClause}
    FROM reports r
    WHERE r.status = $1::report_status
    ORDER BY r.${safeSortBy} ${safeSortOrder}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const countQuery = 'SELECT COUNT(*) FROM reports r WHERE r.status = $1::report_status';
  params.push(limit, offset);

  const [dataResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, ['escalated'])
  ]);

  return {
    data: dataResult.rows,
    page,
    limit,
    total: parseInt(countResult.rows[0].count, 10)
  };
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

    if (oldStatus === newStatus) {
      await client.query('ROLLBACK');
      return currentReport;
    }

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

export interface ExportReportRow {
  id: string;
  title: string;
  description: string;
  category: string;
  visibility: string;
  status: string;
  department_name: string | null;
  department_code: string | null;
  reporter_username: string | null;
  location_address: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function getReportsForExport(options: {
  category?: string | null;
  status?: string | null;
}): Promise<ExportReportRow[]> {
  const params: Array<string> = [];
  const conditions: string[] = [];

  if (options.category) {
    params.push(options.category);
    conditions.push(`r.category = $${params.length}::report_category`);
  }

  if (options.status) {
    params.push(options.status);
    conditions.push(`r.status = $${params.length}::report_status`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT
        r.id,
        r.title,
        r.description,
        r.category::text as category,
        r.visibility::text as visibility,
        r.status::text as status,
        d.name as department_name,
        d.code as department_code,
        CASE
          WHEN r.visibility = 'anonymous' THEN 'Anonymous'
          ELSE a.username
        END as reporter_username,
        r.location_address,
        r.created_at,
        r.updated_at
     FROM reports r
     LEFT JOIN departments d ON r.assigned_department_id = d.id
     LEFT JOIN accounts a ON r.reporter_id = a.id
     ${whereClause}
     ORDER BY r.created_at DESC`,
    params
  );

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

export async function getAttachmentByStoredFilename(storedFilename: string): Promise<Attachment | null> {
  const result = await pool.query(
    'SELECT * FROM report_attachments WHERE stored_filename = $1',
    [storedFilename]
  );
  return result.rows[0] || null;
}
