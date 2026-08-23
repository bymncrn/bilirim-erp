import { createFileRoute } from "@tanstack/react-router";
import { LayoutGrid, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PanelShell } from "@/components/panel/PanelShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useDiningTables,
  createTable,
  patchTable,
  removeTable,
} from "@/lib/tables-store";

export const Route = createFileRoute("/panel/yerlesim")({
  head: () => ({
    meta: [
      { title: "Restoran Yerleşimi — Bilirim Restoran POS" },
      {
        name: "description",
        content:
          "Salon, teras ve balkon gibi alanlarınızı tanımlayın; her alandaki masaları oluşturup düzenleyin.",
      },
      { property: "og:title", content: "Restoran Yerleşimi — Bilirim Restoran POS" },
      {
        property: "og:description",
        content: "Mekan alanlarınızı ve masalarınızı dinamik olarak yönetin.",
      },
    ],
  }),
  component: LayoutPage,
});

function LayoutPage() {
  const tables = useDiningTables();
  const [newArea, setNewArea] = useState("");
  const [extraAreas, setExtraAreas] = useState<string[]>([]);
  const [tableName, setTableName] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<{ id: string; name: string; area: string } | null>(null);

  const areas = useMemo(() => {
    const set = new Set<string>(["Salon"]);
    tables.forEach((t) => t.area && set.add(t.area));
    extraAreas.forEach((a) => set.add(a));
    return Array.from(set);
  }, [tables, extraAreas]);

  const addArea = () => {
    const name = newArea.trim();
    if (!name) {
      toast.error("Alan adı zorunludur.");
      return;
    }
    if (areas.includes(name)) {
      toast.error("Bu alan zaten tanımlı.");
      return;
    }
    setExtraAreas((prev) => [...prev, name]);
    setNewArea("");
    toast.success(`"${name}" alanı eklendi. Şimdi masa ekleyebilirsiniz.`);
  };

  const addTable = async (area: string) => {
    const name = (tableName[area] ?? "").trim();
    if (!name) {
      toast.error("Masa adı zorunludur.");
      return;
    }
    await createTable(name, area);
    setTableName((p) => ({ ...p, [area]: "" }));
    toast.success(`${area} alanına "${name}" masası eklendi.`);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Masa adı boş olamaz.");
      return;
    }
    await patchTable(editing.id, { name: editing.name.trim(), area: editing.area });
    setEditing(null);
    toast.success("Masa güncellendi.");
  };

  return (
    <PanelShell
      title="Restoran Yerleşimi"
      description={`${areas.length} alan · ${tables.length} masa`}
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="pos-shadow rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Yeni Alan Ekle</h2>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <Label>Alan Adı</Label>
              <Input
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="Salon, Teras, Balkon, Bahçe…"
              />
            </div>
            <Button onClick={addArea}>
              <Plus className="mr-1.5 h-4 w-4" />
              Alan Ekle
            </Button>
          </div>
        </section>

        {areas.map((area) => {
          const list = tables.filter((t) => t.area === area);
          return (
            <section key={area} className="pos-shadow rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {area}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({list.length} masa)
                  </span>
                </h3>
                <div className="flex items-end gap-2">
                  <Input
                    value={tableName[area] ?? ""}
                    onChange={(e) => setTableName((p) => ({ ...p, [area]: e.target.value }))}
                    placeholder="Masa adı (Örn. M1)"
                    className="h-9 w-44"
                    aria-label={`${area} masa adı`}
                  />
                  <Button size="sm" onClick={() => void addTable(area)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Masa Ekle
                  </Button>
                </div>
              </div>

              {list.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                  Bu alanda henüz masa yok.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {list.map((t) => (
                    <div key={t.id} className="rounded-xl border border-border p-3">
                      {editing?.id === t.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editing.name}
                            aria-label="Masa adı"
                            onChange={(e) =>
                              setEditing((p) => (p ? { ...p, name: e.target.value } : p))
                            }
                            className="h-8"
                          />
                          <select
                            aria-label="Alan"
                            value={editing.area}
                            onChange={(e) =>
                              setEditing((p) => (p ? { ...p, area: e.target.value } : p))
                            }
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                          >
                            {areas.map((a) => (
                              <option key={a} value={a}>
                                {a}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-1">
                            <Button size="sm" className="flex-1" onClick={() => void saveEdit()}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => setEditing(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {t.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t.status === "bos" ? "Boş" : "Dolu"}
                            </p>
                          </div>
                          <div className="flex shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Düzenle"
                              onClick={() =>
                                setEditing({ id: t.id, name: t.name, area: t.area })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Sil"
                              className="text-destructive"
                              onClick={() => {
                                void removeTable(t.id);
                                toast.success("Masa silindi.");
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </PanelShell>
  );
}