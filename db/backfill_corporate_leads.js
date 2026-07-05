import { query } from './index.js';

async function backfill() {
  const { rows } = await query(
    `SELECT id, message FROM corporate_leads WHERE group_size IS NULL OR per_person_rate IS NULL`
  );
  console.log(`Found ${rows.length} leads with NULL fields`);

  for (const lead of rows) {
    const msg = lead.message || '';

    const groupSizeMatch = msg.match(/Estimated Group Size:\s*(\d+)/);
    const groupSize = groupSizeMatch ? parseInt(groupSizeMatch[1]) : null;

    const pkgMatch = msg.match(/Selected Destination\/Package:\s*(.+)/);
    let perPersonRate = null;
    if (pkgMatch) {
      const pkgName = pkgMatch[1].trim();
      const pkgResult = await query(
        `SELECT starting_price FROM corporate_packages WHERE LOWER(destination) LIKE LOWER($1) OR $1 LIKE '%' || LOWER(destination) || '%' LIMIT 1`,
        [`%${pkgName}%`]
      );
      if (pkgResult.rows.length > 0) {
        perPersonRate = pkgResult.rows[0].starting_price;
      }
    }

    if (groupSize != null || perPersonRate != null) {
      await query(
        `UPDATE corporate_leads SET group_size = COALESCE($1, group_size), per_person_rate = COALESCE($2, per_person_rate) WHERE id = $3`,
        [groupSize, perPersonRate, lead.id]
      );
      console.log(`  ${lead.id}: group=${groupSize} rate=${perPersonRate}`);
    } else {
      console.log(`  ${lead.id}: no parsable data`);
    }
  }

  console.log('Backfill complete.');
  process.exit(0);
}

backfill().catch(err => { console.error(err); process.exit(1); });
