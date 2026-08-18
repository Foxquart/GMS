import argon2 from 'argon2';
import { db } from './connection';
import { users, garages, inventoryLocations } from './schema';
import { runMigrations } from './migrate';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Starting database setup & seed...\n');
  await runMigrations();

  // ─── Seed admin user ───────────────────────────────────────────────
  const adminEmail = 'admin@garage.com';
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (!existingUser) {
    const passwordHash = await argon2.hash('admin123');
    await db.insert(users).values({
      name: 'Admin Owner',
      email: adminEmail,
      passwordHash,
      role: 'admin',
    });
    console.log('✅ Admin user created (admin@garage.com / admin123)');
  } else {
    console.log('⏭️  Admin user already exists');
  }

  // ─── Seed garage settings ─────────────────────────────────────────
  const [existingGarage] = await db.select().from(garages).limit(1);
  if (!existingGarage) {
    await db.insert(garages).values({
      name: 'Vidya Mechanical Workshop',
      address: '123 Industrial Area, City',
      phone: '+91 98765 43210',
      email: 'contact@vidyagarage.com',
      gstNumber: '18AABCU9603R1ZM',
      invoicePrefix: 'INV',
      invoiceTerms: 'Payment due upon invoice generation. Thank you for your business!',
    });
    console.log('✅ Default garage settings created');
  } else {
    console.log('⏭️  Garage settings already exist');
  }

  // ─── Seed inventory locations ─────────────────────────────────────
  const [existingWarehouse] = await db
    .select()
    .from(inventoryLocations)
    .where(eq(inventoryLocations.code, 'WAREHOUSE'))
    .limit(1);

  if (!existingWarehouse) {
    await db.insert(inventoryLocations).values([
      { name: 'Main Warehouse', code: 'WAREHOUSE', locationType: 'WAREHOUSE' },
      { name: 'Main Shop', code: 'SHOP', locationType: 'SHOP' },
    ]);
    console.log('✅ Inventory locations created (WAREHOUSE, SHOP)');
  } else {
    console.log('⏭️  Inventory locations already exist');
  }

  console.log('\n🎉 Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
