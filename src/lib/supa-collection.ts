import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/session";
import { logAudit } from "@/lib/audit-log";

type Row = Record<string, unknown>;

/** Loglanan tablolar ve kullanıcıya gösterilecek adları. */
const AUDITED: Record<string, string> = {
  products: "Ürün",
  invoices: "Fatura",
  invoice_lines: "Fatura kalemi",
  e_documents: "e-Belge",
  quotes: "Teklif",
  payments: "Tahsilat/Ödeme",
  cariler: "Cari hesap",
  financial_accounts: "Kasa/Banka hesabı",
  account_txns: "Hesap hareketi",
  expenses: "Gider",
  service_tickets: "Servis kaydı",
  staff_members: "Personel",
  dining_tables: "Masa",
  product_categories: "Kategori",
};

function auditLabel(item: unknown, id: string) {
  const rec = item as Record<string, unknown> | undefined;
  const name = rec?.["name"] ?? rec?.["no"] ?? rec?.["number"] ?? rec?.["title"] ?? rec?.["desc"];
  return name ? String(name) : `#${id}`;
}

function audit(table: string, action: "Silme" | "Güncelleme", label: string) {
  const entity = AUDITED[table];
  if (!entity) return;
  void logAudit({
    action,
    entity,
    summary: `${entity} kaydı ${action === "Silme" ? "silindi" : "güncellendi"}: ${label}`,
  });
}

/** Aynı tabloyu paylaşan tüm koleksiyonlar (modüller arası senkronizasyon). */
const registry = new Map<string, Set<{ reload: () => Promise<void> }>>();

/** Bir tabloya bağlı tüm koleksiyonları yeniden yükler. */
export function reloadTable(table: string) {
  const set = registry.get(table);
  if (!set) return Promise.resolve();
  return Promise.all(Array.from(set).map((c) => c.reload())).then(() => undefined);
}

/**
 * Supabase tablosunu senkron okunabilir bir store'a bağlar.
 * İlk abonelikte veriyi çeker, her yazma sonrası yeniden okur.
 */
export function createCollection<T extends { id: string }>(options: {
  table: string;
  /** Özel select ifadesi (ilişkili tablolar için). */
  select?: string;
  /** true ise id veritabanı tarafından üretilir (uuid tablolar). */
  generatedId?: boolean;
  order?: { column: string; ascending?: boolean };
  fromRow: (row: Row) => T;
  toRow: (item: T) => Row;
}) {
  let items: T[] = [];
  let loaded = false;
  let loading = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  async function load() {
    if (loading) return;
    loading = true;
    try {
      const companyId = await getCompanyId();
      if (!companyId) {
        items = [];
        loaded = true;
        emit();
        return;
      }
      let q = supabase
        .from(options.table as never)
        .select(options.select ?? "*")
        .eq("company_id", companyId);
      if (options.order)
        q = q.order(options.order.column, { ascending: options.order.ascending ?? true });
      const { data, error } = await q;
      if (error) throw error;
      items = ((data ?? []) as Row[]).map(options.fromRow);
      loaded = true;
      emit();
    } catch (e) {
      console.error(`[${options.table}] yüklenemedi`, e);
      loaded = true;
      emit();
    } finally {
      loading = false;
    }
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    if (!loaded) void load();
    return () => {
      listeners.delete(listener);
    };
  }

  const getSnapshot = () => items;
  const empty: T[] = [];
  const getServerSnapshot = () => empty;

  const api = {
    toRow: options.toRow,
    useItems: () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot),
    isLoaded: () => loaded,
    reload: () => {
      loaded = false;
      return load();
    },
    /** Aynı tabloyu kullanan diğer modülleri de tazeler. */
    syncAll: () => reloadTable(options.table),
    peek: () => items,
    async upsert(item: T) {
      const companyId = await getCompanyId();
      if (!companyId) return;
      const row = { ...options.toRow(item), company_id: companyId } as Row;
      const isNew = !items.some((i) => i.id === item.id);
      if (isNew && options.generatedId) delete row["id"];
      const { error } = isNew
        ? await supabase.from(options.table as never).insert(row as never)
        : await supabase
            .from(options.table as never)
            .update(row as never)
            .eq("id", item.id);
      if (error) console.error(`[${options.table}] kaydedilemedi`, error);
      if (!error && !isNew) audit(options.table, "Güncelleme", auditLabel(item, item.id));
      await reloadTable(options.table);
    },
    async patch(id: string, patch: Row) {
      const { error } = await supabase
        .from(options.table as never)
        .update(patch as never)
        .eq("id", id);
      if (error) console.error(`[${options.table}] güncellenemedi`, error);
      if (!error) audit(options.table, "Güncelleme", auditLabel(patch, id));
      await reloadTable(options.table);
    },
    async remove(id: string) {
      const existing = items.find((i) => i.id === id);
      const { error } = await supabase
        .from(options.table as never)
        .delete()
        .eq("id", id);
      if (error) console.error(`[${options.table}] silinemedi`, error);
      if (!error) audit(options.table, "Silme", auditLabel(existing, id));
      await reloadTable(options.table);
    },
    async insertRaw(row: Row) {
      const companyId = await getCompanyId();
      if (!companyId) return;
      const { error } = await supabase
        .from(options.table as never)
        .insert({ ...row, company_id: companyId } as never);
      if (error) console.error(`[${options.table}] eklenemedi`, error);
      await reloadTable(options.table);
    },
  };

  const bucket = registry.get(options.table) ?? new Set();
  bucket.add(api);
  registry.set(options.table, bucket);

  return api;
}

export type Collection<T extends { id: string }> = ReturnType<typeof createCollection<T>>;

/**
 * useState benzeri arayüz; değişiklikler otomatik olarak Supabase'e yazılır.
 */
export function useDbState<T extends { id: string }>(
  collection: Collection<T>,
): [T[], (updater: T[] | ((prev: T[]) => T[])) => void] {
  const items = collection.useItems();

  const setItems = (updater: T[] | ((prev: T[]) => T[])) => {
    const prev = collection.peek();
    const next = typeof updater === "function" ? (updater as (p: T[]) => T[])(prev) : updater;
    const prevById = new Map(prev.map((i) => [i.id, i]));
    const nextIds = new Set(next.map((i) => i.id));

    void (async () => {
      for (const item of next) {
        const old = prevById.get(item.id);
        if (!old) await collection.upsert(item);
        else if (JSON.stringify(old) !== JSON.stringify(item)) await collection.upsert(item);
      }
      for (const item of prev) {
        if (!nextIds.has(item.id)) await collection.remove(item.id);
      }
    })();
  };

  return [items, setItems];
}
