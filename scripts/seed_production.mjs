import { initialPackages, initialGroupDepartures, initialTestimonials, initialCorporatePackages } from '../db/seedData.js';

const API_BASE = process.env.LIVE_API_URL || 'https://kraft-backend-ndss.onrender.com';

async function seedProduction() {
  console.log(`Starting production seed against: ${API_BASE}`);

  // 1. Authenticate as Admin
  console.log('Logging in as Admin...');
  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@kraftyourtrip.com',
      password: 'admin123'
    })
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}: ${await loginRes.text()}`);
  }

  const { token } = await loginRes.json();
  console.log('Logged in successfully. Auth token obtained.');

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Seed Packages
  console.log('\n--- Seeding Packages ---');
  const existingPkgsRes = await fetch(`${API_BASE}/api/packages`, { headers: authHeaders });
  const existingPkgs = await existingPkgsRes.json();
  const existingPkgIds = new Set((Array.isArray(existingPkgs) ? existingPkgs : []).map(p => p.id));
  console.log(`Found ${existingPkgIds.size} existing packages.`);

  for (const pkg of initialPackages) {
    if (existingPkgIds.has(pkg.id)) {
      console.log(`Updating package: ${pkg.name} (${pkg.id})`);
      const updateRes = await fetch(`${API_BASE}/api/packages/${pkg.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(pkg)
      });
      if (!updateRes.ok) console.warn(`Failed to update package ${pkg.id}:`, await updateRes.text());
    } else {
      console.log(`Creating package: ${pkg.name} (${pkg.id})`);
      const createRes = await fetch(`${API_BASE}/api/packages`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(pkg)
      });
      if (!createRes.ok) console.warn(`Failed to create package ${pkg.id}:`, await createRes.text());
    }
  }

  // 3. Seed Group Departures
  console.log('\n--- Seeding Group Departures ---');
  const existingDepsRes = await fetch(`${API_BASE}/api/group-departures`, { headers: authHeaders });
  const existingDeps = await existingDepsRes.json();
  const existingDepTitles = new Set((Array.isArray(existingDeps) ? existingDeps : []).map(d => d.title));
  console.log(`Found ${existingDepTitles.size} existing group departures.`);

  for (const dep of initialGroupDepartures) {
    if (existingDepTitles.has(dep.title)) {
      console.log(`Group departure already exists: "${dep.title}"`);
    } else {
      console.log(`Creating group departure: "${dep.title}" for package ${dep.packageId}`);
      const createRes = await fetch(`${API_BASE}/api/group-departures`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(dep)
      });
      if (!createRes.ok) {
        console.warn(`Failed to create departure "${dep.title}":`, await createRes.text());
      } else {
        const created = await createRes.json();
        console.log(`Created departure ID ${created.id} ("${created.title}")`);
      }
    }
  }

  // 4. Seed Testimonials / Trip Stories
  console.log('\n--- Seeding Testimonials / Trip Stories ---');
  const existingTestRes = await fetch(`${API_BASE}/api/testimonials`, { headers: authHeaders });
  const existingTests = await existingTestRes.json();
  const existingTestNames = new Set((Array.isArray(existingTests) ? existingTests : []).map(t => t.name));
  console.log(`Found ${existingTestNames.size} existing testimonials.`);

  for (const t of initialTestimonials) {
    if (existingTestNames.has(t.name)) {
      console.log(`Testimonial already exists for: "${t.name}"`);
    } else {
      console.log(`Creating testimonial for: "${t.name}" with ${t.images?.length || 0} images`);
      const createRes = await fetch(`${API_BASE}/api/testimonials`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(t)
      });
      if (!createRes.ok) {
        console.warn(`Failed to create testimonial for "${t.name}":`, await createRes.text());
      } else {
        const created = await createRes.json();
        console.log(`Created testimonial ID ${created.id} ("${created.name}")`);
      }
    }
  }

  // 5. Seed Corporate Packages
  console.log('\n--- Seeding Corporate Packages ---');
  const existingCorpRes = await fetch(`${API_BASE}/api/corporate-packages`, { headers: authHeaders });
  const existingCorps = await existingCorpRes.json();
  const existingCorpDest = new Set((Array.isArray(existingCorps) ? existingCorps : []).map(c => c.destination));
  console.log(`Found ${existingCorpDest.size} existing corporate packages.`);

  for (const corp of initialCorporatePackages) {
    if (existingCorpDest.has(corp.destination)) {
      console.log(`Corporate package already exists: "${corp.destination}"`);
    } else {
      console.log(`Creating corporate package: "${corp.destination}"`);
      const createRes = await fetch(`${API_BASE}/api/corporate-packages`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(corp)
      });
      if (!createRes.ok) {
        console.warn(`Failed to create corporate package "${corp.destination}":`, await createRes.text());
      } else {
        const created = await createRes.json();
        console.log(`Created corporate package ID ${created.id} ("${created.destination}")`);
      }
    }
  }

  console.log('\n========================================');
  console.log('Production Seed Completed Successfully!');
  console.log('========================================');
}

seedProduction().catch(err => {
  console.error('Fatal error during production seed:', err);
  process.exit(1);
});
