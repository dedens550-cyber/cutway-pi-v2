// src/pages/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { getDb, getStorage } = require('../utils/firebase');
const { approvePayment, completePayment, getPayment, verifyPiUser } = require('../utils/piPayment');
const { generateDownloadToken, validateDownloadToken, consumeDownloadToken } = require('../utils/downloadToken');

const PLATFORM_FEE = parseFloat(process.env.PLATFORM_FEE_PI) || 1;

// ─────────────────────────────────────────────
// POST /api/payment/approve
// Called when buyer initiates Pi payment
// ─────────────────────────────────────────────
router.post('/approve', async (req, res) => {
  const { paymentId, productId, storeId, buyerAccessToken } = req.body;

  if (!paymentId || !productId || !storeId || !buyerAccessToken) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Verify Pi user
    const piUser = await verifyPiUser(buyerAccessToken);
    const buyerPiUid = piUser.uid;

    // 2. Get product from Firestore
    const db = getDb();
    const productDoc = await db
      .collection('stores')
      .doc(storeId)
      .collection('products')
      .doc(productId)
      .get();

    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productDoc.data();

    // 3. Verify payment amount matches product price
    const piPaymentData = await getPayment(paymentId);
    const expectedAmount = parseFloat(product.price);
    const receivedAmount = parseFloat(piPaymentData.amount);

    if (Math.abs(receivedAmount - expectedAmount) > 0.001) {
      return res.status(400).json({ error: 'Payment amount mismatch' });
    }

    // 4. Approve with Pi API
    await approvePayment(paymentId);

    // 5. Create pending order in Firestore
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.collection('orders').doc(orderId).set({
      orderId,
      paymentId,
      productId,
      storeId,
      buyerPiUid,
      productName: product.name,
      amount: receivedAmount,
      platformFee: PLATFORM_FEE,
      sellerAmount: receivedAmount - PLATFORM_FEE,
      status: 'pending',
      createdAt: Date.now(),
    });

    console.log(`✅ Payment approved — orderId: ${orderId}, product: ${product.name}`);

    res.json({ success: true, orderId, message: 'Payment approved, awaiting blockchain confirmation' });
  } catch (err) {
    console.error('Payment approval error:', err.message);
    res.status(500).json({ error: 'Payment approval failed', details: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/payment/complete
// Called after Pi blockchain confirms tx
// Triggers auto-download token generation
// ─────────────────────────────────────────────
router.post('/complete', async (req, res) => {
  const { paymentId, txid, orderId } = req.body;

  if (!paymentId || !txid || !orderId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const db = getDb();

    // 1. Get order
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found' });

    const order = orderDoc.data();
    if (order.status === 'completed') {
      // Idempotent — already completed, return existing download token
      const existingToken = order.downloadToken;
      return res.json({ success: true, downloadToken: existingToken, alreadyCompleted: true });
    }

    // 2. Complete payment with Pi API
    await completePayment(paymentId, txid);

    // 3. Deduct platform fee (1 Pi) — record in Firestore ledger
    await db.collection('platform_fees').add({
      orderId,
      paymentId,
      txid,
      storeId: order.storeId,
      feeAmount: PLATFORM_FEE,
      ownerWallet: process.env.OWNER_PI_WALLET,
      timestamp: Date.now(),
    });

    // 4. Update seller balance in Firestore
    const storeRef = db.collection('stores').doc(order.storeId);
    await db.runTransaction(async (t) => {
      const storeDoc = await t.get(storeRef);
      const currentBalance = storeDoc.data()?.pendingBalance || 0;
      t.update(storeRef, {
        pendingBalance: currentBalance + order.sellerAmount,
        totalSales: (storeDoc.data()?.totalSales || 0) + 1,
        totalRevenue: (storeDoc.data()?.totalRevenue || 0) + order.amount,
      });
    });

    // 5. Generate one-time secure download token
    const downloadToken = await generateDownloadToken({
      orderId,
      productId: order.productId,
      storeId: order.storeId,
      buyerPiUid: order.buyerPiUid,
    });

    // 6. Mark order as completed
    await db.collection('orders').doc(orderId).update({
      status: 'completed',
      txid,
      completedAt: Date.now(),
      downloadToken,
    });

    console.log(`✅ Payment completed — orderId: ${orderId}, txid: ${txid}`);

    res.json({
      success: true,
      downloadToken,
      message: 'Payment confirmed! Your download is ready.',
    });
  } catch (err) {
    console.error('Payment completion error:', err.message);
    res.status(500).json({ error: 'Payment completion failed', details: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/payment/cancel
// Pi SDK calls this if payment is cancelled
// ─────────────────────────────────────────────
router.post('/cancel', async (req, res) => {
  const { paymentId } = req.body;

  try {
    const db = getDb();
    const ordersQuery = await db
      .collection('orders')
      .where('paymentId', '==', paymentId)
      .limit(1)
      .get();

    if (!ordersQuery.empty) {
      await ordersQuery.docs[0].ref.update({
        status: 'cancelled',
        cancelledAt: Date.now(),
      });
    }

    res.json({ success: true, message: 'Payment cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Cancel failed' });
  }
});

// ─────────────────────────────────────────────
// GET /api/download/:token
// Serve the digital file after validating token
// ─────────────────────────────────────────────
router.get('/download/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // 1. Validate download token
    const tokenData = await validateDownloadToken(token);

    // 2. Get product file path from Firestore
    const db = getDb();
    const productDoc = await db
      .collection('stores')
      .doc(tokenData.storeId)
      .collection('products')
      .doc(tokenData.productId)
      .get();

    if (!productDoc.exists) return res.status(404).json({ error: 'Product not found' });

    const product = productDoc.data();

    // 3. Generate signed URL from Firebase Storage (1-hour expiry)
    const storage = getStorage();
    const bucket = storage.bucket();
    const file = bucket.file(product.filePath);

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
      responseDisposition: `attachment; filename="${product.fileName}"`,
    });

    // 4. Consume token (mark as used)
    await consumeDownloadToken(token);

    // 5. Redirect to signed URL — browser handles the download
    res.redirect(signedUrl);
  } catch (err) {
    console.error('Download error:', err.message);
    res.status(403).json({ error: err.message || 'Invalid or expired download link' });
  }
});

// ─────────────────────────────────────────────
// GET /api/download/status/:token
// Check token validity without consuming it
// ─────────────────────────────────────────────
router.get('/download/status/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const tokenData = await validateDownloadToken(token);
    res.json({ valid: true, expiresAt: tokenData.expiresAt });
  } catch (err) {
    res.json({ valid: false, reason: err.message });
  }
});

module.exports = router;
