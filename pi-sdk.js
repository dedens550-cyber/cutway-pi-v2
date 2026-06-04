// public/js/pi-sdk.js
// Pi Network SDK wrapper — handles auth, payments, and user sessions

window.PiSDK = (() => {
  let _piUser = null;
  let _accessToken = null;
  const SANDBOX = true; // Switch to false for production

  const init = () => {
    return new Promise((resolve) => {
      if (typeof Pi === 'undefined') {
        console.warn('Pi SDK not loaded');
        resolve(false);
        return;
      }
      Pi.init({ version: '2.0', sandbox: SANDBOX });
      console.log('Pi SDK initialized (sandbox:', SANDBOX, ')');
      resolve(true);
    });
  };

  const authenticate = async () => {
    if (typeof Pi === 'undefined') throw new Error('Pi SDK not available');

    return new Promise((resolve, reject) => {
      Pi.authenticate(
        ['username', 'payments', 'wallet_address'],
        (incompletePayment) => {
          // Handle any incomplete payment on auth
          if (incompletePayment) {
            console.log('Incomplete payment found:', incompletePayment.identifier);
            handleIncompletePayment(incompletePayment);
          }
        }
      )
        .then((auth) => {
          _piUser = auth.user;
          _accessToken = auth.accessToken;
          console.log('Pi auth success:', _piUser.username);
          resolve({ user: _piUser, accessToken: _accessToken });
        })
        .catch(reject);
    });
  };

  const handleIncompletePayment = async (payment) => {
    try {
      // Find corresponding order and complete it
      const res = await fetch('/api/payment/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: payment.identifier,
          txid: payment.transaction?.txid || '',
          orderId: payment.metadata?.orderId || '',
        }),
      });
      const data = await res.json();
      console.log('Incomplete payment resolved:', data);
    } catch (err) {
      console.error('Failed to resolve incomplete payment:', err);
    }
  };

  /**
   * Create Pi payment for product purchase
   * Full flow: approve → Pi SDK → blockchain → complete → download token
   */
  const createPayment = ({ amount, memo, productId, storeId, onSuccess, onError }) => {
    if (typeof Pi === 'undefined') {
      onError(new Error('Pi SDK not available'));
      return;
    }

    if (!_accessToken) {
      onError(new Error('Not authenticated'));
      return;
    }

    const paymentData = {
      amount,
      memo,
      metadata: { productId, storeId },
    };

    Pi.createPayment(paymentData, {
      // Step 1: Pi SDK calls this to approve on our server
      onReadyForServerApproval: async (paymentId) => {
        try {
          const res = await fetch('/api/payment/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId,
              productId,
              storeId,
              buyerAccessToken: _accessToken,
            }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error);
          console.log('Payment approved, orderId:', data.orderId);
          // Store orderId for completion step
          window._pendingOrderId = data.orderId;
        } catch (err) {
          console.error('Approval failed:', err);
          onError(err);
        }
      },

      // Step 2: Pi SDK calls this after blockchain confirmation
      onReadyForServerCompletion: async (paymentId, txid) => {
        try {
          const res = await fetch('/api/payment/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId,
              txid,
              orderId: window._pendingOrderId,
            }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error);
          console.log('Payment completed! Download token:', data.downloadToken);
          onSuccess({ downloadToken: data.downloadToken, txid });
        } catch (err) {
          console.error('Completion failed:', err);
          onError(err);
        }
      },

      onCancel: (paymentId) => {
        fetch('/api/payment/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId }),
        });
        onError(new Error('Payment cancelled'));
      },

      onError: (error, payment) => {
        console.error('Pi payment error:', error, payment);
        onError(error);
      },
    });
  };

  const getUser = () => _piUser;
  const getToken = () => _accessToken;
  const isAuthenticated = () => !!_piUser;

  return { init, authenticate, createPayment, getUser, getToken, isAuthenticated };
})();
