import { describe, expect, it, beforeEach } from "vitest";
import { resetBusinessData, seedCustomerAndPart } from "@/test/helpers";
import {
  adjustStock,
  createCategory,
  createPart,
  createSupplier,
  getPartBalance,
  stockIn,
  transferStock,
  listTransfers,
  listMovements,
  getLowStock,
} from "@/server/services/inventory.service";

describe("inventory service", () => {
  beforeEach(async () => {
    await resetBusinessData();
  });

  it("stockIn adds quantity to a location", async () => {
    const { part } = await seedCustomerAndPart(0);
    const before = await getPartBalance(part.id, "WAREHOUSE");
    expect(before).toBe(20);

    await stockIn({ partId: part.id, locationCode: "WAREHOUSE", quantity: 5, notes: "test" });

    const after = await getPartBalance(part.id, "WAREHOUSE");
    expect(after).toBe(25);
  });

  it("adjustStock sets an absolute quantity", async () => {
    const { part } = await seedCustomerAndPart(10);
    await adjustStock({ partId: part.id, locationCode: "SHOP", newQuantity: 7, notes: "count" });

    const balance = await getPartBalance(part.id, "SHOP");
    expect(balance).toBe(7);
  });

  it("transferStock moves stock warehouse → shop and logs movement", async () => {
    const { part } = await seedCustomerAndPart(2);
    await transferStock({ partId: part.id, quantity: 5, notes: "replenish" });

    const shopBalance = await getPartBalance(part.id, "SHOP");
    const warehouseBalance = await getPartBalance(part.id, "WAREHOUSE");
    expect(shopBalance).toBe(7);
    expect(warehouseBalance).toBe(15);

    const movements = await listMovements({ partId: part.id });
    const transferMoves = movements.filter((m: any) => m.movementType === "TRANSFER_OUT");
    expect(transferMoves.length).toBe(1);
  });

  it("transferStock fails when warehouse has insufficient stock", async () => {
    const { part } = await seedCustomerAndPart(2);
    await expect(transferStock({ partId: part.id, quantity: 50 })).rejects.toThrow(
      /not enough stock/i,
    );
  });

  it("transferStock moves several parts in one transfer", async () => {
    const { part } = await seedCustomerAndPart(0);
    const second = await createPart({
      name: "Oil Filter",
      openingWarehouseStock: 10,
      openingShopStock: 0,
    });

    const result = await transferStock({
      items: [
        { partId: part.id, quantity: 3 },
        { partId: second.id, quantity: 4 },
      ],
    });

    expect(result.lines).toBe(2);
    expect(result.units).toBe(7);
    expect(await getPartBalance(part.id, "SHOP")).toBe(3);
    expect(await getPartBalance(second.id, "SHOP")).toBe(4);
    expect(await getPartBalance(second.id, "WAREHOUSE")).toBe(6);

    // One transfer, two lines on it — not two transfers.
    const [transfer] = await listTransfers();
    expect(transfer.items.length).toBe(2);
  });

  it("transferStock merges the same part picked twice", async () => {
    const { part } = await seedCustomerAndPart(0);
    const result = await transferStock({
      items: [
        { partId: part.id, quantity: 2 },
        { partId: part.id, quantity: 3 },
      ],
    });

    expect(result.lines).toBe(1);
    expect(await getPartBalance(part.id, "SHOP")).toBe(5);
  });

  it("transferStock moves shop → warehouse when asked", async () => {
    const { part } = await seedCustomerAndPart(6);
    await transferStock({
      items: [{ partId: part.id, quantity: 4 }],
      fromLocationCode: "SHOP",
      toLocationCode: "WAREHOUSE",
    });

    expect(await getPartBalance(part.id, "SHOP")).toBe(2);
    expect(await getPartBalance(part.id, "WAREHOUSE")).toBe(24);
  });

  it("transferStock moves nothing at all when one line is short", async () => {
    const { part } = await seedCustomerAndPart(0);
    const second = await createPart({
      name: "Air Filter",
      openingWarehouseStock: 1,
      openingShopStock: 0,
    });

    await expect(
      transferStock({
        items: [
          { partId: part.id, quantity: 5 },
          { partId: second.id, quantity: 9 },
        ],
      }),
    ).rejects.toThrow(/air filter/i);

    // The first line rolled back with the failing one.
    expect(await getPartBalance(part.id, "SHOP")).toBe(0);
    expect(await getPartBalance(part.id, "WAREHOUSE")).toBe(20);
    expect(await listTransfers()).toHaveLength(0);
  });

  it("transferStock rejects a move to the same location", async () => {
    const { part } = await seedCustomerAndPart(4);
    await expect(
      transferStock({
        items: [{ partId: part.id, quantity: 1 }],
        fromLocationCode: "SHOP",
        toLocationCode: "SHOP",
      }),
    ).rejects.toThrow(/different locations/i);
  });

  it("getLowStock returns parts below minimum shop stock", async () => {
    const { part } = await seedCustomerAndPart(1); // min is 2, so low
    const low = await getLowStock();
    const found = low.find((l: any) => l.partId === part.id);
    expect(found).toBeTruthy();
    expect(Number(found.shopStock)).toBe(1);
  });

  it("createCategory, createSupplier and createPart work", async () => {
    const category = await createCategory({ name: "Brakes" });
    const supplier = await createSupplier({ name: "Auto World", phone: "999" });
    const part = await createPart({
      name: "Disc Rotor",
      sellingPrice: "1200",
      purchasePrice: "700",
      minimumShopStock: 1,
      categoryId: category.id,
      supplierId: supplier.id,
    });
    expect(part.name).toBe("Disc Rotor");
    expect(Number(part.sellingPrice)).toBe(1200);
  });
});