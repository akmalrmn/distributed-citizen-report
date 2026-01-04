import { Request, Response, NextFunction } from 'express';
import { getDepartmentCategoryFromRole, isAdminRole } from '../utils/role';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  return next();
}

export function requireDepartmentRole(req: Request, res: Response, next: NextFunction) {
  const role = req.session?.role;
  const departmentCategory = getDepartmentCategoryFromRole(role);

  if (!departmentCategory) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdminRole(req.session?.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return next();
}

export function requireDepartmentOrAdmin(req: Request, res: Response, next: NextFunction) {
  const role = req.session?.role;
  const departmentCategory = getDepartmentCategoryFromRole(role);

  if (!departmentCategory && !isAdminRole(role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return next();
}
