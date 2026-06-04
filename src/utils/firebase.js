// src/utils/firebase.js
const admin = require('firebase-admin');

let db, storage, auth;

const initFirebase = () => {
  if (admin.apps.length > 0) return;

  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
  });

  db = admin.firestore();
  storage = admin.storage();
  auth = admin.auth();

  console.log('✅ Firebase Admin initialized — project:', process.env.FIREBASE_PROJECT_ID);
};

const getDb = () => {
  if (!db) initFirebase();
  return db;
};

const getStorage = () => {
  if (!storage) initFirebase();
  return storage;
};

const getAuth = () => {
  if (!auth) initFirebase();
  return auth;
};

module.exports = { initFirebase, getDb, getStorage, getAuth };
