import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

/**
 * Verifies the Firebase ID token from the Authorization: Bearer header.
 * Returns the decoded token, or null if missing/invalid.
 */
export async function verifyAuth(req: NextRequest): Promise<DecodedIdToken | null> {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return null;
  try {
    return await getAuth(getAdminApp()).verifyIdToken(match[1]);
  } catch {
    return null;
  }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
