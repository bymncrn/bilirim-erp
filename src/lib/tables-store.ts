import { createCollection } from "@/lib/supa-collection";

export type DiningTableRow = {
  id: string;
  name: string;
  area: string;
  status: string; // bos | dolu | hesap | rezerve
  waiter: string;
  openedAt: string | null;
};

export const tablesCollection = createCollection<DiningTableRow>({
  table: "dining_tables",
  generatedId: true,
  order: { column: "created_at" },
  fromRow: (r) => ({
    id: String(r["id"]),
    name: String(r["name"] ?? ""),
    area: String(r["area"] ?? "Salon"),
    status: String(r["status"] ?? "bos"),
    waiter: String(r["waiter"] ?? ""),
    openedAt: (r["opened_at"] as string | null) ?? null,
  }),
  toRow: (t) => ({
    id: t.id,
    name: t.name,
    area: t.area,
    status: t.status,
    waiter: t.waiter,
    opened_at: t.openedAt,
  }),
});

export type OrderItemRow = {
  id: string;
  tableId: string;
  productId: string | null;
  name: string;
  price: number;
  qty: number;
  note: string;
  status: string; // bekliyor | hazirlaniyor | hazir
};

export const orderItemsCollection = createCollection<OrderItemRow>({
  table: "table_order_items",
  generatedId: true,
  order: { column: "created_at" },
  fromRow: (r) => ({
    id: String(r["id"]),
    tableId: String(r["table_id"]),
    productId: (r["product_id"] as string | null) ?? null,
    name: String(r["name"] ?? ""),
    price: Number(r["price"] ?? 0),
    qty: Number(r["qty"] ?? 0),
    note: String(r["note"] ?? ""),
    status: String(r["status"] ?? "bekliyor"),
  }),
  toRow: (i) => ({
    id: i.id,
    table_id: i.tableId,
    product_id: i.productId,
    name: i.name,
    price: i.price,
    qty: i.qty,
    note: i.note,
    status: i.status,
  }),
});

export function useDiningTables() {
  return tablesCollection.useItems();
}

export function useOrderItems() {
  return orderItemsCollection.useItems();
}

export async function saveTable(table: DiningTableRow) {
  await tablesCollection.upsert(table);
}

export async function createTable(name: string, area: string) {
  await tablesCollection.insertRaw({ name, area, status: "bos", waiter: "" });
}

export async function patchTable(id: string, patch: Record<string, unknown>) {
  await tablesCollection.patch(id, patch);
}

export async function removeTable(id: string) {
  await tablesCollection.remove(id);
}

export async function addOrderItem(item: Omit<OrderItemRow, "id">) {
  await orderItemsCollection.insertRaw({
    table_id: item.tableId,
    product_id: item.productId,
    name: item.name,
    price: item.price,
    qty: item.qty,
    note: item.note,
    status: item.status,
  });
}

export async function patchOrderItem(id: string, patch: Record<string, unknown>) {
  await orderItemsCollection.patch(id, patch);
}

export async function removeOrderItem(id: string) {
  await orderItemsCollection.remove(id);
}

/** Masayı kapatır: siparişleri siler, durumu boşa çeker. */
export async function closeDiningTable(tableId: string) {
  const items = orderItemsCollection.peek().filter((i) => i.tableId === tableId);
  await Promise.all(items.map((i) => orderItemsCollection.remove(i.id)));
  await tablesCollection.patch(tableId, { status: "bos", waiter: "", opened_at: null });
}
