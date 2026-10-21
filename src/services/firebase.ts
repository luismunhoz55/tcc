import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.databaseURL && config.projectId && config.appId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let database: Database | null = null;

// Metro selects Firebase's `react-native` export condition at runtime. TypeScript
// resolves the browser declaration, which omits this React Native-only helper.
const getReactNativePersistence = (FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
}).getReactNativePersistence;

export function getFirebase() {
  if (!firebaseConfigured) return null;

  if (!app) {
    app = getApps().length ? getApp() : initializeApp(config);
    try {
      auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    } catch {
      auth = getAuth(app);
    }
    database = getDatabase(app);
  }

  return { app, auth: auth!, database: database! };
}
