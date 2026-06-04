// src/utils/piPayment.js
const axios = require('axios');

const PI_API_BASE = process.env.PI_SANDBOX === 'true'
  ? 'https://api.minepi.com/v2'
  : 'https://api.minepi.com/v2';

const piApi = axios.create({
  baseURL: PI_API_BASE,
  headers: {
    Authorization: `Key ${process.env.PI_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Approve a pending Pi payment
 * Called when buyer initiates payment on frontend
 */
const approvePayment = async (paymentId) => {
  const response = await piApi.post(`/payments/${paymentId}/approve`);
  return response.data;
};

/**
 * Complete a Pi payment after blockchain transaction
 * txid = transaction ID from Pi blockchain
 */
const completePayment = async (paymentId, txid) => {
  const response = await piApi.post(`/payments/${paymentId}/complete`, { txid });
  return response.data;
};

/**
 * Get payment details from Pi API
 */
const getPayment = async (paymentId) => {
  const response = await piApi.get(`/payments/${paymentId}`);
  return response.data;
};

/**
 * Verify user auth token from Pi SDK
 */
const verifyPiUser = async (accessToken) => {
  const response = await axios.get(`${PI_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
};

/**
 * Create A2U (App-to-User) payment — send Pi to user
 * Used for future refund capabilities
 */
const createA2UPayment = async ({ amount, memo, uid, metadata }) => {
  const response = await piApi.post('/payments', {
    payment: {
      amount,
      memo,
      metadata,
      uid,
    },
  });
  return response.data;
};

module.exports = {
  approvePayment,
  completePayment,
  getPayment,
  verifyPiUser,
  createA2UPayment,
};
