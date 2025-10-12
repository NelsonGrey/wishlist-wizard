/**
 * Authentication utilities stub for tests
 * TODO: Implement proper authentication functions
 */

import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export function isAuthenticated(req: any, res: any, next: any) {
  // Stub implementation for tests
  if (req.session?.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
}