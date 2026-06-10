/**
 * familyId backfill — MUST run (and its report be reviewed) BEFORE deploying
 * the familyId-scoped firestore.rules. Deploying rules first locks everyone
 * out of every doc that lacks familyId.
 *
 * Usage:
 *   node scripts/backfill-family-id.mjs --dry-run   # report only, no writes
 *   node scripts/backfill-family-id.mjs             # write familyId to docs missing it
 *
 * Credentials (first match wins):
 *   1. FIREBASE_SERVICE_ACCOUNT env var (JSON string)
 *   2. GOOGLE_APPLICATION_CREDENTIALS / gcloud ADC
 *   3. Firebase CLI login token (~/.config/configstore/firebase-tools.json)
 */
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_ID = 'prime-mechanic-463314-m8';
const DATABASE_ID = 'ai-studio-5a6aeb79-f287-4f57-8c65-c96c8b467352';

// firebase-tools' public OAuth client (published in its source; not a secret)
const FIREBASE_CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

function getCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('Auth: FIREBASE_SERVICE_ACCOUNT env var');
    return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('Auth: application default credentials');
    return applicationDefault();
  }
  const cfgPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (existsSync(cfgPath)) {
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
    const rt = cfg.tokens?.refresh_token;
    if (rt) {
      console.log(`Auth: firebase CLI login (${cfg.user?.email ?? 'unknown user'})`);
      // The Firestore client refuses refreshToken() credentials, but accepts the
      // same token via an ADC-format authorized_user file (what `gcloud auth
      // application-default login` produces).
      const adcFile = path.join(os.tmpdir(), 'bearhouse-backfill-adc.json');
      writeFileSync(adcFile, JSON.stringify({
        type: 'authorized_user',
        client_id: FIREBASE_CLI_CLIENT_ID,
        client_secret: FIREBASE_CLI_CLIENT_SECRET,
        refresh_token: rt,
        quota_project_id: PROJECT_ID,
      }));
      process.env.GOOGLE_APPLICATION_CREDENTIALS = adcFile;
      return applicationDefault();
    }
  }
  throw new Error('No credentials found. Run `firebase login` or set FIREBASE_SERVICE_ACCOUNT.');
}

const app = initializeApp({ credential: getCredential(), projectId: PROJECT_ID });
const db = getFirestore(app, DATABASE_ID);

// Top-level collections that carry per-doc familyId under the new rules.
const FAMILY_COLLECTIONS = ['tasks', 'events', 'mealPlans', 'games', 'posts', 'gallery'];
// Collections scoped by path/membership instead of a per-doc field — stamped
// anyway for defense in depth: households/** and familyMessages/*/messages.
// Collections intentionally left alone:
const IGNORED_COLLECTIONS = ['test'];

const report = { collections: {}, unmatched: [], unknownCollections: [], totals: { scanned: 0, updated: 0, alreadyTagged: 0 } };

function track(name) {
  if (!report.collections[name]) report.collections[name] = { scanned: 0, updated: 0, alreadyTagged: 0 };
  return report.collections[name];
}

async function stampDocs(docs, familyId, bucketName) {
  const bucket = track(bucketName);
  for (const snap of docs) {
    bucket.scanned++;
    report.totals.scanned++;
    const data = snap.data();
    if (typeof data.familyId === 'string' && data.familyId.length > 0) {
      bucket.alreadyTagged++;
      report.totals.alreadyTagged++;
      continue;
    }
    if (!familyId) {
      report.unmatched.push(snap.ref.path);
      continue;
    }
    if (!DRY_RUN) await snap.ref.set({ familyId }, { merge: true });
    bucket.updated++;
    report.totals.updated++;
  }
}

async function main() {
  console.log(`\n=== familyId backfill ${DRY_RUN ? '(DRY RUN — no writes)' : '(LIVE)'} ===`);
  console.log(`Project: ${PROJECT_ID}  Database: ${DATABASE_ID}\n`);

  // 1. Derive the canonical familyId from existing user docs.
  const usersSnap = await db.collection('users').get();
  const codes = new Set();
  for (const u of usersSnap.docs) {
    const d = u.data();
    const code = d.familyId ?? d.familyCode;
    if (typeof code === 'string' && code.length > 0) codes.add(code);
  }
  if (codes.size === 0) throw new Error('No familyCode/familyId found on any user doc — cannot derive canonical familyId. Aborting.');
  if (codes.size > 1) throw new Error(`Multiple family codes found on user docs: ${[...codes].join(', ')} — ambiguous, refusing to guess. Aborting.`);
  const CANONICAL = [...codes][0];
  console.log(`Canonical familyId derived from ${usersSnap.size} user docs: "${CANONICAL}"\n`);

  // 2. users — familyId := their own familyCode (all match canonical, per check above)
  await stampDocs(usersSnap.docs, CANONICAL, 'users');

  // users/{uid}/fcmTokens — path-scoped under new rules; no stamp needed.

  // 3. Flat family collections
  for (const name of FAMILY_COLLECTIONS) {
    const snap = await db.collection(name).get();
    await stampDocs(snap.docs, CANONICAL, name);
  }

  // 4. familyMessages/{code}/messages — associate by path segment
  const fmParents = await db.collection('familyMessages').listDocuments();
  for (const parent of fmParents) {
    const msgs = await parent.collection('messages').get();
    const matches = parent.id === CANONICAL;
    await stampDocs(msgs.docs, matches ? CANONICAL : null, `familyMessages/${parent.id}/messages`);
    if (!matches && msgs.size > 0) {
      console.warn(`  !! familyMessages/${parent.id} does not match canonical "${CANONICAL}" — ${msgs.size} docs logged as unmatched`);
    }
  }

  // 5. households/** — recurse every doc and subcollection
  async function recurseCollection(colRef, label) {
    const docRefs = await colRef.listDocuments();
    for (const docRef of docRefs) {
      const snap = await docRef.get();
      if (snap.exists) await stampDocs([snap], CANONICAL, label);
      for (const sub of await docRef.listCollections()) {
        await recurseCollection(sub, `${label}/*/${sub.id}`);
      }
    }
  }
  await recurseCollection(db.collection('households'), 'households');

  // 6. Flag any top-level collections this script doesn't know about
  const known = new Set(['users', 'familyMessages', 'households', ...FAMILY_COLLECTIONS, ...IGNORED_COLLECTIONS]);
  const allCollections = await db.listCollections();
  for (const col of allCollections) {
    if (!known.has(col.id)) {
      const count = (await col.count().get()).data().count;
      report.unknownCollections.push({ collection: col.id, docs: count });
    }
  }

  // 7. Report
  const lines = [];
  lines.push(`familyId backfill report — ${new Date().toISOString()} ${DRY_RUN ? '(DRY RUN)' : '(LIVE RUN)'}`);
  lines.push(`Project ${PROJECT_ID}, database ${DATABASE_ID}`);
  lines.push(`Canonical familyId: ${CANONICAL}`);
  lines.push('');
  lines.push(`${'collection'.padEnd(42)} scanned  updated  already-tagged`);
  for (const [name, c] of Object.entries(report.collections)) {
    lines.push(`${name.padEnd(42)} ${String(c.scanned).padStart(7)}  ${String(c.updated).padStart(7)}  ${String(c.alreadyTagged).padStart(14)}`);
  }
  lines.push('');
  lines.push(`TOTAL scanned: ${report.totals.scanned}, ${DRY_RUN ? 'would update' : 'updated'}: ${report.totals.updated}, already tagged: ${report.totals.alreadyTagged}`);
  lines.push(`Docs that could NOT be matched to a family (left untouched): ${report.unmatched.length}`);
  for (const p of report.unmatched) lines.push(`  UNMATCHED: ${p}`);
  if (report.unknownCollections.length) {
    lines.push(`Unknown top-level collections (NOT touched — review manually):`);
    for (const u of report.unknownCollections) lines.push(`  ${u.collection} (${u.docs} docs)`);
  } else {
    lines.push('No unknown top-level collections.');
  }

  const text = lines.join('\n');
  console.log('\n' + text + '\n');
  const outFile = DRY_RUN ? 'backfill-report.dry-run.txt' : 'backfill-report.txt';
  writeFileSync(outFile, text);
  console.log(`Report written to ${outFile}`);

  if (report.unmatched.length > 0 || report.unknownCollections.length > 0) {
    console.warn('\n!! Review unmatched/unknown items before deploying the new rules.');
    process.exitCode = 2;
  }
}

main().catch(err => {
  console.error('\nBackfill failed:', err.message);
  process.exit(1);
});
