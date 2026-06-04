// public/js/views.js
// View renderers — Storefront, Home, Dashboard, Create

// ── STOREFRONT VIEW ──
const StorefrontView = (() => {
  const render = (store, products) => `
    <div class="storefront">

      <!-- Cover -->
      <div class="store-cover" style="${store.coverImage ? `background-image:url(${store.coverImage})` : ''}">
        <div class="cover-overlay"></div>
      </div>

      <!-- Store Header -->
      <div class="store-header">
        <div class="store-avatar">
          ${store.avatar
            ? `<img src="${store.avatar}" alt="${store.displayName}">`
            : `<div class="avatar-placeholder">${store.displayName.charAt(0).toUpperCase()}</div>`}
        </div>
        <div class="store-info">
          <h1 class="store-name">${store.displayName}</h1>
          <p class="store-handle">@${store.username}</p>
          ${store.bio ? `<p class="store-bio">${store.bio}</p>` : ''}
          <div class="store-badges">
            <span class="badge badge-pi">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-family="serif">π</text></svg>
              Pi Verified
            </span>
            <span class="badge badge-instant">⚡ Instant Download</span>
          </div>
        </div>
      </div>

      <!-- Social Links -->
      ${renderSocialLinks(store.socialLinks)}

      <!-- Products Grid -->
      <div class="products-section">
        <h2 class="section-title">Produk Digital</h2>
        ${products.length === 0
          ? `<div class="empty-state"><p>Belum ada produk</p></div>`
          : `<div class="products-grid">${products.map(renderProductCard).join('')}</div>`}
      </div>

      <!-- Footer -->
      <div class="store-footer">
        <a href="/" class="footer-brand">
          <span class="brand-pi">π</span> Cutway.pi
        </a>
        <span class="footer-tagline">Powered by Pi Network</span>
      </div>

    </div>

    <!-- Payment Modal -->
    <div id="payment-modal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3>Konfirmasi Pembelian</h3>
          <button id="btn-cancel-pay" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="product-summary">
            <p class="summary-name" id="modal-product-name"></p>
            <p class="summary-desc" id="modal-product-desc"></p>
            <div class="summary-price">
              <span>Total</span>
              <span class="price-value" id="modal-product-price"></span>
            </div>
            <div class="fee-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Platform fee 1π dikenakan dari harga produk
            </div>
          </div>
          <div id="payment-status" class="payment-status hidden">
            <div class="status-spinner"></div>
            <span class="status-text"></span>
          </div>
          <div id="download-area" class="hidden"></div>
        </div>
        <div class="modal-footer">
          <button id="btn-confirm-pay" class="btn-pay-pi">
            <span class="pi-icon">π</span>
            Bayar dengan Pi
          </button>
        </div>
      </div>
    </div>
  `;

  const renderProductCard = (product) => `
    <div class="product-card" data-product-id="${product.id}">
      <div class="product-cover">
        ${product.coverImage
          ? `<img src="${product.coverImage}" alt="${product.name}" loading="lazy">`
          : `<div class="cover-placeholder">
               <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                 <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                 <polyline points="14 2 14 8 20 8"/>
               </svg>
             </div>`}
        <div class="product-type-badge">${getTypeIcon(product.type)} ${product.type}</div>
      </div>
      <div class="product-body">
        <h3 class="product-name">${product.name}</h3>
        ${product.description ? `<p class="product-desc">${product.description}</p>` : ''}
        <div class="product-footer">
          <span class="product-price">π ${product.price}</span>
          <button class="btn-buy" onclick="App.buyProduct('${product.id}')">
            Beli Sekarang
          </button>
        </div>
        ${product.sales > 0 ? `<p class="product-sales">${product.sales} terjual</p>` : ''}
      </div>
    </div>
  `;

  const renderSocialLinks = (links = {}) => {
    const items = Object.entries(links).filter(([, v]) => v);
    if (!items.length) return '';
    return `
      <div class="social-links">
        ${items.map(([platform, url]) => `
          <a href="${url}" target="_blank" rel="noopener" class="social-link social-${platform}">
            ${getSocialIcon(platform)} ${platform}
          </a>`).join('')}
      </div>`;
  };

  const getTypeIcon = (type) => {
    const icons = { ebook: '📖', course: '🎓', template: '🎨', preset: '✨', plugin: '🔧', video: '🎬', audio: '🎵', other: '📦' };
    return icons[type] || '📦';
  };

  const getSocialIcon = (platform) => {
    const icons = { instagram: '📷', twitter: '🐦', tiktok: '🎵', youtube: '▶️', website: '🌐' };
    return icons[platform] || '🔗';
  };

  const bindEvents = (products) => {
    // Events handled via onclick in rendered HTML
  };

  return { render, bindEvents };
})();

// ── HOME VIEW ──
const HomeView = (() => {
  const render = () => `
    <div class="home-page">
      <header class="home-header">
        <div class="home-logo">
          <span class="logo-pi">π</span>
          <span class="logo-text">Cutway<span class="logo-accent">.pi</span></span>
        </div>
        <nav class="home-nav">
          <a href="/create" class="btn-nav">Buat Toko</a>
        </nav>
      </header>

      <section class="hero">
        <div class="hero-content">
          <div class="hero-badge">✨ Khusus Pi Browser</div>
          <h1 class="hero-title">
            Jual Produk Digital<br>
            <span class="hero-accent">Dibayar Pi Coin</span>
          </h1>
          <p class="hero-subtitle">
            Platform creator storefront terintegrasi Pi Network.<br>
            Pembayaran otomatis, download instan, tanpa konfirmasi manual.
          </p>
          <div class="hero-actions">
            <a href="/create" class="btn-primary">
              Buat Toko Gratis
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <a href="#how" class="btn-ghost">Cara Kerja</a>
          </div>
        </div>
        <div class="hero-visual">
          <div class="mockup-phone">
            <div class="phone-screen">
              <div class="phone-store">
                <div class="phone-avatar"></div>
                <div class="phone-name"></div>
                <div class="phone-card"></div>
                <div class="phone-card"></div>
                <div class="phone-btn">π Bayar Sekarang</div>
              </div>
            </div>
          </div>
          <div class="hero-float hero-float-1">π 12.5</div>
          <div class="hero-float hero-float-2">⚡ Auto Download</div>
          <div class="hero-float hero-float-3">✓ Verified</div>
        </div>
      </section>

      <section class="features" id="how">
        <h2 class="section-heading">Cara Kerja</h2>
        <div class="features-grid">
          ${[
            { icon: '🛍️', title: 'Buat Toko', desc: 'Setup storefront-mu dalam 2 menit. Upload produk digital.' },
            { icon: '🔗', title: 'Bagikan Link', desc: 'Kirim link toko ke followers. cutway.pi/username-mu.' },
            { icon: 'π', title: 'Terima Pi', desc: 'Buyer bayar lewat Pi Wallet. Langsung masuk, otomatis.' },
            { icon: '⚡', title: 'Auto Download', desc: 'Setelah bayar, file langsung bisa diunduh. Nol konfirmasi manual.' },
          ].map(f => `
            <div class="feature-card">
              <div class="feature-icon">${f.icon}</div>
              <h3>${f.title}</h3>
              <p>${f.desc}</p>
            </div>`).join('')}
        </div>
      </section>

      <section class="cta-section">
        <h2>Mulai Jual Hari Ini</h2>
        <p>Gratis setup. 1π platform fee per transaksi.</p>
        <a href="/create" class="btn-primary btn-large">
          Buat Toko Sekarang →
        </a>
      </section>

      <footer class="home-footer">
        <p>© 2024 Cutway.pi · Powered by Pi Network</p>
      </footer>
    </div>
  `;

  const bindEvents = () => {};

  return { render, bindEvents };
})();

// ── CREATE STORE VIEW ──
const CreateView = (() => {
  const render = () => `
    <div class="create-page">
      <div class="create-container">
        <a href="/" class="back-link">← Kembali</a>
        <h1 class="create-title">Buat Toko Pi-mu</h1>
        <p class="create-subtitle">Setup dalam 2 menit, langsung live.</p>

        <div class="create-form">
          <div class="form-group">
            <label>Username Toko</label>
            <div class="input-prefix">
              <span class="prefix">cutway.pi/</span>
              <input type="text" id="f-username" placeholder="username-mu" maxlength="30">
            </div>
            <div id="username-status" class="field-status"></div>
          </div>
          <div class="form-group">
            <label>Nama Toko</label>
            <input type="text" id="f-displayname" placeholder="Nama tokomu" maxlength="50">
          </div>
          <div class="form-group">
            <label>Bio (opsional)</label>
            <textarea id="f-bio" placeholder="Ceritakan tentang tokomu..." rows="3" maxlength="200"></textarea>
          </div>
          <div class="form-group">
            <label>Pi Wallet Address</label>
            <input type="text" id="f-wallet" placeholder="Alamat Pi wallet-mu">
            <p class="field-hint">Untuk menerima pembayaran dari pembeli</p>
          </div>

          <button class="btn-create-store" onclick="CreateView.submit()">
            <span class="pi-icon">π</span>
            Login Pi & Buat Toko
          </button>
        </div>
      </div>
    </div>
  `;

  const bindEvents = () => {
    const usernameInput = document.getElementById('f-username');
    let debounce;
    usernameInput?.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => checkUsername(e.target.value), 600);
    });
  };

  const checkUsername = async (username) => {
    const status = document.getElementById('username-status');
    if (username.length < 3) { status.textContent = ''; return; }
    status.textContent = 'Mengecek...';
    status.className = 'field-status';
    try {
      const res = await fetch(`/api/store/${username}`);
      if (res.ok) {
        status.textContent = '✗ Username sudah dipakai';
        status.className = 'field-status status-error';
      } else {
        status.textContent = '✓ Username tersedia!';
        status.className = 'field-status status-ok';
      }
    } catch { status.textContent = ''; }
  };

  const submit = async () => {
    const username = document.getElementById('f-username').value.trim();
    const displayName = document.getElementById('f-displayname').value.trim();
    const bio = document.getElementById('f-bio').value.trim();
    const piWallet = document.getElementById('f-wallet').value.trim();

    if (!username || !displayName || !piWallet) {
      UI.showMessage('Lengkapi semua field wajib', 'error');
      return;
    }

    try {
      UI.showMessage('Menghubungkan Pi Wallet...', 'info');
      const { accessToken } = await PiSDK.authenticate();

      const res = await fetch('/api/store/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-pi-access-token': accessToken },
        body: JSON.stringify({ username, displayName, bio, piWallet }),
      });
      const data = await res.json();

      if (data.success) {
        UI.showMessage('Toko berhasil dibuat! 🎉', 'success');
        setTimeout(() => window.location.href = `/${data.username}`, 1500);
      } else {
        UI.showMessage(data.error || 'Gagal membuat toko', 'error');
      }
    } catch (err) {
      UI.showMessage('Gagal: ' + err.message, 'error');
    }
  };

  return { render, bindEvents, submit };
})();

// ── DASHBOARD VIEW ──
const DashboardView = (() => {
  const render = () => `
    <div class="dashboard-page">
      <div class="dashboard-container">
        <div class="dash-header">
          <h1>Dashboard Penjual</h1>
          <p id="dash-store-name" class="dash-subtitle">Memuat...</p>
        </div>
        <div id="dash-content" class="dash-content">
          <div class="loading-screen"><div class="loader-ring"></div></div>
        </div>
      </div>
    </div>
  `;

  const init = async () => {
    try {
      const { accessToken } = await PiSDK.authenticate();
      // Get user's stores from server — simplified for demo
      // In production: GET /api/store/my-stores
      document.getElementById('dash-content').innerHTML = `
        <div class="dash-notice">
          <p>Dashboard aktif. Login berhasil sebagai <strong>${PiSDK.getUser()?.username}</strong>.</p>
          <p>Fitur dashboard lengkap akan ditampilkan setelah setup store.</p>
          <a href="/create" class="btn-primary">Buat Toko Baru</a>
        </div>`;
    } catch (err) {
      document.getElementById('dash-content').innerHTML = `
        <div class="error-screen"><p>Login Pi diperlukan untuk mengakses dashboard.</p></div>`;
    }
  };

  return { render, init };
})();
