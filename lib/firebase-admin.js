
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  let serviceAccount;

  // Vercel production credentials
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );
  } else {
    // Local development credentials
    const serviceAccountPath = path.join(
      process.cwd(),
      "service-account.json"
    );

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error("Firebase Admin credentials were not found.");
    }

    serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, "utf8")
    );
  }

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

const adminApp = getAdminApp();

export const adminDb = getFirestore(adminApp);
