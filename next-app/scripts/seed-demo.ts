/**
 * Fills the local database with a workshop's worth of realistic history so the
 * app can be exercised at a volume that actually exposes slow queries. The
 * default seed in `ensureDbSetup` only creates the two logins and the two
 * stock locations, which is enough to boot and nothing like enough to test.
 *
 *   npx tsx scripts/seed-demo.ts            # add data, keep what is there
 *   npx tsx scripts/seed-demo.ts --reset    # clear business data first
 *   SCALE=3 npx tsx scripts/seed-demo.ts    # three times the volume
 *
 * PGlite is single-process: stop the dev/prod server before running this, or
 * two processes end up writing the same data directory.
 */
import { eq } from "drizzle-orm";
import { db, ensureDbSetup } from "../src/server/db/connection";
import * as schema from "../src/server/db/schema";

const RESET = process.argv.includes("--reset");
const SCALE = Number(process.env.SCALE ?? 1);

/** Deterministic RNG, so a re-run produces the same workshop. */
let seed = 20260829;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const money = (lo: number, hi: number) => (int(lo * 100, hi * 100) / 100).toFixed(2);

const DAYS = 210;
/** A timestamp somewhere in the last DAYS days, biased towards recent. */
function pastDate(maxDaysAgo = DAYS) {
  const daysAgo = Math.floor(Math.pow(rnd(), 1.6) * maxDaysAgo);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(int(9, 19), int(0, 59), int(0, 59), 0);
  return d;
}

const FIRST = ["Rahul","Priya","Amit","Sneha","Vikram","Anjali","Rajesh","Kavita","Suresh","Meera","Arjun","Divya","Sanjay","Pooja","Karthik","Nisha","Manoj","Lakshmi","Ravi","Deepa","Imran","Fatima","Joseph","Anita","Gopal","Shruti","Naveen","Rekha","Farhan","Sunita"] as const;
const LAST = ["Sharma","Patel","Reddy","Nair","Iyer","Singh","Kumar","Das","Menon","Joshi","Verma","Pillai","Rao","Gupta","Shetty","Khan","Bose","Chauhan","Naidu","Mehta"] as const;
const CARS = ["Maruti Swift","Hyundai i20","Tata Nexon","Honda City","Toyota Innova","Maruti Baleno","Hyundai Creta","Mahindra XUV500","Tata Tiago","Kia Seltos","Honda Amaze","Renault Kwid"] as const;
const BIKES = ["Hero Splendor","Honda Shine","Bajaj Pulsar 150","TVS Apache RTR","Royal Enfield Classic 350","Yamaha FZ","Bajaj Platina","Hero Passion Pro"] as const;
const SCOOTIES = ["Honda Activa","TVS Jupiter","Suzuki Access 125","Hero Maestro","Yamaha Fascino"] as const;
const AUTOS = ["Bajaj RE","Piaggio Ape","Mahindra Alfa"] as const;

const CATEGORY_NAMES = ["Engine Oil","Oil Filters","Air Filters","Fuel Filters","Brake Pads","Brake Discs","Brake Fluid","Clutch Plates","Clutch Cables","Batteries","Spark Plugs","Ignition Coils","Headlamps","Tail Lamps","Indicators","Wiper Blades","Tyres","Tubes","Wheel Bearings","Suspension","Shock Absorbers","Coolants","Radiators","Timing Belts","Drive Chains","Sprockets","Gaskets","Seals & O-Rings","Bulbs & Fuses","Horns","Mirrors","Body Panels","Bumpers","Windshields","Fasteners","Greases","Cables","Sensors","Belts","Hoses"] as const;

const BRANDS = ["Bosch","Castrol","Mobil","TVS","Exide","Amaron","MRF","CEAT","Gabriel","Lumax","Minda","Valeo","NGK","Motul","Shell"] as const;
const PART_WORDS = ["Standard","Premium","Heavy Duty","OEM","Performance","Economy","Long Life","All Weather"] as const;

const COMPLAINTS = ["Engine making noise on acceleration","Brakes feel spongy","AC not cooling","Battery drains overnight","Oil leak near sump","Clutch slipping in higher gears","Headlamp flickering","Vibration above 60 kmph","Overheating in traffic","Routine service due","Chain making noise","Suspension bottoming out","Starting trouble in the morning","Mileage dropped noticeably","Horn not working"] as const;
const LABOUR = [["Full service","1200"],["Engine oil change","350"],["Brake pad replacement","600"],["Clutch overhaul","2500"],["AC servicing","1500"],["Wheel alignment","800"],["Battery replacement","250"],["Chain sprocket fitting","450"],["General inspection","300"],["Electrical diagnosis","700"]] as const;

async function chunked<T>(rows: T[], insert: (batch: T[]) => Promise<unknown>, size = 200) {
  for (let i = 0; i < rows.length; i += size) await insert(rows.slice(i, i + size));
}

async function resetBusinessData() {
  for (const table of [
    "stock_movements","stock_transfer_items","stock_transfers","invoice_items",
    "payments","invoices","job_labour","job_parts","jobs","vehicles","customers",
    "inventory_balances","parts","categories","suppliers","audit_logs",
  ]) {
    await db.execute(`delete from ${table}`);
  }
}

async function main() {
  const t0 = Date.now();
  await ensureDbSetup();
  console.log(`  setup                ${Date.now() - t0} ms`);

  if (RESET) {
    const t = Date.now();
    await resetBusinessData();
    console.log(`  reset                ${Date.now() - t} ms`);
  }

  const [shop] = await db.select().from(schema.inventoryLocations).where(eq(schema.inventoryLocations.code, "SHOP")).limit(1);
  const [warehouse] = await db.select().from(schema.inventoryLocations).where(eq(schema.inventoryLocations.code, "WAREHOUSE")).limit(1);
  if (!shop || !warehouse) throw new Error("Stock locations missing — run the app once so ensureDbSetup can seed them.");

  const step = async <T,>(label: string, fn: () => Promise<T>): Promise<T> => {
    const t = Date.now();
    const out = await fn();
    console.log(`  ${label.padEnd(20)} ${String(Date.now() - t).padStart(5)} ms`);
    return out;
  };

  // ── Suppliers ──────────────────────────────────────────────────────
  const suppliers = await step("suppliers", async () =>
    db.insert(schema.suppliers).values(
      Array.from({ length: 40 * SCALE }, (_, i) => ({
        name: `${pick(BRANDS)} Distributors ${i + 1}`,
        phone: `9${int(100000000, 999999999)}`,
        address: `${int(1, 200)}, ${pick(["MG Road","Industrial Estate","Ring Road","Market Street"])}`,
      })),
    ).returning({ id: schema.suppliers.id }),
  );

  // ── Categories ─────────────────────────────────────────────────────
  const categories = await step("categories", async () =>
    db.insert(schema.categories).values(
      CATEGORY_NAMES.map((name) => ({ name, description: `${name} for cars, bikes and three-wheelers` })),
    ).returning({ id: schema.categories.id, name: schema.categories.name }),
  );

  // ── Parts (10 per category) ────────────────────────────────────────
  const partRows = (categories as any[]).flatMap((c: any) =>
    Array.from({ length: 10 * SCALE }, (_, i) => {
      const purchase = Number(money(80, 4000));
      return {
        categoryId: c.id,
        supplierId: (pick(suppliers) as any).id,
        name: `${c.name.replace(/s$/, "")} ${pick(PART_WORDS)} ${pick(BRANDS)} ${i + 1}`,
        partNumber: `PN-${int(10000, 99999)}-${i}`,
        brand: pick(BRANDS),
        purchasePrice: purchase.toFixed(2),
        sellingPrice: (purchase * (1.18 + rnd() * 0.4)).toFixed(2),
        minimumShopStock: int(2, 10),
        minimumWarehouseStock: int(5, 25),
        unit: pick(["pcs", "set", "ltr", "box"]),
        barcode: `89${int(10000000000, 99999999999)}`,
        attributes: [
          { label: "Fitment", value: pick([...CARS, ...BIKES]) },
          { label: "Warranty", value: `${int(3, 24)} months` },
        ],
      };
    }),
  );
  const parts = await step("parts", async () => {
    const out: any[] = [];
    await chunked(partRows, async (b) => {
      out.push(...(await db.insert(schema.parts).values(b).returning({ id: schema.parts.id })));
    });
    return out;
  });

  // ── Opening stock at both locations ────────────────────────────────
  await step("inventory balances", async () => {
    const rows = parts.flatMap((p: any) => [
      { partId: p.id, locationId: shop.id, quantity: int(0, 30) },
      { partId: p.id, locationId: warehouse.id, quantity: int(0, 90) },
    ]);
    await chunked(rows, (b) => db.insert(schema.inventoryBalances).values(b));
    return rows.length;
  });

  await step("stock movements", async () => {
    const rows = parts.flatMap((p: any) =>
      Array.from({ length: int(1, 4) }, () => ({
        partId: p.id,
        locationId: pick([shop, warehouse]).id,
        movementType: pick(["STOCK_IN", "TRANSFER_IN", "TRANSFER_OUT", "ADJUSTMENT", "DAMAGE"] as const),
        quantity: int(1, 40),
        referenceType: "SEED",
        notes: "Opening history",
        createdAt: pastDate(),
      })),
    );
    await chunked(rows, (b) => db.insert(schema.stockMovements).values(b));
    return rows.length;
  });

  // ── Customers and vehicles ─────────────────────────────────────────
  const customers = await step("customers", async () =>
    db.insert(schema.customers).values(
      Array.from({ length: 60 * SCALE }, () => ({
        name: `${pick(FIRST)} ${pick(LAST)}`,
        phone: `9${int(100000000, 999999999)}`,
        address: `${int(1, 400)}, ${pick(["Gandhi Nagar","Jayanagar","Anna Nagar","Kothrud","Salt Lake","Banjara Hills"])}`,
        notes: rnd() < 0.25 ? "Regular customer — prefers evening pickup" : null,
        createdAt: pastDate(),
      })),
    ).returning({ id: schema.customers.id }),
  );

  const vehicles = await step("vehicles", async () => {
    const rows = customers.flatMap((c: any) =>
      Array.from({ length: rnd() < 0.35 ? 2 : 1 }, () => {
        const type = pick(["CAR", "BIKE", "SCOOTY", "AUTO"] as const);
        const name =
          type === "CAR" ? pick(CARS) : type === "BIKE" ? pick(BIKES) : type === "SCOOTY" ? pick(SCOOTIES) : pick(AUTOS);
        return {
          customerId: c.id,
          vehicleType: type,
          vehicleName: name,
          registrationNumber: `${pick(["KA","MH","TN","DL","WB","TS"])}${int(10, 49)}${pick(["AB","CJ","MN","XY","PQ"])}${int(1000, 9999)}`,
        };
      }),
    );
    return db.insert(schema.vehicles).values(rows).returning({ id: schema.vehicles.id, customerId: schema.vehicles.customerId });
  });

  // ── Jobs, then invoices for the completed ones ──────────────────────
  const jobCount = 120 * SCALE;
  const jobs = await step("jobs", async () => {
    const rows = Array.from({ length: jobCount }, (_, i) => {
      const v = pick(vehicles) as any;
      const created = pastDate();
      const status = rnd() < 0.16 ? "OPEN" : rnd() < 0.05 ? "CANCELLED" : "COMPLETED";
      return {
        jobNumber: `JOB-${String(i + 1).padStart(5, "0")}`,
        customerId: v.customerId,
        vehicleId: v.id,
        complaint: pick(COMPLAINTS),
        workNotes: rnd() < 0.6 ? "Work carried out and road tested." : null,
        odometerReading: String(int(4000, 140000)),
        status: status as any,
        completedAt: status === "COMPLETED" ? created : null,
        createdAt: created,
      };
    });
    const out: any[] = [];
    await chunked(rows, async (b) => {
      out.push(...(await db.insert(schema.jobs).values(b).returning({
        id: schema.jobs.id, customerId: schema.jobs.customerId, vehicleId: schema.jobs.vehicleId,
        status: schema.jobs.status, createdAt: schema.jobs.createdAt,
      })));
    });
    return out;
  });

  const jobPartRows: any[] = [];
  const jobLabourRows: any[] = [];
  const jobTotals = new Map<string, number>();
  for (const j of jobs) {
    let total = 0;
    for (let k = 0; k < int(1, 5); k++) {
      const p = pick(parts);
      const qty = int(1, 4);
      const unit = Number(money(120, 3500));
      total += unit * qty;
      jobPartRows.push({
        jobId: j.id, partId: p.id, partName: `Part ${k + 1}`, quantity: qty,
        unitPrice: unit.toFixed(2), totalPrice: (unit * qty).toFixed(2), createdAt: j.createdAt,
      });
    }
    for (let k = 0; k < int(1, 3); k++) {
      const [desc, amt] = pick(LABOUR);
      total += Number(amt);
      jobLabourRows.push({ jobId: j.id, description: desc, amount: amt, createdAt: j.createdAt });
    }
    jobTotals.set(j.id, total);
  }
  await step("job parts", async () => { await chunked(jobPartRows, (b) => db.insert(schema.jobParts).values(b)); return jobPartRows.length; });
  await step("job labour", async () => { await chunked(jobLabourRows, (b) => db.insert(schema.jobLabour).values(b)); return jobLabourRows.length; });

  const completed = jobs.filter((j: any) => j.status === "COMPLETED");
  const invoices = await step("invoices", async () => {
    const rows = completed.map((j: any, i: number) => {
      const subtotal = jobTotals.get(j.id) ?? 1000;
      const discount = rnd() < 0.3 ? Math.round(subtotal * 0.05) : 0;
      const total = subtotal - discount;
      // Most are settled; a realistic tail stays partly or wholly unpaid.
      const roll = rnd();
      const paid = roll < 0.68 ? total : roll < 0.9 ? Math.round(total * (0.2 + rnd() * 0.5)) : 0;
      const due = total - paid;
      return {
        invoiceNumber: `INV-${String(i + 1).padStart(5, "0")}`,
        jobId: j.id, customerId: j.customerId, vehicleId: j.vehicleId,
        subtotal: subtotal.toFixed(2), discount: discount.toFixed(2), total: total.toFixed(2),
        paidAmount: paid.toFixed(2), dueAmount: due.toFixed(2),
        status: (due === 0 ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "ISSUED") as any,
        createdAt: j.createdAt,
      };
    });
    const out: any[] = [];
    await chunked(rows, async (b) => {
      out.push(...(await db.insert(schema.invoices).values(b).returning({
        id: schema.invoices.id, customerId: schema.invoices.customerId,
        paidAmount: schema.invoices.paidAmount, createdAt: schema.invoices.createdAt,
      })));
    });
    return out;
  });

  await step("invoice items", async () => {
    const rows = invoices.flatMap((inv: any) =>
      Array.from({ length: int(2, 6) }, (_, k) => {
        const qty = int(1, 3);
        const unit = Number(money(150, 2800));
        return {
          invoiceId: inv.id,
          itemType: k % 2 === 0 ? "PART" : "LABOUR",
          description: k % 2 === 0 ? `${pick(BRANDS)} ${pick(CATEGORY_NAMES)}` : pick(LABOUR)[0],
          quantity: String(qty), unitPrice: unit.toFixed(2), totalPrice: (unit * qty).toFixed(2),
        };
      }),
    );
    await chunked(rows, (b) => db.insert(schema.invoiceItems).values(b));
    return rows.length;
  });

  await step("payments", async () => {
    const rows = invoices
      .filter((inv: any) => Number(inv.paidAmount) > 0)
      .flatMap((inv: any) => {
        const total = Number(inv.paidAmount);
        const parts_ = rnd() < 0.25 ? 2 : 1;
        const each = total / parts_;
        return Array.from({ length: parts_ }, () => ({
          invoiceId: inv.id, customerId: inv.customerId, amount: each.toFixed(2),
          paymentMethod: pick(["CASH", "UPI", "CARD", "BANK_TRANSFER"] as const),
          createdAt: inv.createdAt,
        }));
      });
    await chunked(rows, (b) => db.insert(schema.payments).values(b));
    return rows.length;
  });

  await step("audit logs", async () => {
    const [admin] = await db.select().from(schema.users).limit(1);
    const rows = Array.from({ length: 250 * SCALE }, () => ({
      userId: admin?.id ?? null,
      userName: admin?.name ?? "Admin Owner",
      action: pick(["CREATE_JOB","COMPLETE_JOB","CREATE_INVOICE","RECORD_PAYMENT","STOCK_IN","ADJUST_STOCK","UPDATE_PART","CREATE_CUSTOMER"]),
      resourceType: pick(["JOB", "INVOICE", "PART", "CUSTOMER"]),
      resourceId: String(int(1000, 9999)),
      details: "Seeded activity",
      ipAddress: `10.0.${int(0, 255)}.${int(1, 254)}`,
      createdAt: pastDate(),
    }));
    await chunked(rows, (b) => db.insert(schema.auditLogs).values(b));
    return rows.length;
  });

  console.log(`\n  total                ${Date.now() - t0} ms\n`);

  const tables = ["categories","suppliers","parts","inventory_balances","stock_movements","customers","vehicles","jobs","job_parts","job_labour","invoices","invoice_items","payments","audit_logs"];
  console.log("  final row counts");
  for (const t of tables) {
    const r: any = await db.execute(`select count(*)::int as n from ${t}`);
    const n = (r.rows ?? r)[0].n;
    console.log(`    ${t.padEnd(20)} ${String(n).padStart(6)}`);
  }
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
