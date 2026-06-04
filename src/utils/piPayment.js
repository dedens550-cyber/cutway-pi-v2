const axios = require('axios');

const PI_API_BASE = 'https://api.minepi.com/v2';

const piApi = axios.create({
  baseURL: PI_API_BASE,
    headers: {
        Authorization: `Key ${process.env.PI_API_KEY}`,
            'Content-Type': 'application/json',
              },
              });

              const approvePayment = async (paymentId) => {
                const response = await piApi.post(`/payments/${paymentId}/approve`);
                  return response.data;
                  };

                  const completePayment = async (paymentId, txid) => {
                    const response = await piApi.post(`/payments/${paymentId}/complete`, { txid });
                      return response.data;
                      };

                      const getPayment = async (paymentId) => {
                        const response = await piApi.get(`/payments/${paymentId}`);
                          return response.data;
                          };

                          const verifyPiUser = async (accessToken) => {
                            const response = await axios.get(`${PI_API_BASE}/me`, {
                                headers: { Authorization: `Bearer ${accessToken}` },
                                  });
                                    return response.data;
                                    };

                                    module.exports = { approvePayment, completePayment, getPayment, verifyPiUser };