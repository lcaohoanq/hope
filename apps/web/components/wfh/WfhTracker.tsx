"use client";

import { useAuth } from "@clerk/nextjs";
import { unwrapResponse } from "@hope/api-client";
import {
  calculateWfhStats,
  getDaysInRange,
  getTodayInTimezone,
  isWfhDateInEmployment,
  isWfhWorkday,
  type WfhCheckIn,
  type WfhSettings,
} from "@hope/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { getClientApiClient } from "@/lib/http";

const panel = "rounded-lg border border-border bg-panel p-4 sm:p-6";
const input = "rounded-md border border-border bg-app p-2 text-text";
const button =
  "rounded-md border border-border bg-panel-muted px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-contrast disabled:opacity-40";

export function WfhTracker({ language }: { language: "en" | "vi" }) {
  const vi = language === "vi";
  const t = (en: string, vn: string) => (vi ? vn : en);
  const { getToken } = useAuth();
  const today = getTodayInTimezone();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [settings, setSettings] = useState<WfhSettings | null>(null);
  const [records, setRecords] = useState<WfhCheckIn[]>([]);
  const [quota, setQuota] = useState(45);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(today);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"WFH" | "OFFICE">("WFH");
  const [dialogOpen, setDialogOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const generation = useRef(0);
  const load = useCallback(
    async (refresh = false) => {
      const current = ++generation.current;
      if (!refresh) {
        setLoading(true);
        setLoaded(false);
      }
      try {
        const client = getClientApiClient(await getToken());
        const [s, r, a] = await Promise.all([
          client.wfh.settings.$get().then(unwrapResponse<{ settings: WfhSettings | null }>),
          client.wfh["check-ins"]
            .$get({ query: { year: String(year) } })
            .then(unwrapResponse<{ records: WfhCheckIn[] }>),
          client.wfh.allowance
            .$get({ query: { year: String(year) } })
            .then(unwrapResponse<{ allowance: { totalDays: number } }>),
        ]);
        if (current !== generation.current) return;
        setSettings(s.settings);
        setRecords(r.records);
        setQuota(a.allowance.totalDays);
        setLoaded(true);
        setError("");
      } catch (err) {
        if (current === generation.current)
          setError(err instanceof Error ? err.message : "Could not load WFH data.");
      } finally {
        if (current === generation.current) setLoading(false);
      }
    },
    [getToken, year],
  );
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  useEffect(() => {
    const element = dialog.current;
    if (!dialogOpen || !element) return;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [dialogOpen]);

  async function mutate(
    action: (
      client: ReturnType<typeof getClientApiClient>,
    ) => Promise<Pick<Response, "ok" | "status" | "json">>,
  ) {
    setBusy(true);
    setError("");
    try {
      await unwrapResponse(await action(getClientApiClient(await getToken())));
      await load(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save WFH data.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const stats = calculateWfhStats(records, year, quota);
  const byDate = new Map(records.map((record) => [record.date, record]));
  const statusLabel = (status?: string) =>
    status === "WFH"
      ? "WFH"
      : status === "OFFICE"
        ? t("Office", "Văn phòng")
        : t("Not recorded", "Chưa ghi nhận");
  const canEdit = (date: string) =>
    Boolean(
      settings && isWfhWorkday(date) && date <= today && isWfhDateInEmployment(date, settings),
    );
  function choose(date: string) {
    if (!canEdit(date)) return;
    setSelected(date);
    setNote(byDate.get(date)?.note ?? "");
    setStatus(byDate.get(date)?.status ?? "WFH");
    setError("");
    setDialogOpen(true);
  }
  function record(date: string, status: "WFH" | "OFFICE", recordNote: string) {
    void mutate((client) =>
      client.wfh["check-ins"].$post({ json: { date, status, note: recordNote } }),
    );
  }

  return (
    <div className="grid min-w-0 gap-5" aria-busy={busy || loading}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("WFH tracker", "Theo dõi WFH")}</h1>
          <p className="text-sm text-muted">
            {t("Private · Your calendar-year allowance", "Riêng tư · Hạn mức theo năm dương lịch")}
          </p>
        </div>
        <label>
          {t("Year", "Năm")}{" "}
          <input
            aria-label={t("Year", "Năm")}
            className={`${input} w-24`}
            type="number"
            min="1900"
            max="9998"
            value={year}
            disabled={busy || loading}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= 1900 && value <= 9998) {
                setYear(value);
                setSelected(`${value}-01-01`);
                setNote("");
              }
            }}
          />
        </label>
      </div>
      {error && (
        <div role="alert" className="rounded-lg border border-danger-border p-4 text-danger">
          {error}{" "}
          <button className={button} type="button" onClick={() => void load()}>
            {t("Retry", "Thử lại")}
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">{t("Loading…", "Đang tải…")}</p>
      ) : loaded ? (
        <>
          <section className={panel}>
            <h2 className="mb-3 font-semibold">
              {settings
                ? t("Employment & reminders", "Công việc & nhắc nhở")
                : t("Set up WFH tracking", "Thiết lập theo dõi WFH")}
            </h2>
            <form
              key={JSON.stringify(settings)}
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                void mutate((client) =>
                  client.wfh.settings.$patch({
                    json: {
                      startDate: String(data.get("startDate")),
                      endDate: String(data.get("endDate")) || null,
                      reminderEnabled: data.get("reminder") === "on",
                    },
                  }),
                );
              }}
            >
              <div className="flex flex-wrap gap-3">
                <label className="grid gap-1 text-sm">
                  {t("First working day", "Ngày bắt đầu")}
                  <input
                    className={input}
                    type="date"
                    name="startDate"
                    required
                    defaultValue={settings?.startDate ?? today}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  {t("Last working day (optional)", "Ngày kết thúc (không bắt buộc)")}
                  <input
                    className={input}
                    type="date"
                    name="endDate"
                    defaultValue={settings?.endDate ?? ""}
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="reminder"
                  defaultChecked={settings?.reminderEnabled ?? false}
                />
                {t(
                  "Email me weekdays at 17:30 (Vietnam time)",
                  "Nhắc qua email các ngày trong tuần lúc 17:30 (giờ Việt Nam)",
                )}
              </label>
              <p className="text-sm text-muted">
                {t(
                  "45 days each year, even for a partial year. No carryover.",
                  "45 ngày mỗi năm, kể cả làm chưa đủ năm. Không chuyển hạn mức sang năm sau.",
                )}
              </p>
              <button type="submit" className={`${button} justify-self-start`} disabled={busy}>
                {t("Save settings", "Lưu cài đặt")}
              </button>
            </form>
          </section>
          {settings && (
            <>
              {year === Number(today.slice(0, 4)) && canEdit(today) && (
                <section className={panel}>
                  <h2 className="font-semibold">
                    {t("Did you WFH today?", "Hôm nay bạn có WFH không?")}
                  </h2>
                  <p className="my-2 text-sm text-muted">
                    {today} · {statusLabel(byDate.get(today)?.status)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className={button}
                      disabled={busy}
                      onClick={() => record(today, "WFH", byDate.get(today)?.note ?? "")}
                      type="button"
                    >
                      {t("Yes · WFH", "Có · WFH")}
                    </button>
                    <button
                      className={button}
                      disabled={busy}
                      onClick={() => record(today, "OFFICE", byDate.get(today)?.note ?? "")}
                      type="button"
                    >
                      {t("No · Office", "Không · Văn phòng")}
                    </button>
                  </div>
                </section>
              )}
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  [t("Days used", "Ngày đã dùng"), stats.used],
                  [t("Days remaining", "Ngày còn lại"), stats.remaining],
                  [
                    t("WFH rate", "Tỷ lệ WFH"),
                    stats.rate === null ? "—" : `${Math.round(stats.rate * 100)}%`,
                  ],
                  [t("Allowance period", "Kỳ hạn mức"), `${year}`],
                ].map(([label, value]) => (
                  <div className={panel} key={label}>
                    <p className="text-sm text-muted">{label}</p>
                    <p className="mt-2 text-xl font-semibold">{value}</p>
                  </div>
                ))}
              </section>
              <p className="text-sm text-muted">
                {stats.startDate} → {stats.endDate} ·{" "}
                {t(
                  "WFH rate uses recorded workdays only.",
                  "Tỷ lệ WFH chỉ tính những ngày đã ghi nhận.",
                )}
                {stats.overAllowance > 0 && (
                  <span className="text-danger">
                    {" "}
                    · {stats.overAllowance} {t("days over allowance", "ngày vượt hạn mức")}
                  </span>
                )}
              </p>
              <form
                className="flex flex-wrap items-center gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  void mutate((client) =>
                    client.wfh.allowance.$patch({
                      json: { year, totalDays: Number(data.get("quota")) },
                    }),
                  );
                }}
              >
                <label>
                  {t("Annual quota", "Hạn mức năm")}{" "}
                  <input
                    key={`${year}-${quota}`}
                    className={`${input} w-20`}
                    name="quota"
                    type="number"
                    min="0"
                    max="366"
                    required
                    defaultValue={quota}
                  />
                </label>
                <button type="submit" className={button} disabled={busy}>
                  {t("Save quota", "Lưu hạn mức")}
                </button>
              </form>
              <section className={panel}>
                <h2 className="mb-4 font-semibold">{t("Calendar", "Lịch")}</h2>
                <p className="mb-4 text-sm text-muted">
                  {t(
                    "Green: WFH · Blue: Office · Empty: Not recorded",
                    "Xanh lá: WFH · Xanh dương: Văn phòng · Trống: Chưa ghi nhận",
                  )}{" "}
                  {t(
                    "Click a weekday to backfill or edit. Saturdays and Sundays are excluded.",
                    "Chọn ngày trong tuần để bổ sung hoặc chỉnh sửa. Không tính thứ Bảy và Chủ nhật.",
                  )}
                </p>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 12 }, (_, month) => {
                    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
                    const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
                    const offset = (new Date(`${prefix}-01T00:00:00Z`).getUTCDay() + 6) % 7;
                    return (
                      <div key={prefix}>
                        <h3 className="mb-2 text-sm font-semibold">
                          {new Intl.DateTimeFormat(vi ? "vi" : "en", {
                            month: "long",
                            timeZone: "UTC",
                          }).format(new Date(`${prefix}-01T00:00:00Z`))}
                        </h3>
                        <div className="grid grid-cols-7 gap-1">
                          {(vi
                            ? ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
                            : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
                          ).map((day) => (
                            <span key={day} className="text-center text-xs text-muted">
                              {day}
                            </span>
                          ))}
                          {getDaysInRange(`${prefix}-01`, `${prefix}-${last}`).map(
                            (date, index) => (
                              <button
                                type="button"
                                key={date}
                                disabled={busy || !canEdit(date)}
                                style={index === 0 ? { gridColumnStart: offset + 1 } : undefined}
                                aria-label={`${date}: ${isWfhWorkday(date) ? statusLabel(byDate.get(date)?.status) : t("Weekend · Not a workday", "Cuối tuần · Không làm việc")}`}
                                aria-haspopup="dialog"
                                title={`${date}: ${isWfhWorkday(date) ? statusLabel(byDate.get(date)?.status) : t("Weekend · Not a workday", "Cuối tuần · Không làm việc")}`}
                                onClick={() => choose(date)}
                                className={`aspect-square rounded text-xs focus-visible:outline focus-visible:outline-2 ${!isWfhWorkday(date) ? "bg-transparent text-muted" : byDate.get(date)?.status === "WFH" ? "bg-emerald-600 text-white" : byDate.get(date)?.status === "OFFICE" ? "bg-blue-600 text-white" : "bg-panel-muted text-muted"} ${selected === date && dialogOpen ? "ring-2 ring-accent" : ""} ${!canEdit(date) ? "opacity-40 cursor-not-allowed" : ""}`}
                              >
                                {Number(date.slice(-2))}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </>
      ) : null}
      <dialog
        ref={dialog}
        aria-labelledby="wfh-dialog-title"
        aria-describedby="wfh-dialog-date"
        className="m-auto w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-xl border border-border bg-panel p-5 text-text shadow-xl backdrop:bg-black/50"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
        onClose={() => setDialogOpen(false)}
      >
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || !canEdit(selected)) return;
            const saved = await mutate((client) =>
              client.wfh["check-ins"].$post({ json: { date: selected, status, note } }),
            );
            if (saved) setDialogOpen(false);
          }}
        >
          <h2 id="wfh-dialog-title" className="text-xl font-semibold">
            {t("Record a workday", "Ghi nhận ngày làm việc")}
          </h2>
          <p id="wfh-dialog-date" className="text-sm text-muted">
            {selected} · {statusLabel(byDate.get(selected)?.status)}
          </p>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <label className="grid gap-1 text-sm">
            {t("Work location", "Nơi làm việc")}
            <select
              className={input}
              value={status}
              disabled={busy}
              onChange={(event) => setStatus(event.target.value === "OFFICE" ? "OFFICE" : "WFH")}
            >
              <option value="WFH">WFH</option>
              <option value="OFFICE">{t("Office", "Văn phòng")}</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            {t("Note (optional)", "Ghi chú (không bắt buộc)")}
            <textarea
              className={input}
              rows={3}
              maxLength={2000}
              value={note}
              disabled={busy}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={button} disabled={busy || !canEdit(selected)}>
              {busy ? t("Saving…", "Đang lưu…") : t("Save record", "Lưu ghi nhận")}
            </button>
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => setDialogOpen(false)}
            >
              {t("Cancel", "Hủy")}
            </button>
            {byDate.has(selected) && (
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={async () => {
                  const cleared = await mutate((client) =>
                    client.wfh["check-ins"][":date"].$delete({ param: { date: selected } }),
                  );
                  if (cleared) setDialogOpen(false);
                }}
              >
                {t("Clear record", "Xóa ghi nhận")}
              </button>
            )}
          </div>
        </form>
      </dialog>
    </div>
  );
}
