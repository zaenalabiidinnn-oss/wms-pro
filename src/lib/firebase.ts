/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

import firebaseConfigPlaceholder from '../../firebase-applet-config.json';

// In AI Studio, we try to load from the auto-generated config first
// We merge with env vars as fallbacks
const firebaseConfig = {
  ...firebaseConfigPlaceholder,
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigPlaceholder.apiKey || '').trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigPlaceholder.authDomain || '').trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigPlaceholder.projectId || '').trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigPlaceholder.storageBucket || '').trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigPlaceholder.messagingSenderId || '').trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigPlaceholder.appId || '').trim(),
  firestoreDatabaseId: (import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfigPlaceholder.firestoreDatabaseId || '(default)').trim()
};

const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey.length > 10;

// Only initialize if we have an API Key
export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : null;
export const auth = app ? getAuth(app) : null;

export { isFirebaseConfigured };

// Connectivity Test
async function testConnection() {
  if (!firebaseConfig.apiKey) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Connected Successfully");
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase is offline or configuration is invalid.");
    }
  }
}
testConnection();
