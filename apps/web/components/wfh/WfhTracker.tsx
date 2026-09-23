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
import { Settings } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getClientApiClient } from "@/lib/http";
import { WfhSettingsDialog } from "./WfhSettingsDialog";

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
  const [editor, setEditor] = useState(false);
  const [confirmation, setConfirmation] = useState("");
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
  const usage = quota > 0 ? Math.min(100, (stats.used / quota) * 100) : stats.used > 0 ? 100 : 0;
  const formatDate = (date: string, includeYear = true) =>
    new Intl.DateTimeFormat(vi ? "vi" : "en", {
      month: vi ? "long" : "short",
      day: "numeric",
      ...(includeYear ? { year: "numeric" as const } : {}),
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));
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
          {/* <p className="text-sm text-muted">
            {t("Private · Your calendar-year allowance", "Riêng tư · Hạn mức theo năm dương lịch")}
          </p> */}
        </div>
      </div>
      <p role="status" className={confirmation ? "text-sm text-muted" : "sr-only"}>
        {confirmation}
      </p>
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
          <section className={panel} aria-label={t("WFH overview", "Tổng quan WFH")}>
            <div
              className={`relative flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 ${settings ? "pr-14" : ""}`}
            >
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
              <p className="text-sm text-muted">
                {formatDate(stats.startDate, false)} – {formatDate(stats.endDate)}
              </p>
              {settings && (
                <button
                  type="button"
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-panel-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
                  aria-label={t("Edit settings", "Chỉnh sửa cài đặt")}
                  title={t("Edit settings", "Chỉnh sửa cài đặt")}
                  aria-haspopup="dialog"
                  disabled={busy}
                  onClick={() => {
                    setConfirmation("");
                    setEditor(true);
                  }}
                >
                  <Settings size={20} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="pt-5">
              <div>
                <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  {t(`${stats.remaining} days left`, `Còn ${stats.remaining} ngày`)}
                </p>
                <div className="mt-3">
                  <p className="text-sm text-muted">
                    {t(`${stats.used} of ${quota} used`, `Đã dùng ${stats.used} / ${quota} ngày`)}
                  </p>
                </div>
                <div
                  role="progressbar"
                  aria-label={t("Allowance usage", "Mức sử dụng hạn mức")}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={usage}
                  aria-valuetext={t(
                    `${stats.used} of ${quota} days used`,
                    `Đã dùng ${stats.used} / ${quota} ngày`,
                  )}
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-panel-muted"
                >
                  <div
                    className={`h-full rounded-full ${stats.overAllowance ? "bg-danger" : "bg-accent"}`}
                    style={{ width: `${usage}%` }}
                  />
                </div>
                {stats.overAllowance > 0 && (
                  <p className="mt-2 text-sm text-danger">
                    {t(
                      `${stats.overAllowance} days over allowance`,
                      `Vượt hạn mức ${stats.overAllowance} ngày`,
                    )}
                  </p>
                )}
              </div>
            </div>
          </section>
          {!settings && (
            <section className="flex flex-col gap-3 rounded-lg border border-border bg-panel px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">
                  {t("Set up WFH tracking", "Thiết lập theo dõi WFH")}
                </h2>
                <p className="text-sm text-muted">
                  {t(
                    "Add your employment dates to start recording workdays.",
                    "Thêm thời gian làm việc để bắt đầu ghi nhận ngày làm việc.",
                  )}
                </p>
              </div>
              <button
                className={`${button} self-start sm:shrink-0`}
                type="button"
                disabled={busy}
                aria-haspopup="dialog"
                onClick={() => {
                  setConfirmation("");
                  setEditor(true);
                }}
              >
                {t("Set up tracking", "Thiết lập theo dõi")}
              </button>
            </section>
          )}
          {settings && (
            <>
              {year === Number(today.slice(0, 4)) && canEdit(today) && !byDate.has(today) && (
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
      {editor && (
        <WfhSettingsDialog
          language={language}
          settings={settings}
          quota={quota}
          year={year}
          today={today}
          onClose={() => setEditor(false)}
          onSave={async ({ quota: nextQuota, settings: nextSettings }) => {
            const client = getClientApiClient(await getToken());
            const saves = await Promise.allSettled([
              nextQuota === undefined
                ? Promise.resolve()
                : (async () => {
                    const response = await client.wfh.allowance.$patch({
                      json: { year, totalDays: nextQuota },
                    });
                    const result = await unwrapResponse<{ allowance: { totalDays: number } }>(
                      response,
                    );
                    setQuota(result.allowance.totalDays);
                  })(),
              nextSettings === undefined
                ? Promise.resolve()
                : (async () => {
                    const response = await client.wfh.settings.$patch({ json: nextSettings });
                    const result = await unwrapResponse<{ settings: WfhSettings }>(response);
                    setSettings(result.settings);
                  })(),
            ]);
            const quotaSaved = nextQuota === undefined || saves[0].status === "fulfilled";
            const settingsSaved = nextSettings === undefined || saves[1].status === "fulfilled";
            if (quotaSaved && settingsSaved) {
              setConfirmation(t("WFH settings saved.", "Đã lưu cài đặt WFH."));
              return { quotaSaved: true, settingsSaved: true };
            }
            const failed = saves.find((save) => save.status === "rejected");
            const message =
              failed?.status === "rejected" && failed.reason instanceof Error
                ? failed.reason.message
                : t(
                    "Some changes were not saved. Retry to continue.",
                    "Một số thay đổi chưa được lưu. Hãy thử lại để tiếp tục.",
                  );
            setError(message);
            return {
              quotaSaved,
              settingsSaved,
              error: t(
                "Some changes were not saved. Retry to continue.",
                "Một số thay đổi chưa được lưu. Hãy thử lại để tiếp tục.",
              ),
            };
          }}
        />
      )}
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
