/**
 * Single source of truth for role → dashboard mapping and role normalization.
 *
 * The database currently defines exactly two roles (see database/schema.sql,
 * `role ENUM('user', 'admin')`), so only those are handled here. If the
 * schema ever grows more roles, add them here ONLY — never duplicate this
 * switch inside Login.jsx, Navbar.jsx, route guards, etc.
 */

export const normalizeRole = (role) => (typeof role === 'string' ? role.toLowerCase().trim() : role);

export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
};

/** Returns the dashboard path a given (possibly un-normalized) role should land on. */
export const getDashboardByRole = (role) => {
  switch (normalizeRole(role)) {
    case ROLES.ADMIN:
      return '/admin/dashboard';
    case ROLES.USER:
      return '/dashboard';
    default:
      return '/unauthorized';
  }
};
