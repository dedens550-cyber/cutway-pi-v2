// src/utils/downloadToken.js
const crypto = require('crypto');
const { getDb } = require('./firebase');

/**
 * Generate a one-time secure download token
 * Stored in Firestore, expires in 24 hours
 */
const generateDownloadToken = async ({ orderId, productId, storeId, buyerPiUid }) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  const db = getDb();
  await db.collection('download_tokens').doc(token).set({
    token,
    orderId,
    productId,
    storeId,
    buyerPiUid,
    used: false,
    expiresAt,
    createdAt: Date.now(),
  });

  return token;
};

/**
 * Validate a download token
 * Returns token data if valid, throws if invalid/expired/used
 */
const validateDownloadToken = async (token) => {
  const db = getDb();
  const doc = await db.collection('download_tokens').doc(token).get();

  if (!doc.exists) throw new Error('Invalid download token');

  const data = doc.data();

  if (data.used) throw new Error('Download link already used');
  if (Date.now() > data.expiresAt) throw new Error('Download link expired');

  return data;
};

/**
 * Mark token as used after download
 */
const consumeDownloadToken = async (token) => {
  const db = getDb();
  await db.collection('download_tokens').doc(token).update({
    used: true,
    usedAt: Date.now(),
  });
};

module.exports = { generateDownloadToken, validateDownloadToken, consumeDownloadToken };
