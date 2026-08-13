import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Service-account JSON stores the key with literal "\n" sequences once
// dropped into a single-line env var; turn them back into real newlines.
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

export const fcmConfigured = Boolean(projectId && clientEmail && privateKey);

if (fcmConfigured && getApps().length === 0) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export function getFcmMessaging() {
  return getMessaging();
}
