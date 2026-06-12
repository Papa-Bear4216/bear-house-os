import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'prime-mechanic-463314-m8';
const databaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID ?? '';

let app: App | null = null;

export function getAdminApp(): App {
  if (app) return app;

  const existing = getApps().find(a => a.name === '[DEFAULT]');
  if (existing) { app = existing; return app; }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccount) {
    app = initializeApp({
      credential: cert(JSON.parse(serviceAccount)),
      databaseURL: `https://${projectId}.firebaseio.com`,
    });
  } else {
    app = initializeApp({ projectId });
  }

  return app;
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp(), databaseId);
}

export function getAdminMessaging() {
  getAdminApp();
  return getMessaging();
}
