import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { query, migrationsReady } from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.resolve(__dirname, '../db/backups');

async function backup() {
  await migrationsReady;
  const args = process.argv.slice(2);
  const remoteArg = args.find(a => a.startsWith('--remote='));
  const remoteUrl = remoteArg ? remoteArg.split('=')[1] : null;

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupData = {
    exportedAt: new Date().toISOString(),
    source: remoteUrl ? `Remote API: ${remoteUrl}` : 'Local/Connected PostgreSQL DB',
    packages: [],
    specialityCategories: [],
    packageSpecialityCategories: [],
    groupDepartures: [],
    corporatePackages: [],
    corporateClients: [],
    testimonials: [],
    settings: []
  };

  try {
    if (remoteUrl) {
      console.log(`[Backup] Fetching remote data from ${remoteUrl}...`);
      const pkgRes = await fetch(`${remoteUrl}/api/packages`);
      if (pkgRes.ok) {
        backupData.packages = await pkgRes.json();
        console.log(`[Backup] Retrieved ${backupData.packages.length} packages from remote API.`);
      } else {
        console.warn(`[Backup] Could not fetch /api/packages (HTTP ${pkgRes.status})`);
      }
    } else {
      console.log('[Backup] Querying database tables...');

      const [pkgs, specCats, pkgSpecCats, departures, corpPkgs, corpClients, testimonials, settings] = await Promise.all([
        query('SELECT * FROM packages ORDER BY created_at ASC').catch(() => ({ rows: [] })),
        query('SELECT * FROM speciality_categories ORDER BY sort_order ASC').catch(() => ({ rows: [] })),
        query('SELECT * FROM package_speciality_categories').catch(() => ({ rows: [] })),
        query('SELECT * FROM group_departures ORDER BY departure_date ASC').catch(() => ({ rows: [] })),
        query('SELECT * FROM corporate_packages ORDER BY display_order ASC').catch(() => ({ rows: [] })),
        query('SELECT * FROM corporate_clients ORDER BY display_order ASC').catch(() => ({ rows: [] })),
        query('SELECT * FROM testimonials ORDER BY id ASC').catch(() => ({ rows: [] })),
        query('SELECT * FROM settings').catch(() => ({ rows: [] }))
      ]);

      backupData.packages = pkgs.rows;
      backupData.specialityCategories = specCats.rows;
      backupData.packageSpecialityCategories = pkgSpecCats.rows;
      backupData.groupDepartures = departures.rows;
      backupData.corporatePackages = corpPkgs.rows;
      backupData.corporateClients = corpClients.rows;
      backupData.testimonials = testimonials.rows;
      backupData.settings = settings.rows;

      console.log(`[Backup] Retrieved:`);
      console.log(`  - Packages: ${backupData.packages.length}`);
      console.log(`  - Speciality Categories: ${backupData.specialityCategories.length}`);
      console.log(`  - Group Departures: ${backupData.groupDepartures.length}`);
      console.log(`  - Testimonials: ${backupData.testimonials.length}`);
      console.log(`  - Settings rows: ${backupData.settings.length}`);
    }

    const timestampFile = path.join(BACKUP_DIR, `snapshot_${timestamp}.json`);
    const latestFile = path.join(BACKUP_DIR, 'snapshot_latest.json');

    const jsonContent = JSON.stringify(backupData, null, 2);
    fs.writeFileSync(timestampFile, jsonContent, 'utf8');
    fs.writeFileSync(latestFile, jsonContent, 'utf8');

    console.log(`[Backup] Backup successfully written to:`);
    console.log(`  - ${timestampFile}`);
    console.log(`  - ${latestFile}`);
  } catch (err) {
    console.error('[Backup] Backup failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

backup();
