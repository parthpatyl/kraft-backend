import puppeteer from 'puppeteer';

const BASES = {
  backend: 'http://localhost:5000',
  customer: 'http://localhost:5173',
  admin: 'http://localhost:5174',
};

let browser;
const results = [];

function log(label, pass, detail = '') {
  const icon = pass ? 'PASS' : 'FAIL';
  results.push({ label, icon, detail });
  console.log(`  [${icon}] ${label}${detail ? ' — ' + detail : ''}`);
}

async function run() {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  // ──────────────────────────────────────────────
  // 1. BACKEND API TESTS
  // ──────────────────────────────────────────────
  console.log('\n=== Backend API ===');
  const apiPage = await browser.newPage();

  // 1a. Health check — uses SMTP verify which can be slow, so use evaluate fetch with timeout
  try {
    const healthResult = await apiPage.evaluate(async (url) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        return { status: res.status, body: await res.json() };
      } catch (e) {
        clearTimeout(timer);
        return { error: e.message };
      }
    }, `${BASES.backend}/api/health`);
    if (healthResult.error) {
      log('GET /api/health', false, `${healthResult.error} (SMTP check may be slow)`);
    } else {
      log('GET /api/health returns 200', healthResult.status === 200, `status=${healthResult.status}`);
      log('Health response ok', healthResult.body?.status === 'OK', JSON.stringify(healthResult.body));
    }
  } catch (e) {
    log('GET /api/health', false, e.message);
  }

  // 1b. Packages API
  try {
    const pkgRes = await apiPage.goto(`${BASES.backend}/api/packages`);
    const pkgJson = await pkgRes.json();
    log('GET /api/packages returns 200', pkgRes.status() === 200);
    log('Packages is an array', Array.isArray(pkgJson), `count=${pkgJson.length}`);
    if (pkgJson.length > 0) {
      const pkg = pkgJson[0];
      log('Package has id', !!pkg.id);
      log('Package has name', !!pkg.name);
      log('Package has price', pkg.price !== undefined, `price=${pkg.price}`);
    }
  } catch (e) {
    log('GET /api/packages', false, e.message);
  }

  // 1c. Group departures API
  try {
    const gdRes = await apiPage.goto(`${BASES.backend}/api/group-departures`);
    const gdJson = await gdRes.json();
    log('GET /api/group-departures returns 200', gdRes.status() === 200);
    log('Group departures is an array', Array.isArray(gdJson), `count=${gdJson.length}`);
    if (gdJson.length > 0) {
      const dep = gdJson[0];
      log('Departure has id', dep.id !== undefined);
      log('Departure has departureDate', !!dep.departureDate);
      // slots is a nested object: { booked, total }
      const slotsTotal = dep.slots?.total ?? dep.slotsTotal;
      log('Departure has slots.total', slotsTotal !== undefined, `slots.total=${slotsTotal}`);
      log('Departure has package info', !!(dep.packageId || dep.packageName));
      log('Departure has status', !!dep.status, `status=${dep.status}`);
    }
  } catch (e) {
    log('GET /api/group-departures', false, e.message);
  }

  // 1d. Testimonials
  try {
    const testRes = await apiPage.goto(`${BASES.backend}/api/testimonials`);
    const testJson = await testRes.json();
    log('GET /api/testimonials returns 200', testRes.status() === 200);
    log('Testimonials is an array', Array.isArray(testJson));
  } catch (e) {
    log('GET /api/testimonials', false, e.message);
  }

  // 1e. Settings
  try {
    const settRes = await apiPage.goto(`${BASES.backend}/api/settings`);
    const settJson = await settRes.json();
    log('GET /api/settings returns 200', settRes.status() === 200);
    log('Settings has agencyName key', 'agencyName' in settJson, `value="${settJson.agencyName}"`);
    log('Settings has heroSection', !!settJson.heroSection);
    log('Settings has specialOffers', Array.isArray(settJson.specialOffers), `count=${settJson.specialOffers?.length}`);
  } catch (e) {
    log('GET /api/settings', false, e.message);
  }

  // 1f. Booking inquiry POST (validation test) — use fetch from page context
  try {
    const inqResult = await apiPage.evaluate(async (url) => {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      return { status: res.status, body: await res.json() };
    }, `${BASES.backend}/api/bookings/inquiry`);
    log('POST /api/bookings/inquiry rejects empty body', inqResult.status === 400, `status=${inqResult.status} error=${inqResult.body?.error}`);
  } catch (e) {
    log('POST /api/bookings/inquiry', false, e.message);
  }

  await apiPage.close();

  // ──────────────────────────────────────────────
  // 2. CUSTOMER SITE BROWSER TESTS
  // ──────────────────────────────────────────────
  console.log('\n=== Customer Site ===');
  const custPage = await browser.newPage();
  const custErrors = [];
  custPage.on('pageerror', (err) => custErrors.push(err.message));

  try {
    const custRes = await custPage.goto(`${BASES.customer}`, { waitUntil: 'networkidle2', timeout: 30000 });
    log('Customer site loads', custRes.status() === 200, `status=${custRes.status()}`);
    log('No uncaught page errors', custErrors.length === 0, custErrors.length > 0 ? custErrors.slice(0, 3).join('; ') : 'clean');

    const title = await custPage.title();
    log('Page has title', title.length > 0, `title="${title}"`);

    const bodyText = await custPage.evaluate(() => document.body.innerText);
    log('Page has visible text', bodyText.length > 100, `chars=${bodyText.length}`);
    log('Brand name visible', bodyText.toLowerCase().includes('kraft'));

    // Check navigation
    const navLinks = await custPage.evaluate(() => {
      return Array.from(document.querySelectorAll('nav a, header a, button'))
        .map(el => el.textContent.trim())
        .filter(t => t.length > 0 && t.length < 50);
    });
    log('Navigation rendered', navLinks.length > 0, navLinks.join(', '));

    // Look for any link/button related to group tours or upcoming trips
    const groupKeywords = ['group', 'upcoming', 'depart', 'tour'];
    const hasGroupLink = navLinks.some(l => groupKeywords.some(k => l.toLowerCase().includes(k)));
    log('Group tours nav link', hasGroupLink, hasGroupLink ? navLinks.find(l => groupKeywords.some(k => l.toLowerCase().includes(k))) : 'none found');

    // Check hero section
    const hasHero = bodyText.includes('journey') || bodyText.includes('travel') || bodyText.includes('explore');
    log('Hero section rendered', hasHero);

    // Check for packages section visible on page
    const hasPackages = bodyText.includes('Vietnam') || bodyText.includes('Swiss') || bodyText.includes('Alps') || bodyText.includes('Explore');
    log('Packages section renders', hasPackages);

    // Check for any runtime errors accumulated
    log('No console errors after interaction', custErrors.length === 0, custErrors.length > 0 ? custErrors.slice(0, 3).join('; ') : 'clean');

  } catch (e) {
    log('Customer site', false, e.message);
  }

  await custPage.close();

  // ──────────────────────────────────────────────
  // 3. ADMIN DASHBOARD BROWSER TESTS
  // ──────────────────────────────────────────────
  console.log('\n=== Admin Dashboard ===');
  const adminPage = await browser.newPage();
  const adminErrors = [];
  adminPage.on('pageerror', (err) => adminErrors.push(err.message));

  try {
    const adminRes = await adminPage.goto(`${BASES.admin}`, { waitUntil: 'networkidle2', timeout: 30000 });
    log('Admin dashboard loads', adminRes.status() === 200, `status=${adminRes.status()}`);
    log('No uncaught page errors', adminErrors.length === 0, adminErrors.length > 0 ? adminErrors.slice(0, 3).join('; ') : 'clean');

    const title = await adminPage.title();
    log('Page has title', title.length > 0, `title="${title}"`);

    const bodyText = await adminPage.evaluate(() => document.body.innerText);
    log('Page has visible text', bodyText.length > 50, `chars=${bodyText.length}`);

    // The admin dashboard may show a login screen - check what's on the page
    const pageContent = bodyText.substring(0, 500);
    const hasLogin = pageContent.toLowerCase().includes('sign in') || pageContent.toLowerCase().includes('login') || pageContent.toLowerCase().includes('email');
    log('Login screen shown (auth required)', hasLogin, `content="${pageContent.substring(0, 100)}..."`);

    // If login is shown, try logging in with test credentials
    if (hasLogin) {
      try {
        const emailInput = await adminPage.$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
        const passInput = await adminPage.$('input[type="password"], input[name="password"]');
        if (emailInput && passInput) {
          await emailInput.type('admin@kraftyourtrip.com');
          await passInput.type('admin123');
          const submitBtn = await adminPage.$('button[type="submit"], button');
          if (submitBtn) {
            await submitBtn.click();
            await new Promise(r => setTimeout(r, 3000));
            const afterLogin = await adminPage.evaluate(() => document.body.innerText);
            log('Login attempt executed', true);
            log('Dashboard visible after login', afterLogin.toLowerCase().includes('dashboard') || afterLogin.toLowerCase().includes('package') || afterLogin.length > 300, `chars=${afterLogin.length}`);
          }
        } else {
          log('Login form inputs found', false, 'email or password input missing');
        }
      } catch (e) {
        log('Login flow', false, e.message);
      }
    } else {
      // Dashboard is already visible without login
      const hasMetrics = bodyText.toLowerCase().includes('revenue') || bodyText.toLowerCase().includes('booking') || bodyText.toLowerCase().includes('package');
      log('Dashboard metrics visible', hasMetrics);

      // Check tabs
      const tabs = await adminPage.evaluate(() => {
        return Array.from(document.querySelectorAll('button, [role="tab"]'))
          .map(el => el.textContent.trim())
          .filter(t => t.length > 0 && t.length < 50);
      });
      log('Navigation tabs found', tabs.length > 0, tabs.slice(0, 5).join(', '));
    }

    log('No errors after interaction', adminErrors.length === 0, adminErrors.length > 0 ? adminErrors.slice(0, 5).join('; ') : 'clean');

  } catch (e) {
    log('Admin dashboard', false, e.message);
  }

  await adminPage.close();

  // ──────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────
  const passed = results.filter(r => r.icon === 'PASS').length;
  const failed = results.filter(r => r.icon === 'FAIL').length;
  console.log(`\n${'='.repeat(50)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${results.length} total`);
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.icon === 'FAIL').forEach(r => {
      console.log(`  FAIL: ${r.label}${r.detail ? ' — ' + r.detail : ''}`);
    });
  }
  console.log(`${'='.repeat(50)}\n`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(async (e) => {
  console.error('Fatal error:', e);
  if (browser) await browser.close();
  process.exit(1);
});
