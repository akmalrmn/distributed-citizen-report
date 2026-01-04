const DEPARTMENT_PREFIX = 'Department ';
const ADMIN_ROLE = 'Admin';
const VALID_DEPARTMENT_CATEGORIES = new Set([
  'crime',
  'cleanliness',
  'health',
  'infrastructure',
  'other'
]);

export function getDepartmentCategoryFromRole(role?: string): string | null {
  if (!role || role === 'Warga') return null;
  if (role === ADMIN_ROLE) return null;
  if (!role.startsWith(DEPARTMENT_PREFIX)) return null;

  const category = role.slice(DEPARTMENT_PREFIX.length).trim().toLowerCase();
  if (category.length === 0) return null;
  return VALID_DEPARTMENT_CATEGORIES.has(category) ? category : null;
}

export function isAdminRole(role?: string): boolean {
  return role === ADMIN_ROLE;
}
