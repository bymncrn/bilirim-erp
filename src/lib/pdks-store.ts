import { createCollection } from "@/lib/supa-collection";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/session";

export type PdksDocument = { name: string; path: string; uploadedAt: string };

export type PdksStaff = {
  id: string;
  name: string;
  phone: string;
  role: string;
  branch: string;
  pin: string;
  deviceId: string;
  hireDate: string;
  exitDate: string;
  active: boolean;
  documents: PdksDocument[];
  shiftId: string;
};

/** Vardiya sablonu (gece vardiyasi icin end <= start olabilir). */
export type PdksShift = {
  id: string;
  name: string;
  start: string;
  end: string;
  breakMinutes: number;
};

/** Vardiya tanimlanmamis personel icin varsayilan gunduz vardiyasi. */
export const DEFAULT_SHIFT: PdksShift = {
  id: "",
  name: "Standart Gündüz",
  start: "08:00",
  end: "18:00",
  breakMinutes: 60,
};

/** Bitis saati baslangictan kucuk/esitse vardiya gece yarisini asar. */
export const shiftCrossesMidnight = (s?: PdksShift | null) => !!s && s.end <= s.start;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Yerel saate gore YYYY-AA-GG anahtari. */
export const localDateKey = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * Okutmanin ait oldugu mesai gunu. Gece vardiyasinda (orn. 22:00-06:00)
 * ertesi sabah yapilan cikis, onceki gunun mesaisine yazilir.
 */
export function shiftWorkDate(at: Date, shift?: PdksShift | null): string {
  const d = new Date(at);
  if (shiftCrossesMidnight(shift) && shift) {
    const [eh, em] = shift.end.split(":").map(Number);
    const cutoff = (eh ?? 6) * 60 + (em ?? 0) + 240; // bitisten 4 saat sonrasina kadar onceki gun
    if (d.getHours() * 60 + d.getMinutes() < cutoff) d.setDate(d.getDate() - 1);
  }
  return localDateKey(d);
}

export type PdksSite = {
  id: string;
  name: string;
  address: string;
  radius: number;
  coords: string;
  workStart: string;
  workEnd: string;
  breakMinutes: number;
  schedule: PdksDayPlan[];
};

/** Haftalik calisma plani satiri (day: 0=Pazar ... 6=Cumartesi). */
export type PdksDayPlan = { day: number; working: boolean; start: string; end: string };

export type PdksHoliday = { id: string; name: string; date: string };

export const WEEKDAY_NAMES = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];

/** Varsayilan takvim: hafta ici 08:00-18:00, Cumartesi 08:00-13:00, Pazar tatil. */
export const defaultSchedule = (): PdksDayPlan[] =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    working: day !== 0,
    start: "08:00",
    end: day === 6 ? "13:00" : "18:00",
  }));

/** Konumun ilgili haftagunu icin plani. */
export const planForDay = (site: PdksSite | undefined, weekday: number): PdksDayPlan =>
  (site?.schedule ?? defaultSchedule()).find((p) => p.day === weekday) ??
  (defaultSchedule()[weekday] as PdksDayPlan);

export type PdksLeave = {
  id: string;
  staffId: string;
  startDate: string;
  endDate: string;
  kind: string;
  reason: string;
  paid: boolean;
};

export type PdksOvertimeApproval = {
  id: string;
  staffId: string;
  workDate: string;
  approved: boolean;
};

/** Ücretsiz sayılan izin tipleri (maaş hakedişinden düşülür). */
export const UNPAID_LEAVE_KINDS = ["Mazeret İzni (Ücretsiz)", "Ücretsiz İzin"];

export const LEAVE_KINDS = [
  "Yıllık İzin (Ücretli)",
  "Mazeret İzni (Ücretsiz)",
  "Sağlık Raporu",
];

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now() + Math.random());

/** PDKS personelleri (Supabase: pdks_staff). */
const staffCollection = createCollection<PdksStaff>({
  table: "pdks_staff",
  generatedId: true,
  order: { column: "created_at", ascending: true },
  fromRow: (r) => ({
    id: String(r["id"]),
    name: String(r["name"] ?? ""),
    phone: String(r["phone"] ?? ""),
    role: String(r["role"] ?? ""),
    branch: String(r["branch"] ?? ""),
    pin: String(r["pin"] ?? ""),
    deviceId: String(r["device_id"] ?? ""),
    hireDate: String(r["hire_date"] ?? "") || "",
    exitDate: String(r["exit_date"] ?? "") || "",
    active: r["active"] !== false,
    documents: Array.isArray(r["documents"]) ? (r["documents"] as PdksDocument[]) : [],
    shiftId: r["shift_id"] ? String(r["shift_id"]) : "",
  }),
  toRow: (s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    role: s.role,
    branch: s.branch,
    pin: s.pin,
    device_id: s.deviceId,
    hire_date: s.hireDate || null,
    exit_date: s.exitDate || null,
    active: s.active,
    documents: s.documents ?? [],
    shift_id: s.shiftId || null,
  }),
});

/** Vardiya sablonlari (Supabase: pdks_shifts). */
const shiftCollection = createCollection<PdksShift>({
  table: "pdks_shifts",
  generatedId: true,
  order: { column: "created_at", ascending: true },
  fromRow: (r) => ({
    id: String(r["id"]),
    name: String(r["name"] ?? ""),
    start: String(r["start_time"] ?? "08:00"),
    end: String(r["end_time"] ?? "16:00"),
    breakMinutes: Number(r["break_minutes"] ?? 0),
  }),
  toRow: (s) => ({
    id: s.id,
    name: s.name,
    start_time: s.start,
    end_time: s.end,
    break_minutes: s.breakMinutes ?? 0,
  }),
});

/** PDKS şantiye/konum tanımları (Supabase: pdks_sites). */
const siteCollection = createCollection<PdksSite>({
  table: "pdks_sites",
  generatedId: true,
  order: { column: "created_at", ascending: true },
  fromRow: (r) => ({
    id: String(r["id"]),
    name: String(r["name"] ?? ""),
    address: String(r["address"] ?? ""),
    coords: String(r["coords"] ?? ""),
    radius: Number(r["radius"] ?? 50),
    workStart: String(r["work_start"] ?? "08:00"),
    workEnd: String(r["work_end"] ?? "18:00"),
    breakMinutes: Number(r["break_minutes"] ?? 0),
    schedule:
      Array.isArray(r["schedule"]) && (r["schedule"] as unknown[]).length === 7
        ? (r["schedule"] as PdksDayPlan[])
        : defaultSchedule(),
  }),
  toRow: (s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    coords: s.coords,
    radius: s.radius,
    work_start: planForDay(s, 1).start,
    work_end: planForDay(s, 1).end,
    break_minutes: s.breakMinutes ?? 0,
    schedule: s.schedule ?? defaultSchedule(),
  }),
});

/** Resmi tatiller (Supabase: pdks_holidays). */
const holidayCollection = createCollection<PdksHoliday>({
  table: "pdks_holidays",
  generatedId: true,
  order: { column: "holiday_date", ascending: true },
  fromRow: (r) => ({
    id: String(r["id"]),
    name: String(r["name"] ?? ""),
    date: String(r["holiday_date"] ?? ""),
  }),
  toRow: (h) => ({ id: h.id, name: h.name, holiday_date: h.date }),
});

/** PDKS izin kayıtları (Supabase: pdks_leaves). */
const leaveCollection = createCollection<PdksLeave>({
  table: "pdks_leaves",
  generatedId: true,
  order: { column: "start_date", ascending: false },
  fromRow: (r) => ({
    id: String(r["id"]),
    staffId: String(r["staff_id"] ?? ""),
    startDate: String(r["start_date"] ?? ""),
    endDate: String(r["end_date"] ?? ""),
    kind: String(r["kind"] ?? "Yıllık İzin"),
    reason: String(r["reason"] ?? ""),
    paid: r["paid"] !== false,
  }),
  toRow: (l) => ({
    id: l.id,
    staff_id: l.staffId,
    start_date: l.startDate,
    end_date: l.endDate,
    kind: l.kind,
    reason: l.reason,
    paid: l.paid,
  }),
});

/** Fazla mesai onayları (Supabase: pdks_overtime_approvals). */
const overtimeCollection = createCollection<PdksOvertimeApproval>({
  table: "pdks_overtime_approvals",
  generatedId: true,
  order: { column: "work_date", ascending: true },
  fromRow: (r) => ({
    id: String(r["id"]),
    staffId: String(r["staff_id"] ?? ""),
    workDate: String(r["work_date"] ?? ""),
    approved: r["approved"] === true,
  }),
  toRow: (o) => ({
    id: o.id,
    staff_id: o.staffId,
    work_date: o.workDate,
    approved: o.approved,
  }),
});

function useDbCollection<T extends { id: string }>(
  collection: ReturnType<typeof createCollection<T>>,
) {
  const items = collection.useItems();

  const save = (next: T[]) => {
    const prev = collection.peek();
    const prevById = new Map(prev.map((i) => [i.id, i]));
    const nextIds = new Set(next.map((i) => i.id));
    void (async () => {
      for (const item of next) {
        const old = prevById.get(item.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(item)) await collection.upsert(item);
      }
      for (const item of prev) {
        if (!nextIds.has(item.id)) await collection.remove(item.id);
      }
    })();
  };

  return { items, save };
}

export const usePdksStaff = () => useDbCollection(staffCollection);
export const usePdksShifts = () => useDbCollection(shiftCollection);
export const usePdksSites = () => useDbCollection(siteCollection);
export const usePdksLeaves = () => useDbCollection(leaveCollection);
export const usePdksHolidays = () => useDbCollection(holidayCollection);

export function usePdksOvertime() {
  const items = overtimeCollection.useItems();

  /** Bir gunun fazla mesaisini onaylar / reddeder. */
  const setApproval = (staffId: string, workDate: string, approved: boolean) => {
    const existing = items.find((o) => o.staffId === staffId && o.workDate === workDate);
    void (existing
      ? overtimeCollection.patch(existing.id, { approved })
      : overtimeCollection.upsert({ id: newId(), staffId, workDate, approved }));
  };

  return { items, setApproval };
}

/** Personel ozluk evraki yukler ve kaydin documents alanina ekler. */
export async function uploadStaffDocument(staff: PdksStaff, file: File) {
  const companyId = await getCompanyId();
  if (!companyId) throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `${companyId}/${staff.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("pdks-documents").upload(path, file);
  if (error) throw error;
  const next: PdksDocument[] = [
    ...(staff.documents ?? []),
    { name: file.name, path, uploadedAt: new Date().toISOString() },
  ];
  await staffCollection.patch(staff.id, { documents: next });
  return next;
}

/** Evraki hem depodan hem personel kaydindan siler. */
export async function removeStaffDocument(staff: PdksStaff, path: string) {
  await supabase.storage.from("pdks-documents").remove([path]);
  const next = (staff.documents ?? []).filter((d) => d.path !== path);
  await staffCollection.patch(staff.id, { documents: next });
  return next;
}

/** Evraki yeni sekmede acmak icin imzali adres uretir. */
export async function signedStaffDocumentUrl(path: string) {
  const { data } = await supabase.storage.from("pdks-documents").createSignedUrl(path, 3600);
  return data?.signedUrl ?? "";
}
