import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { query, migrationsReady } from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.resolve(__dirname, '../db/backups');

async function restore() {
  await migrationsReady;
  const args = process.argv.slice(2);
  let targetFile = args[0] || path.join(BACKUP_DIR, 'snapshot_latest.json');

  if (!fs.existsSync(targetFile)) {
    console.error(`[Restore] Backup file not found: ${targetFile}`);
    process.exit(1);
  }

  console.log(`[Restore] Loading snapshot from ${targetFile}...`);
  const raw = fs.readFileSync(targetFile, 'utf8');
  const data = JSON.parse(raw);

  try {
    // 1. Restore Speciality Categories
    if (Array.isArray(data.specialityCategories) && data.specialityCategories.length > 0) {
      console.log(`[Restore] Restoring ${data.specialityCategories.length} speciality categories...`);
      for (const cat of data.specialityCategories) {
        await query(
          `INSERT INTO speciality_categories (id, name, subtitle, keyword, icon_name, icon_color, icon_bg, accent_color, default_count, sort_order, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             subtitle = EXCLUDED.subtitle,
             keyword = EXCLUDED.keyword,
             icon_name = EXCLUDED.icon_name,
             icon_color = EXCLUDED.icon_color,
             icon_bg = EXCLUDED.icon_bg,
             accent_color = EXCLUDED.accent_color,
             default_count = EXCLUDED.default_count,
             sort_order = EXCLUDED.sort_order,
             is_active = EXCLUDED.is_active`,
          [
            cat.id,
            cat.name,
            cat.subtitle,
            cat.keyword,
            cat.icon_name || cat.iconName || 'Compass',
            cat.icon_color || cat.iconColor || 'text-blue-600',
            cat.icon_bg || cat.iconBg || 'bg-blue-50',
            cat.accent_color || cat.accentColor || 'text-blue-400',
            cat.default_count || cat.defaultCount || 20,
            cat.sort_order || cat.sortOrder || 0,
            cat.is_active !== undefined ? cat.is_active : true
          ]
        );
      }
    }

    // 2. Restore Packages
    if (Array.isArray(data.packages) && data.packages.length > 0) {
      console.log(`[Restore] Restoring ${data.packages.length} packages (safe upsert)...`);
      for (const pkg of data.packages) {
        const id = pkg.id;
        const name = pkg.name;
        const duration = pkg.duration;
        const basePrice = pkg.base_price !== undefined ? pkg.base_price : (pkg.basePrice !== undefined ? pkg.basePrice : pkg.price);
        const costPrice = pkg.cost_price !== undefined ? pkg.cost_price : (pkg.costPrice ?? null);
        const taxRate = pkg.tax_rate !== undefined ? pkg.tax_rate : (pkg.taxRate ?? 5);
        const taxInclusive = pkg.tax_inclusive !== undefined ? pkg.tax_inclusive : (pkg.taxInclusive ?? true);
        const region = pkg.region;
        const category = pkg.category || 'standard';
        const slotsBooked = pkg.slots_booked !== undefined ? pkg.slots_booked : (pkg.slots?.booked || 0);
        const slotsTotal = pkg.slots_total !== undefined ? pkg.slots_total : (pkg.slots?.total || 10);
        const trend = pkg.trend;
        const inclusionsSelection = pkg.inclusions_selection || pkg.inclusionsSelection;
        const heroImage = pkg.hero_image || pkg.heroImage;
        const cardImage = pkg.card_image || pkg.cardImage;
        const description = pkg.description;
        const highlights = pkg.highlights || [];
        const inclusions = pkg.inclusions || [];
        const exclusions = pkg.exclusions || [];
        const itinerary = pkg.itinerary || [];
        const bestMonth = pkg.best_month || pkg.bestMonth || '';
        const ctaBadge = pkg.cta_badge || pkg.ctaBadge || '';
        const isBespoke = pkg.is_bespoke !== undefined ? pkg.is_bespoke : (pkg.isBespoke ?? false);
        const termsAndConditions = pkg.terms_and_conditions || pkg.termsAndConditions || '';

        await query(
          `INSERT INTO packages (id, name, duration, base_price, cost_price, tax_rate, tax_inclusive, region, category, slots_booked, slots_total, trend, inclusions_selection, hero_image, card_image, description, highlights, inclusions, exclusions, itinerary, best_month, cta_badge, is_bespoke, terms_and_conditions)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             duration = EXCLUDED.duration,
             base_price = EXCLUDED.base_price,
             cost_price = EXCLUDED.cost_price,
             tax_rate = EXCLUDED.tax_rate,
             tax_inclusive = EXCLUDED.tax_inclusive,
             region = EXCLUDED.region,
             category = EXCLUDED.category,
             slots_booked = EXCLUDED.slots_booked,
             slots_total = EXCLUDED.slots_total,
             trend = EXCLUDED.trend,
             inclusions_selection = EXCLUDED.inclusions_selection,
             hero_image = EXCLUDED.hero_image,
             card_image = EXCLUDED.card_image,
             description = EXCLUDED.description,
             highlights = EXCLUDED.highlights,
             inclusions = EXCLUDED.inclusions,
             exclusions = EXCLUDED.exclusions,
             itinerary = EXCLUDED.itinerary,
             best_month = EXCLUDED.best_month,
             cta_badge = EXCLUDED.cta_badge,
             is_bespoke = EXCLUDED.is_bespoke,
             terms_and_conditions = EXCLUDED.terms_and_conditions`,
          [
            id,
            name,
            duration,
            basePrice,
            costPrice,
            taxRate,
            taxInclusive,
            region,
            category,
            slotsBooked,
            slotsTotal,
            trend,
            inclusionsSelection ? JSON.stringify(inclusionsSelection) : null,
            heroImage,
            cardImage,
            description,
            highlights,
            inclusions,
            exclusions,
            itinerary ? JSON.stringify(itinerary) : null,
            bestMonth,
            ctaBadge,
            isBespoke,
            termsAndConditions
          ]
        );

        // Sync category links if present
        const categoryIds = pkg.category_ids || pkg.categoryIds;
        if (Array.isArray(categoryIds)) {
          for (const catId of categoryIds) {
            await query(
              'INSERT INTO package_speciality_categories (package_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [id, catId]
            );
          }
        }
      }
    }

    // 3. Restore Settings
    if (Array.isArray(data.settings) && data.settings.length > 0) {
      console.log(`[Restore] Restoring ${data.settings.length} settings rows...`);
      for (const s of data.settings) {
        await query(
          `INSERT INTO settings (key, value)
           VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [s.key, typeof s.value === 'string' ? s.value : JSON.stringify(s.value)]
        );
      }
    }

    console.log('[Restore] Database restore completed successfully without dropping any existing records!');
  } catch (err) {
    console.error('[Restore] Restore error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

restore();
