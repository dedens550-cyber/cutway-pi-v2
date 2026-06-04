// public/js/app.js
// Cutway.pi v2 — Main App Controller

const App = (() => {
  let currentStore = null;
  let currentProducts = [];

  // ── Init ──
  const init = async () => {
    await PiSDK.init();
    Router.init();
  };

  // ── Load storefront by username ──
  const loadStore = async (username) => {
    try {
      UI.showLoading();
      const res = await fetch(`/api/store/${username}`);
      if (!res.ok) {
        UI.showError('Toko tidak ditemukan');
        return;
      }
      const data = await res.json();
      currentStore = data.store;
      currentProducts = data.products;
      UI.renderStorefront(currentStore, currentProducts);
    } catch (err) {
      UI.showError('Gagal memuat toko');
    } finally {
      UI.hideLoading();
    }
  };

  // ── Trigger purchase flow ──
  const buyProduct = async (productId) => {
    const product = currentProducts.find((p) => p.id === productId);
    if (!product) return;

    // Authenticate Pi user first
    if (!PiSDK.isAuthenticated()) {
      UI.showMessage('Connecting to Pi...', 'info');
      try {
        await PiSDK.authenticate();
      } catch (err) {
        UI.showMessage('Gagal login Pi. Buka di Pi Browser.', 'error');
        return;
      }
    }

    // Show payment modal
    UI.showPaymentModal(product, () => {
      executePayment(product);
    });
  };

  const executePayment = (product) => {
    UI.setPaymentStatus('processing', 'Memproses pembayaran Pi...');

    PiSDK.createPayment({
      amount: product.price,
      memo: `Cutway: ${product.name}`,
      productId: product.id,
      storeId: currentStore.id,

      onSuccess: ({ downloadToken, txid }) => {
        UI.setPaymentStatus('success', 'Pembayaran berhasil!');
        UI.showDownloadButton(downloadToken, product.name);
        UI.confetti();
      },

      onError: (err) => {
        const msg = err.message === 'Payment cancelled'
          ? 'Pembayaran dibatalkan'
          : 'Pembayaran gagal. Coba lagi.';
        UI.setPaymentStatus('error', msg);
      },
    });
  };

  // ── Trigger file download ──
  const downloadFile = (token) => {
    const link = document.createElement('a');
    link.href = `/api/download/${token}`;
    link.click();
  };

  const getStore = () => currentStore;
  const getProducts = () => currentProducts;

  return { init, loadStore, buyProduct, downloadFile, getStore, getProducts };
})();

// ── Router ──
const Router = (() => {
  const init = () => {
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
      renderHome();
    } else if (segments[0] === 'dashboard') {
      renderDashboard();
    } else if (segments[0] === 'create') {
      renderCreate();
    } else {
      // Treat as username/storefront
      App.loadStore(segments[0]);
    }
  };

  const renderHome = () => {
    document.getElementById('app').innerHTML = HomeView.render();
    HomeView.bindEvents();
  };

  const renderDashboard = () => {
    document.getElementById('app').innerHTML = DashboardView.render();
    DashboardView.init();
  };

  const renderCreate = () => {
    document.getElementById('app').innerHTML = CreateView.render();
    CreateView.bindEvents();
  };

  return { init };
})();

// ── UI Helpers ──
const UI = (() => {
  const showLoading = () => {
    document.getElementById('app').innerHTML = `
      <div class="loading-screen">
        <div class="loader-ring"></div>
        <p>Memuat toko...</p>
      </div>`;
  };

  const hideLoading = () => {};

  const showError = (msg) => {
    document.getElementById('app').innerHTML = `
      <div class="error-screen">
        <div class="error-icon">π</div>
        <h2>${msg}</h2>
        <a href="/" class="btn-primary">Kembali ke Home</a>
      </div>`;
  };

  const showMessage = (msg, type = 'info') => {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  };

  const renderStorefront = (store, products) => {
    document.getElementById('app').innerHTML = StorefrontView.render(store, products);
    StorefrontView.bindEvents(products);
  };

  const showPaymentModal = (product, onConfirm) => {
    const modal = document.getElementById('payment-modal');
    document.getElementById('modal-product-name').textContent = product.name;
    document.getElementById('modal-product-price').textContent = `π ${product.price}`;
    document.getElementById('modal-product-desc').textContent = product.description;
    modal.classList.add('active');

    document.getElementById('btn-confirm-pay').onclick = () => onConfirm();
    document.getElementById('btn-cancel-pay').onclick = () => {
      modal.classList.remove('active');
      document.getElementById('payment-status').className = 'payment-status hidden';
    };
  };

  const setPaymentStatus = (state, msg) => {
    const el = document.getElementById('payment-status');
    el.className = `payment-status status-${state}`;
    el.querySelector('.status-text').textContent = msg;

    if (state === 'processing') {
      document.getElementById('btn-confirm-pay').disabled = true;
      document.getElementById('btn-cancel-pay').disabled = true;
    }
  };

  const showDownloadButton = (token, productName) => {
    const btnArea = document.getElementById('download-area');
    btnArea.innerHTML = `
      <button class="btn-download" onclick="App.downloadFile('${token}')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download ${productName}
      </button>
      <p class="download-note">Link berlaku 24 jam • Satu kali unduh</p>`;
    btnArea.classList.remove('hidden');
  };

  const confetti = () => {
    // Lightweight confetti
    const colors = ['#7C3AED', '#F59E0B', '#10B981', '#3B82F6', '#EC4899'];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `
        left: ${Math.random() * 100}vw;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-delay: ${Math.random() * 0.5}s;
        animation-duration: ${0.8 + Math.random() * 0.6}s;
        width: ${6 + Math.random() * 6}px;
        height: ${6 + Math.random() * 6}px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1500);
    }
  };

  return {
    showLoading, hideLoading, showError, showMessage,
    renderStorefront, showPaymentModal, setPaymentStatus,
    showDownloadButton, confetti,
  };
})();

// ── Boot ──
document.addEventListener('DOMContentLoaded', () => App.init());
