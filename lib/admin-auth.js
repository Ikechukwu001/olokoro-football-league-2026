import { getAuth } from "firebase-admin/auth";
import { getApps, initializeApp, cert } from "firebase-admin/app";

function ensureAdminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Firebase Admin credentials are not configured.");
  const serviceAccount = JSON.parse(raw);
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }
  return initializeApp({ credential: cert(serviceAccount) });
}

export async function requireAdmin(request) {
  ensureAdminApp();
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    const error = new Error("Please sign in.");
    error.status = 401;
    throw error;
  }

  const decoded = await getAuth().verifyIdToken(token);
  if (!process.env.ADMIN_UID || decoded.uid !== process.env.ADMIN_UID) {
    const error = new Error("You are not authorized to manage this league.");
    error.status = 403;
    throw error;
  }
  return decoded;
}
