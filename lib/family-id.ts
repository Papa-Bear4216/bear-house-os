import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

let cached: { uid: string; familyId: string } | null = null;

/**
 * Returns the signed-in user's familyId (from their users/{uid} doc).
 * Every family-scoped document must be created with this stamped on it —
 * Firestore rules reject creates whose familyId doesn't match the author's.
 */
export async function getMyFamilyId(): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  if (cached?.uid === uid) return cached.familyId;
  const snap = await getDoc(doc(db, 'users', uid));
  const data = snap.data();
  const familyId = (data?.familyId ?? data?.familyCode) as string | undefined;
  if (!familyId) throw new Error('No family found for this user');
  cached = { uid, familyId };
  return familyId;
}
