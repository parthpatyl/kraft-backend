import jwt from 'jsonwebtoken';
import { roleHas } from './permissions.js';

export function requirePermission(...permissions) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = header.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'JWT Secret is not configured on the server' });
    }
    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (permissions.length === 0) return next();
    const allowed = permissions.some(p => roleHas(req.user.role, p));
    if (!allowed) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
