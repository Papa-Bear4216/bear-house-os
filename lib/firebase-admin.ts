import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getAdminApp(): admin.app.App {
  if (app) return app;

  const existing = admin.apps.find(a => a?.name === '[DEFAULT]');
  if (existing) { app = existing; return app; }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccount) {
    app = admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
      databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'prime-mechanic-463314-m8'}.firebaseio.com`,
    });
  } else {
    // Fallback: use project ID + Google ADC (works in GCP/Firebase hosting)
    app = admin.initializeApp({
      projectId: 'prime-mechanic-463314-m8',
    });
  }

  return app;
}

export function getAdminFirestore() {
  return getAdminApp().firestore();
}

export function getAdminMessaging() {
  return getAdminApp().messaging();
}
