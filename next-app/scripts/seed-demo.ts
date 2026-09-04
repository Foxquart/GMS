/**
 * Fills the local database with a workshop's worth of realistic history so the
 * app can be exercised at a volume that actually exposes slow queries. The
 * default seed in `ensureDbSetup` only creates the two logins and the two
 * stock locations, which is enough to boot and nothing like enough to test.
 *
 *   npx tsx scripts/seed-demo.ts                # add data, keep what is there
 *   npx tsx scripts/seed-demo.ts --reset        # clear business data first
 *   npx tsx scripts/seed-demo.ts --no-migrate   # schema already applied (e.g. push)
 *   SCALE=3 npx tsx scripts/seed-demo.ts        # three times the volume
 *
 * PGlite is single-process: stop the dev/prod server before running this, or
 * two processes end up writing the same data directory.
 */
import { eq } from "drizzle-orm";
import { db, describeDbTarget, ensureDbSetup } from "../src/server/db/connection";
import * as schema from "../src/server/db/schema";

const RESET = process.argv.includes("--reset");
/**
 * Seed without running migrations first.
 *
 * `ensureDbSetup` replays the whole migration folder, which fails against a
 * database whose schema was applied with `drizzle-kit push` — push changes the
 * schema without recording anything in `drizzle.__drizzle_migrations`, so the
 * migrator tries to add columns that are already there. Seeding does not need
 * the schema created, only present.
 */
const NO_MIGRATE = process.argv.includes("--no-migrate");
const SCALE = Number(process.env.SCALE ?? 1);

/** Deterministic RNG, so a re-run produces the same workshop. */
let seed = 20260829;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

/**
 * Whole rupees. This used to return a uniform random number of paise, so every
 * figure in the demo came out like ₹21,639.72 — a workshop that had apparently
 * never once billed a round number, and eight-digit totals whose last two
 * digits were pure noise.
 */
const money = (lo: number, hi: number) => int(lo, hi).toFixed(2);

const DAYS = 210;
/**
 * A timestamp somewhere in the last DAYS days, biased towards recent.
 *
 * Never later than right now. The hour used to be drawn from 09:00–19:59
 * regardless of the date, so roughly a third of the rows landed on today were
 * stamped in the future — which is why "Billed today" disagreed with the list
 * of today's invoices printed directly beneath it.
 */
function pastDate(maxDaysAgo = DAYS) {
  const daysAgo = Math.floor(Math.pow(rnd(), 1.6) * maxDaysAgo);
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(int(9, 19), int(0, 59), int(0, 59), 0);
  return d > now ? now : d;
}

/** `d` plus some hours, never past now — used for job completion times. */
function laterThan(d: Date, minHours: number, maxHours: number) {
  const now = new Date();
  const out = new Date(d.getTime() + int(minHours * 60, maxHours * 60) * 60_000);
  return out > now ? now : out;
}

const FIRST = ["Rahul","Priya","Amit","Sneha","Vikram","Anjali","Rajesh","Kavita","Suresh","Meera","Arjun","Divya","Sanjay","Pooja","Karthik","Nisha","Manoj","Lakshmi","Ravi","Deepa","Imran","Fatima","Joseph","Anita","Gopal","Shruti","Naveen","Rekha","Farhan","Sunita"] as const;
const LAST = ["Sharma","Patel","Reddy","Nair","Iyer","Singh","Kumar","Das","Menon","Joshi","Verma","Pillai","Rao","Gupta","Shetty","Khan","Bose","Chauhan","Naidu","Mehta"] as const;
const CARS = ["Maruti Swift","Hyundai i20","Tata Nexon","Honda City","Toyota Innova","Maruti Baleno","Hyundai Creta","Mahindra XUV500","Tata Tiago","Kia Seltos","Honda Amaze","Renault Kwid"] as const;
const BIKES = ["Hero Splendor","Honda Shine","Bajaj Pulsar 150","TVS Apache RTR","Royal Enfield Classic 350","Yamaha FZ","Bajaj Platina","Hero Passion Pro"] as const;
const SCOOTIES = ["Honda Activa","TVS Jupiter","Suzuki Access 125","Hero Maestro","Yamaha Fascino"] as const;
const AUTOS = ["Bajaj RE","Piaggio Ape","Mahindra Alfa"] as const;

const CATEGORY_NAMES = ["Engine Oil","Oil Filters","Air Filters","Fuel Filters","Brake Pads","Brake Discs","Brake Fluid","Clutch Plates","Clutch Cables","Batteries","Spark Plugs","Ignition Coils","Headlamps","Tail Lamps","Indicators","Wiper Blades","Tyres","Tubes","Wheel Bearings","Suspension","Shock Absorbers","Coolants","Radiators","Timing Belts","Drive Chains","Sprockets","Gaskets","Seals & O-Rings","Bulbs & Fuses","Horns","Mirrors","Body Panels","Bumpers","Windshields","Fasteners","Greases","Cables","Sensors","Belts","Hoses"] as const;

/** Part types, filed under whichever categories they fit — often several. */
const SUB_CATEGORY_NAMES = ["Back lamp","Head lamp","Indicator lens","Brake pad set","Brake disc","Clutch cable","Throttle cable","Speedometer cable","Air filter","Oil filter","Fuel filter","Spark plug","Ignition coil","Battery","Horn","Mirror set","Chain kit","Sprocket","Wheel bearing","Shock absorber","Fork oil seal","Radiator hose","Timing belt","Gasket set","Wiper blade","Fuse box","Side stand","Mudguard","Handle grip","Foot rest"] as const;

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
    // After parts (which reference sub-categories), before categories.
    "inventory_balances","parts","category_sub_categories","sub_categories",
    "categories","suppliers","audit_logs",
  ]) {
    await db.execute(`delete from ${table}`);
  }
}

async function main() {
  const t0 = Date.now();
  // `--reset` wipes business data before seeding, so which database this is
  // has to be visible before the work, not inferred from the results after.
  console.log(`  target               ${describeDbTarget()}`);
  if (NO_MIGRATE) {
    console.log(`  setup                skipped (--no-migrate)`);
  } else {
    await ensureDbSetup();
    console.log(`  setup                ${Date.now() - t0} ms`);
  }

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
  // Existing categories are reused rather than added to. Without this an
  // additive run drops forty generic names on top of whatever the workshop has
  // already curated, and the grid stops resembling the real thing.
  const categories = await step("categories", async () => {
    const existing = await db
      .select({ id: schema.categories.id, name: schema.categories.name })
      .from(schema.categories);
    if (existing.length) return existing;
    return db
      .insert(schema.categories)
      .values(
        CATEGORY_NAMES.map((name) => ({
          name,
          description: `${name} for cars, bikes and three-wheelers`,
        })),
      )
      .returning({ id: schema.categories.id, name: schema.categories.name });
  });

  // ── Sub-categories ─────────────────────────────────────────────────
  // Some are filed under several categories at once, which is the whole point
  // of the join table — a run that gave each one a single parent would leave
  // the many-to-many untested.
  const subCategories = await step("sub-categories", async () => {
    const rows = await db
      .insert(schema.subCategories)
      .values(
        SUB_CATEGORY_NAMES.map((name) => ({
          name,
          description: `${name} across the range`,
        })),
      )
      .returning({ id: schema.subCategories.id, name: schema.subCategories.name });

    const cats = categories as any[];
    const links: { categoryId: string; subCategoryId: string }[] = [];
    rows.forEach((sub: any, i: number) => {
      // Every third one is shared across three categories; the rest sit under
      // two. Nothing gets zero — the service rejects that, correctly.
      const spread = i % 3 === 0 ? 3 : 2;
      const chosen = new Set<string>();
      while (chosen.size < Math.min(spread, cats.length)) {
        chosen.add((pick(cats) as any).id);
      }
      for (const categoryId of chosen) links.push({ categoryId, subCategoryId: sub.id });
    });
    await chunked(links, (b) => db.insert(schema.categorySubCategories).values(b));
    return rows;
  });

  /** The sub-categories filed under one category, for picking a valid pair. */
  const subsByCategory = new Map<string, any[]>();
  {
    const links = await db
      .select({
        categoryId: schema.categorySubCategories.categoryId,
        subCategoryId: schema.categorySubCategories.subCategoryId,
      })
      .from(schema.categorySubCategories);
    const byId = new Map((subCategories as any[]).map((s: any) => [s.id, s]));
    for (const link of links as any[]) {
      const list = subsByCategory.get(link.categoryId) ?? [];
      const sub = byId.get(link.subCategoryId);
      if (sub) list.push(sub);
      subsByCategory.set(link.categoryId, list);
    }
  }

  // ── Parts (10 per category) ────────────────────────────────────────
  const partRows = (categories as any[]).flatMap((c: any) =>
    Array.from({ length: 10 * SCALE }, (_, i) => {
      // A workshop's shelf, not a warehouse of engines. The old range topped
      // out at ₹4,000 a unit which, across ~180 parts at a mean 60 units on
      // hand, valued the demo shelves at ₹2.2 crore — a figure that made every
      // stock number on the dashboard read as fantasy.
      const purchase = Number(money(60, 900));
      const subs = subsByCategory.get(c.id) ?? [];
      // A part's sub-category has to be one actually linked to its category —
      // the same rule the API enforces. One in five is left unfiled, since
      // sub-categories are optional and the UI has to handle both.
      const sub = subs.length && rnd() > 0.2 ? pick(subs) : null;
      return {
        categoryId: c.id,
        subCategoryId: sub ? sub.id : null,
        supplierId: (pick(suppliers) as any).id,
        name: sub
          ? `${sub.name} ${pick(PART_WORDS)} ${pick(BRANDS)} ${i + 1}`
          : `${c.name.replace(/s$/, "")} ${pick(PART_WORDS)} ${pick(BRANDS)} ${i + 1}`,
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
      // Prices and the name come back too: job lines are priced off the part's
      // own selling price, and every movement snapshots its purchase price.
      out.push(
        ...(await db.insert(schema.parts).values(b).returning({
          id: schema.parts.id,
          name: schema.parts.name,
          purchasePrice: schema.parts.purchasePrice,
          sellingPrice: schema.parts.sellingPrice,
        })),
      );
    });
    return out;
  });

  // Opening stock and the movement ledger are written further down, once the
  // jobs are known — a shop balance is what was booked in minus what jobs
  // consumed, and that cannot be computed before the jobs exist.

  // ── Customers and vehicles ─────────────────────────────────────────
  const customers = await step("customers", async () =>
    db.insert(schema.customers).values(
      Array.from({ length: 60 * SCALE }, () => ({
        name: `${pick(FIRST)} ${pick(LAST)}`,
        // Phone is optional, so some of the demo customers have none — that is
        // the state the call/WhatsApp buttons and the "No phone on file" copy
        // exist for, and it should be visible without hand-editing a row.
        phone: rnd() < 0.12 ? null : `9${int(100000000, 999999999)}`,
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
          // Spaced, and mostly TR — this is a Tripura workshop, so its demo
          // data should look like what it actually sees, with a minority of
          // neighbouring-state and out-of-region vehicles. The spacing matches
          // what the registration field now writes, so seeded and typed
          // numbers dedupe against each other.
          registrationNumber: [
            rnd() < 0.7 ? "TR" : pick(["AS", "MZ", "ML", "MN", "NL", "WB", "KA", "MH"]),
            String(int(1, 12)).padStart(2, "0"),
            pick(["AB", "CJ", "MN", "XY", "PQ", "A", "BCD"]),
            int(1000, 9999),
          ].join(" "),
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
        // Matches the format the app itself generates (`JOB-<year>-0001`, see
        // nextJobNumberTx). The old flat `JOB-00001` did not match the
        // `LIKE 'JOB-<year>-%'` the generator searches, so the app's own
        // numbering restarted at 1 alongside it and the UI showed two
        // incompatible series side by side.
        jobNumber: `JOB-${created.getFullYear()}-${String(i + 1).padStart(4, "0")}`,
        customerId: v.customerId,
        vehicleId: v.id,
        complaint: pick(COMPLAINTS),
        workNotes: rnd() < 0.6 ? "Work carried out and road tested." : null,
        odometerReading: String(int(4000, 140000)),
        status: status as any,
        // Jobs used to complete in the same instant they were opened, making
        // every turnaround zero. Most go out the same day; some sit for the
        // best part of a week, which is what the age badges and the average
        // exist to show.
        completedAt:
          status === "COMPLETED"
            ? laterThan(created, 1, rnd() < 0.75 ? 9 : 24 * 6)
            : null,
        createdAt: created,
      };
    });
    const out: any[] = [];
    await chunked(rows, async (b) => {
      out.push(...(await db.insert(schema.jobs).values(b).returning({
        id: schema.jobs.id, customerId: schema.jobs.customerId, vehicleId: schema.jobs.vehicleId,
        status: schema.jobs.status, createdAt: schema.jobs.createdAt,
        completedAt: schema.jobs.completedAt,
      })));
    });
    return out;
  });

  const jobPartRows: any[] = [];
  const jobLabourRows: any[] = [];
  /** Per job, the lines that make it up — used to build its invoice items. */
  const jobLines = new Map<string, { parts: any[]; labour: any[] }>();
  const jobTotals = new Map<string, number>();
  const partById = new Map(parts.map((p: any) => [p.id, p]));

  for (const j of jobs) {
    let total = 0;
    const lines = { parts: [] as any[], labour: [] as any[] };
    for (let k = 0; k < int(1, 5); k++) {
      const p: any = pick(parts);
      const qty = int(1, 4);
      // Priced off the part's own selling price rather than a free-floating
      // random, so a job's parts cost what those parts cost.
      const unit = Math.round(Number(p.sellingPrice));
      total += unit * qty;
      const row = {
        jobId: j.id, partId: p.id, partName: p.name, quantity: qty,
        unitPrice: unit.toFixed(2), totalPrice: (unit * qty).toFixed(2), createdAt: j.createdAt,
      };
      jobPartRows.push(row);
      lines.parts.push(row);
    }
    for (let k = 0; k < int(1, 3); k++) {
      const [desc, amt] = pick(LABOUR);
      total += Number(amt);
      const row = { jobId: j.id, description: desc, amount: amt, createdAt: j.createdAt };
      jobLabourRows.push(row);
      lines.labour.push(row);
    }
    jobLines.set(j.id, lines);
    jobTotals.set(j.id, total);
  }
  await step("job parts", async () => { await chunked(jobPartRows, (b) => db.insert(schema.jobParts).values(b)); return jobPartRows.length; });
  await step("job labour", async () => { await chunked(jobLabourRows, (b) => db.insert(schema.jobLabour).values(b)); return jobLabourRows.length; });

  // ── Stock: opening receipts, job consumption, closing balances ──────
  //
  // Written as one step because the three have to agree. Previously balances
  // and movements were independently random, so the ledger did not explain the
  // quantities on the shelf — and JOB_USAGE was missing from the movement
  // types entirely, which left every parts-consumption figure in the app
  // structurally zero: the dashboard's "Parts used today" panel, the reports
  // parts table and `partsConsumed` all read an empty ledger.
  //
  // Built backwards from what should be on the shelf: closing = opening minus
  // what jobs took, so opening is whatever makes the closing figure land where
  // we want it, and the ledger sums to the balance by construction.
  await step("stock ledger and balances", async () => {
    const completedJobs = jobs.filter((j: any) => j.status === "COMPLETED");

    // What each part had taken off the SHOP floor by completed jobs — the
    // location completeJob deducts from.
    const consumed = new Map<string, number>();
    const usageRows: any[] = [];
    for (const j of completedJobs) {
      for (const line of jobLines.get(j.id)?.parts ?? []) {
        consumed.set(line.partId, (consumed.get(line.partId) ?? 0) + line.quantity);
        const part: any = partById.get(line.partId);
        usageRows.push({
          partId: line.partId,
          locationId: shop.id,
          movementType: "JOB_USAGE" as const,
          // Deductions are stored negative, as the app writes them.
          quantity: -line.quantity,
          unitCost: Number(part?.purchasePrice ?? 0).toFixed(2),
          referenceType: "JOB",
          referenceId: j.id,
          notes: `JOB-${j.id.slice(0, 8)}`,
          createdAt: j.completedAt ?? j.createdAt,
        });
      }
    }

    // Restocking runs, warehouse → shop. Without these the transfer history
    // is empty and so is the "last stock move" line on /inventory — and a
    // two-location workshop that has never moved a part between them is not a
    // workshop anyone would recognise.
    //
    // Their quantities feed back into the opening receipts below, so moving
    // stock does not break the ledger-equals-balance invariant.
    const transferredIn = new Map<string, number>();
    const transferRows: any[] = [];
    const transferItemRows: { transferIndex: number; partId: string; quantity: number }[] = [];
    for (let t = 0; t < 12 * SCALE; t++) {
      const when = pastDate(60);
      transferRows.push({
        fromLocationId: warehouse.id,
        toLocationId: shop.id,
        notes: rnd() < 0.4 ? "Weekly floor top-up" : null,
        createdAt: when,
      });
      for (const p of Array.from({ length: int(1, 5) }, () => pick(parts) as any)) {
        const qty = int(1, 8);
        transferredIn.set(p.id, (transferredIn.get(p.id) ?? 0) + qty);
        transferItemRows.push({ transferIndex: t, partId: p.id, quantity: qty });
      }
    }

    const insertedTransfers = await db
      .insert(schema.stockTransfers)
      .values(transferRows)
      .returning({ id: schema.stockTransfers.id, createdAt: schema.stockTransfers.createdAt });

    await chunked(
      transferItemRows.map((r) => ({
        transferId: insertedTransfers[r.transferIndex].id,
        partId: r.partId,
        quantity: r.quantity,
      })),
      (b) => db.insert(schema.stockTransferItems).values(b),
    );

    const balanceRows: any[] = [];
    const receiptRows: any[] = [];
    const transferMoves: any[] = [];

    for (const r of transferItemRows) {
      const part: any = partById.get(r.partId);
      const cost = Number(part?.purchasePrice ?? 0).toFixed(2);
      const when = insertedTransfers[r.transferIndex].createdAt;
      transferMoves.push(
        {
          partId: r.partId, locationId: warehouse.id, movementType: "TRANSFER_OUT" as const,
          quantity: -r.quantity, unitCost: cost, referenceType: "TRANSFER",
          referenceId: insertedTransfers[r.transferIndex].id, createdAt: when,
        },
        {
          partId: r.partId, locationId: shop.id, movementType: "TRANSFER_IN" as const,
          quantity: r.quantity, unitCost: cost, referenceType: "TRANSFER",
          referenceId: insertedTransfers[r.transferIndex].id, createdAt: when,
        },
      );
    }

    for (const p of parts as any[]) {
      const used = consumed.get(p.id) ?? 0;
      const movedIn = transferredIn.get(p.id) ?? 0;
      // A slice of parts is left genuinely short so the low-stock panels have
      // something to show; the rest sit comfortably above their minimum.
      const closingShop = rnd() < 0.18 ? int(0, 2) : int(4, 18);
      const closingWarehouse = int(0, 50);

      balanceRows.push(
        { partId: p.id, locationId: shop.id, quantity: closingShop },
        { partId: p.id, locationId: warehouse.id, quantity: closingWarehouse },
      );
      // Opening receipts are whatever makes each closing balance come out
      // right once jobs and transfers have had their share:
      //   shop:      opening + moved in − used   = closing
      //   warehouse: opening − moved out         = closing
      receiptRows.push(
        {
          partId: p.id, locationId: shop.id, movementType: "STOCK_IN" as const,
          quantity: closingShop + used - movedIn,
          unitCost: Number(p.purchasePrice).toFixed(2),
          referenceType: "SEED", notes: "Opening stock", createdAt: pastDate(),
        },
        {
          partId: p.id, locationId: warehouse.id, movementType: "STOCK_IN" as const,
          quantity: closingWarehouse + movedIn,
          unitCost: Number(p.purchasePrice).toFixed(2),
          referenceType: "SEED", notes: "Opening stock", createdAt: pastDate(),
        },
      );
    }

    await chunked(balanceRows, (b) => db.insert(schema.inventoryBalances).values(b));
    await chunked([...receiptRows, ...transferMoves, ...usageRows], (b) =>
      db.insert(schema.stockMovements).values(b),
    );
    return balanceRows.length + receiptRows.length + transferMoves.length + usageRows.length;
  });

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
      // Invoices are raised when the job closes, not when it was opened.
      const raised = j.completedAt ?? j.createdAt;
      return {
        // Same shape the app generates — see the note on job numbers above.
        invoiceNumber: `INV-${raised.getFullYear()}-${String(i + 1).padStart(6, "0")}`,
        jobId: j.id, customerId: j.customerId, vehicleId: j.vehicleId,
        subtotal: subtotal.toFixed(2), discount: discount.toFixed(2), total: total.toFixed(2),
        paidAmount: paid.toFixed(2), dueAmount: due.toFixed(2),
        status: (due === 0 ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "ISSUED") as any,
        createdAt: raised,
      };
    });
    const out: any[] = [];
    await chunked(rows, async (b) => {
      out.push(...(await db.insert(schema.invoices).values(b).returning({
        id: schema.invoices.id, jobId: schema.invoices.jobId,
        customerId: schema.invoices.customerId,
        paidAmount: schema.invoices.paidAmount, createdAt: schema.invoices.createdAt,
      })));
    });
    return out;
  });

  // Items are the job's own parts and labour, exactly as completeJob builds
  // them. They used to be independently randomised, so an invoice's lines did
  // not add up to the invoice it was printed on — visible on any invoice PDF,
  // and it made the labour/parts revenue split disagree with everything else.
  //
  // `itemType` is lowercase to match the app (`"part"` / `"labour"`). The
  // uppercase it used to write is what broke grouping on the invoice PDF and
  // would have silently emptied both halves of the revenue split.
  await step("invoice items", async () => {
    const rows = invoices.flatMap((inv: any) => {
      const lines = jobLines.get(inv.jobId);
      return [
        ...(lines?.parts ?? []).map((p: any) => ({
          invoiceId: inv.id,
          itemType: "part",
          description: p.partName,
          quantity: String(p.quantity),
          unitPrice: p.unitPrice,
          totalPrice: p.totalPrice,
        })),
        ...(lines?.labour ?? []).map((l: any) => ({
          invoiceId: inv.id,
          itemType: "labour",
          description: l.description,
          quantity: "1",
          unitPrice: l.amount,
          totalPrice: l.amount,
        })),
      ];
    });
    await chunked(rows, (b) => db.insert(schema.invoiceItems).values(b));
    return rows.length;
  });

  await step("payments", async () => {
    const rows = invoices
      .filter((inv: any) => Number(inv.paidAmount) > 0)
      .flatMap((inv: any) => {
        const total = Number(inv.paidAmount);
        // Split into halves that actually sum back to what the invoice says
        // was paid. Two independently rounded halves could each be a rupee
        // out, leaving the payment rows and `paidAmount` disagreeing — which
        // is exactly the kind of drift a customer notices on a receipt.
        const count = rnd() < 0.25 ? 2 : 1;
        const first = count === 2 ? Math.round(total / 2) : total;
        const amounts = count === 2 ? [first, total - first] : [total];
        return amounts.map((amount) => ({
          invoiceId: inv.id, customerId: inv.customerId, amount: amount.toFixed(2),
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
