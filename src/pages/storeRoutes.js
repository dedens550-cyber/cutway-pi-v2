// src/pages/storeRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { getDb, getStorage } = require('../utils/firebase');
const { verifyPiUser } = require('../utils/piPayment');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

// Middleware: verify Pi auth token
const requirePiAuth = async (req, res, next) => {
  const token = req.headers['x-pi-access-token'];
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const piUser = await verifyPiUser(token);
    req.piUser = piUser;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid Pi token' });
  }
};

// ─── GET /api/store/:username — Public storefront ───
router.get('/:username', async (req, res) => {
  const { username } = req.params;
  const db = getDb();

  const storeQuery = await db
    .collection('stores')
    .where('username', '==', username.toLowerCase())
    .limit(1)
    .get();

  if (storeQuery.empty) return res.status(404).json({ error: 'Store not found' });

  const store = storeQuery.docs[0].data();
  const storeId = storeQuery.docs[0].id;

  // Get active products
  const productsSnap = await db
    .collection('stores')
    .doc(storeId)
    .collection('products')
    .where('active', '==', true)
    .orderBy('createdAt', 'desc')
    .get();

  const products = productsSnap.docs.map((doc) => {
    const p = doc.data();
    return {
      id: doc.id,
      name: p.name,
      description: p.description,
      price: p.price,
      type: p.type,
      coverImage: p.coverImage,
      sales: p.sales || 0,
    };
  });

  res.json({
    store: {
      id: storeId,
      username: store.username,
      displayName: store.displayName,
      bio: store.bio,
      avatar: store.avatar,
      coverImage: store.coverImage,
      piWallet: store.piWallet,
      socialLinks: store.socialLinks || {},
    },
    products,
  });
});

// ─── POST /api/store/create — Create new store ───
router.post('/create', requirePiAuth, async (req, res) => {
  const { username, displayName, bio, piWallet } = req.body;
  const db = getDb();

  if (!username || !displayName || !piWallet) {
    return res.status(400).json({ error: 'username, displayName, piWallet required' });
  }

  // Check username availability
  const existing = await db
    .collection('stores')
    .where('username', '==', username.toLowerCase())
    .limit(1)
    .get();

  if (!existing.empty) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const storeId = uuidv4();
  await db.collection('stores').doc(storeId).set({
    storeId,
    ownerPiUid: req.piUser.uid,
    username: username.toLowerCase(),
    displayName,
    bio: bio || '',
    piWallet,
    avatar: '',
    coverImage: '',
    socialLinks: {},
    pendingBalance: 0,
    totalSales: 0,
    totalRevenue: 0,
    active: true,
    createdAt: Date.now(),
  });

  res.json({ success: true, storeId, username: username.toLowerCase() });
});

// ─── POST /api/store/:storeId/product — Add product ───
router.post('/:storeId/product', requirePiAuth, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]), async (req, res) => {
  const { storeId } = req.params;
  const { name, description, price, type } = req.body;
  const db = getDb();
  const storage = getStorage();

  // Verify store ownership
  const storeDoc = await db.collection('stores').doc(storeId).get();
  if (!storeDoc.exists) return res.status(404).json({ error: 'Store not found' });
  if (storeDoc.data().ownerPiUid !== req.piUser.uid) {
    return res.status(403).json({ error: 'Not your store' });
  }

  if (!req.files?.file) return res.status(400).json({ error: 'Product file required' });

  const productId = uuidv4();
  const bucket = storage.bucket();

  // Upload product file
  const productFile = req.files.file[0];
  const filePath = `stores/${storeId}/products/${productId}/${productFile.originalname}`;
  const fileRef = bucket.file(filePath);
  await fileRef.save(productFile.buffer, { metadata: { contentType: productFile.mimetype } });

  // Upload cover image (optional)
  let coverImage = '';
  if (req.files?.cover) {
    const coverFile = req.files.cover[0];
    const coverPath = `stores/${storeId}/covers/${productId}.jpg`;
    const coverRef = bucket.file(coverPath);
    await coverRef.save(coverFile.buffer, { metadata: { contentType: coverFile.mimetype } });
    const [coverUrl] = await coverRef.getSignedUrl({ action: 'read', expires: '2099-01-01' });
    coverImage = coverUrl;
  }

  await db.collection('stores').doc(storeId).collection('products').doc(productId).set({
    productId,
    name,
    description: description || '',
    price: parseFloat(price),
    type: type || 'digital',
    filePath,
    fileName: productFile.originalname,
    fileSize: productFile.size,
    coverImage,
    active: true,
    sales: 0,
    createdAt: Date.now(),
  });

  res.json({ success: true, productId, message: 'Product created' });
});

// ─── GET /api/store/:storeId/dashboard — Seller analytics ───
router.get('/:storeId/dashboard', requirePiAuth, async (req, res) => {
  const { storeId } = req.params;
  const db = getDb();

  const storeDoc = await db.collection('stores').doc(storeId).get();
  if (!storeDoc.exists) return res.status(404).json({ error: 'Store not found' });
  if (storeDoc.data().ownerPiUid !== req.piUser.uid) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const store = storeDoc.data();

  // Get recent orders
  const ordersSnap = await db
    .collection('orders')
    .where('storeId', '==', storeId)
    .where('status', '==', 'completed')
    .orderBy('completedAt', 'desc')
    .limit(20)
    .get();

  const orders = ordersSnap.docs.map((doc) => {
    const o = doc.data();
    return {
      orderId: o.orderId,
      productName: o.productName,
      amount: o.amount,
      sellerAmount: o.sellerAmount,
      completedAt: o.completedAt,
    };
  });

  res.json({
    store: {
      username: store.username,
      displayName: store.displayName,
      pendingBalance: store.pendingBalance,
      totalSales: store.totalSales,
      totalRevenue: store.totalRevenue,
    },
    recentOrders: orders,
  });
});

module.exports = router;
