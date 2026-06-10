import { auth } from '@/lib/firebase';

/**
 * fetch() that attaches the current user's Firebase ID token as a Bearer token.
 * All /api/* routes require this header; unauthenticated calls get a 401.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to use this feature.');
  }
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
