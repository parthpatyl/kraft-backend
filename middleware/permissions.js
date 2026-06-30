const ROLE_PERMISSIONS = {
  admin: [
    'read:packages', 'create:packages', 'write:packages', 'write:packages.pricing', 'delete:packages',
    'read:bookings', 'write:bookings', 'delete:bookings', 'write:bookings.pricing',
    'read:clients', 'write:clients.profile', 'write:clients.financials', 'delete:clients',
    'read:settings', 'write:settings',
    'read:financials',
    'read:testimonials', 'write:testimonials',
    'read:reports',
    'manage:users',
    'review:approvals'
  ],
  operations: [
    'read:packages', 'write:packages',
    'read:bookings', 'write:bookings',
    'read:clients', 'write:clients.profile', 'write:clients.financials',
    'read:settings',
    'read:testimonials',
    'read:reports',
    'submit:approvals'
  ],
  sales: [
    'read:packages',
    'read:bookings',
    'read:clients',
    'read:testimonials',
    'read:reports'
  ],
  owner: [
    'read:bookings',
    'read:clients',
    'read:reports'
  ]
};

export function roleHas(role, permission) {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes(permission)) return true;
  if (permission.startsWith('write:') && perms.includes('write:*')) return true;
  if (permission.startsWith('read:') && perms.includes('read:*')) return true;
  return false;
}

export function hasAnyOf(role, permissions) {
  return permissions.some(p => roleHas(role, p));
}

export function roleHasAny(role, permissions) {
  const perms = ROLE_PERMISSIONS[role] || [];
  return permissions.some(p => perms.includes(p));
}

export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export { ROLE_PERMISSIONS };
