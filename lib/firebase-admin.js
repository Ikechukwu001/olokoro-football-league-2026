
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

function getAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  const serviceAccountPath = path.join(
    process.cwd(),
    "service-account.json"
  );

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error("service-account.json was not found.");
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf8")
  );

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

const adminApp = getAdminApp();

export const adminDb = getFirestore(adminApp);
