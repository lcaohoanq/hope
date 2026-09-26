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
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  House,
  LoaderCircle,
  Settings,
} from "lucide-react";
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
  const [editor, setEditor] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<"choice" | "form">("choice");
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [dragRange, setDragRange] = useState<{ start: string; end: string } | null>(null);
  const drag = useRef<{ start: string; end: string } | null>(null);
  const suppressClick = useRef(false);
  const batchSaving = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const rangeDialog = useRef<HTMLDialogElement>(null);
  const rangeOpen = range !== null;
  const noteInput = useRef<HTMLTextAreaElement>(null);
  const homeChoice = useRef<HTMLButtonElement>(null);
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
  useEffect(() => {
    if (!dialogOpen) return;
    if (dialogStep === "form") noteInput.current?.focus();
    else homeChoice.current?.focus();
  }, [dialogOpen, dialogStep]);

  useEffect(() => {
    const element = rangeDialog.current;
    if (!rangeOpen || !element) return;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [rangeOpen]);

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
  const officeDays = records.filter(
    (record) =>
      record.date.startsWith(`${year}-`) && isWfhWorkday(record.date) && record.status === "OFFICE",
  ).length;
  const recordedDays = officeDays + stats.used;
  const officePercent = recordedDays ? Math.round((officeDays / recordedDays) * 100) : 0;
  const homePercent = recordedDays ? 100 - officePercent : 0;
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
  const activeRange = dragRange ?? range;
  const rangeDates =
    activeRange &&
    [activeRange.start, activeRange.end].every(
      (date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date.startsWith(`${year}-`),
    )
      ? getDaysInRange(...([activeRange.start, activeRange.end].sort() as [string, string])).filter(
          canEdit,
        )
      : [];
  const rangeDateSet = new Set(rangeDates);
  const replacedWfhDays = rangeDates.filter((date) => byDate.get(date)?.status === "WFH").length;
  const replacedOfficeDays = rangeDates.filter(
    (date) => byDate.get(date)?.status === "OFFICE",
  ).length;
  async function recordRange(status: "OFFICE" | "WFH") {
    if (busy || batchSaving.current || !rangeDates.length) return;
    batchSaving.current = true;
    setBusy(true);
    setError("");
    setConfirmation("");
    let saved = 0;
    try {
      const client = getClientApiClient(await getToken());
      for (const date of rangeDates) {
        await unwrapResponse(
          await client.wfh["check-ins"].$post({
            json: { date, status, note: byDate.get(date)?.note ?? "" },
          }),
        );
        saved++;
      }
      await load(true);
      setRange(null);
      setConfirmation(
        status === "WFH"
          ? t(`Recorded ${saved} WFH days.`, `Đã ghi nhận ${saved} ngày WFH.`)
          : t(`Recorded ${saved} office days.`, `Đã ghi nhận ${saved} ngày lên công ty.`),
      );
    } catch {
      await load(true);
      setError(
        t(
          `Saved ${saved} of ${rangeDates.length} days. Some days could not be saved. Try saving the range again.`,
          `Đã lưu ${saved}/${rangeDates.length} ngày. Một số ngày chưa lưu được. Hãy lưu lại khoảng ngày này.`,
        ),
      );
    } finally {
      batchSaving.current = false;
      setBusy(false);
    }
  }
  function choose(date: string) {
    if (!canEdit(date)) return;
    setSelected(date);
    setNote(byDate.get(date)?.note ?? "");
    setError("");
    setDialogStep("choice");
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
          <section
            className={panel}
            aria-label={t("Office and WFH comparison", "So sánh văn phòng và WFH")}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{t("Your workday mix", "Đi làm hay ở nhà?")}</h2>
              <span className="rounded-full bg-panel-muted px-3 py-1 text-xs font-medium text-muted">
                {year}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 sm:p-4 dark:border-blue-900 dark:bg-blue-950/30">
                <Building2
                  size={22}
                  className="mb-3 text-blue-700 dark:text-blue-300"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">{t("At the office", "Lên công ty")}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {officeDays}{" "}
                  <span className="text-sm font-normal tracking-normal text-muted">
                    {t(officeDays === 1 ? "day" : "days", "ngày")}
                  </span>
                </p>
                <p className="mt-2 text-xs text-muted">
                  {t("Coffee with the team", "Cà phê cùng đồng đội")}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 sm:p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                <House
                  size={22}
                  className="mb-3 text-emerald-700 dark:text-emerald-300"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">{t("Work from home", "WFH vui vẻ")}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {stats.used}{" "}
                  <span className="text-sm font-normal tracking-normal text-muted">
                    {t(stats.used === 1 ? "day" : "days", "ngày")}
                  </span>
                </p>
                <p className="mt-2 text-xs text-muted">{t("Skip the commute", "Khỏi lo kẹt xe")}</p>
              </div>
            </div>
            {recordedDays > 0 && (
              <>
                <div
                  className="mt-4 flex h-2 overflow-hidden rounded-full bg-panel-muted"
                  aria-hidden="true"
                >
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${(officeDays / recordedDays) * 100}%` }}
                  />
                  <div
                    className="h-full bg-emerald-600"
                    style={{ width: `${(stats.used / recordedDays) * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted">
                  <span>
                    {t("Office", "Văn phòng")} · {officePercent}%
                  </span>
                  <span>WFH · {homePercent}%</span>
                </div>
              </>
            )}
            <p className="mt-4 text-sm text-muted">
              {!recordedDays
                ? t(
                    "Your workday story starts with the first check-in.",
                    "Ghi nhận ngày đầu tiên để bắt đầu câu chuyện đi làm của bạn nhé!",
                  )
                : officeDays === stats.used
                  ? t(
                      "A little team time, a little home time. Nicely balanced!",
                      "Một nửa gặp đồng đội, một nửa ở nhà. Cân bằng phết!",
                    )
                  : officeDays > stats.used
                    ? t(
                        "Team office is in the lead. Coffee with colleagues it is!",
                        "Team lên công ty đang dẫn đầu. Hẹn đồng đội một ly cà phê thôi!",
                      )
                    : t(
                        "Team home is in the lead. Enjoy those commute-free mornings!",
                        "Team ở nhà đang dẫn đầu. Thêm vài buổi sáng không lo kẹt xe!",
                      )}
            </p>
            <p className="mt-1 text-xs text-muted">
              {t(
                `Based on ${recordedDays} recorded workdays in ${year}.`,
                `Tính trên ${recordedDays} ngày đã ghi nhận trong năm ${year}.`,
              )}
            </p>
          </section>
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
                      setRange(null);
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
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-semibold">{t("Calendar", "Lịch")}</h2>
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() => {
                      const date = selected.startsWith(`${year}-`) ? selected : `${year}-01-01`;
                      setRange({ start: date, end: date });
                      setConfirmation("");
                    }}
                  >
                    {t("Select date range", "Chọn khoảng ngày")}
                  </button>
                </div>
                <p className="mb-4 text-sm text-muted">
                  {t(
                    "Green: WFH · Blue: Office · Empty: Not recorded",
                    "Xanh lá: WFH · Xanh dương: Văn phòng · Trống: Chưa ghi nhận",
                  )}{" "}
                  {t(
                    "Click a day to edit, or drag across dates to record Office or WFH days together. On mobile, use Select date range. Weekends are excluded.",
                    "Bấm một ngày để sửa, hoặc kéo chuột qua các ngày để ghi nhận Văn phòng hoặc WFH một lần. Trên điện thoại, dùng Chọn khoảng ngày. Bỏ qua cuối tuần.",
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
                                data-wfh-date={date}
                                aria-pressed={rangeDateSet.has(date)}
                                disabled={busy || !canEdit(date)}
                                style={index === 0 ? { gridColumnStart: offset + 1 } : undefined}
                                aria-label={`${date}: ${isWfhWorkday(date) ? statusLabel(byDate.get(date)?.status) : t("Weekend · Not a workday", "Cuối tuần · Không làm việc")}`}
                                aria-haspopup="dialog"
                                title={`${date}: ${isWfhWorkday(date) ? statusLabel(byDate.get(date)?.status) : t("Weekend · Not a workday", "Cuối tuần · Không làm việc")}`}
                                onPointerDown={(event) => {
                                  suppressClick.current = false;
                                  if (event.pointerType !== "mouse" || event.button !== 0 || busy)
                                    return;
                                  drag.current = { start: date, end: date };
                                  event.currentTarget.setPointerCapture(event.pointerId);
                                }}
                                onPointerMove={(event) => {
                                  if (!drag.current) return;
                                  const target = document
                                    .elementFromPoint(event.clientX, event.clientY)
                                    ?.closest<HTMLElement>("[data-wfh-date]");
                                  const end = target?.dataset.wfhDate;
                                  if (!end || end === drag.current.end) return;
                                  drag.current.end = end;
                                  suppressClick.current = true;
                                  setDragRange({ ...drag.current });
                                }}
                                onPointerUp={() => {
                                  if (drag.current && suppressClick.current) {
                                    const [start, end] = [
                                      drag.current.start,
                                      drag.current.end,
                                    ].sort();
                                    setRange({ start, end });
                                  }
                                  drag.current = null;
                                  setDragRange(null);
                                }}
                                onPointerCancel={() => {
                                  drag.current = null;
                                  setDragRange(null);
                                }}
                                onLostPointerCapture={() => {
                                  drag.current = null;
                                  setDragRange(null);
                                }}
                                onClick={(event) => {
                                  if (event.detail > 0 && suppressClick.current) {
                                    suppressClick.current = false;
                                    return;
                                  }
                                  setRange(null);
                                  choose(date);
                                }}
                                className={`select-none aspect-square rounded text-xs focus-visible:outline focus-visible:outline-2 ${!isWfhWorkday(date) ? "bg-transparent text-muted" : byDate.get(date)?.status === "WFH" ? "bg-emerald-600 text-white" : byDate.get(date)?.status === "OFFICE" ? "bg-blue-600 text-white" : "bg-panel-muted text-muted"} ${rangeDateSet.has(date) ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-panel" : selected === date && dialogOpen ? "ring-2 ring-accent" : ""} ${!canEdit(date) ? "opacity-40 cursor-not-allowed" : ""}`}
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
        ref={rangeDialog}
        aria-labelledby="wfh-range-title"
        aria-describedby="wfh-range-description"
        className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-border bg-panel p-5 text-text shadow-xl backdrop:bg-black/50 sm:p-6"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
        onClose={() => setRange(null)}
      >
        {range && (
          <div className="grid gap-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                <Building2 size={22} aria-hidden="true" />
              </span>
              <div>
                <h2 id="wfh-range-title" className="text-xl font-semibold tracking-tight">
                  {t("Selected date range", "Khoảng ngày đã chọn")}
                </h2>
                <p id="wfh-range-description" className="mt-1 text-sm text-muted">
                  {t(
                    "Choose Office or WFH for all selected days. Weekends are skipped.",
                    "Chọn Văn phòng hoặc WFH cho cả khoảng ngày. Tự bỏ qua cuối tuần.",
                  )}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-1 text-sm">
                {t("From date", "Từ ngày")}
                <input
                  type="date"
                  className={`${input} min-w-0 w-full`}
                  min={`${year}-01-01`}
                  max={year === Number(today.slice(0, 4)) ? today : `${year}-12-31`}
                  value={range.start}
                  disabled={busy}
                  onChange={(event) => setRange({ ...range, start: event.target.value })}
                />
              </label>
              <label className="grid min-w-0 gap-1 text-sm">
                {t("To date", "Đến ngày")}
                <input
                  type="date"
                  className={`${input} min-w-0 w-full`}
                  min={`${year}-01-01`}
                  max={year === Number(today.slice(0, 4)) ? today : `${year}-12-31`}
                  value={range.end}
                  disabled={busy}
                  onChange={(event) => setRange({ ...range, end: event.target.value })}
                />
              </label>
            </div>
            <p className="text-sm" aria-live="polite">
              {t(
                `${rangeDates.length} eligible workdays selected.`,
                `Đã chọn ${rangeDates.length} ngày làm việc hợp lệ.`,
              )}
            </p>
            {replacedWfhDays > 0 && (
              <p className="text-sm text-muted">
                {t(
                  `Choosing Office will change ${replacedWfhDays} WFH days.`,
                  `Chọn Văn phòng sẽ chuyển ${replacedWfhDays} ngày WFH thành ngày lên công ty.`,
                )}
              </p>
            )}
            {replacedOfficeDays > 0 && (
              <p className="text-sm text-muted">
                {t(
                  `Choosing WFH will change ${replacedOfficeDays} office days.`,
                  `Chọn WFH sẽ chuyển ${replacedOfficeDays} ngày lên công ty thành ngày WFH.`,
                )}
              </p>
            )}
            <p className="text-xs text-muted">
              {t("Existing notes are kept for each day.", "Giữ nguyên ghi chú cũ của từng ngày.")}
            </p>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !rangeDates.length}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                onClick={() => void recordRange("OFFICE")}
              >
                {busy ? t("Saving…", "Đang lưu…") : t("Record office days", "Ghi nhận lên công ty")}
              </button>
              <button
                type="button"
                disabled={busy || !rangeDates.length}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                onClick={() => void recordRange("WFH")}
              >
                {busy ? t("Saving…", "Đang lưu…") : t("Record WFH days", "Ghi nhận WFH")}
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-panel-muted hover:text-text disabled:opacity-50"
                disabled={busy}
                onClick={() => setRange(null)}
              >
                {t("Cancel selection", "Hủy chọn")}
              </button>
            </div>
          </div>
        )}
      </dialog>
      <dialog
        ref={dialog}
        aria-labelledby="wfh-dialog-title"
        aria-describedby="wfh-dialog-date"
        className="m-auto w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-border bg-panel p-5 text-text shadow-xl backdrop:bg-black/50 sm:p-6"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
        onClose={() => setDialogOpen(false)}
      >
        {dialogStep === "choice" ? (
          <div className="grid gap-5">
            <div>
              <h2 id="wfh-dialog-title" className="text-xl font-semibold tracking-tight">
                {t("Where did you work?", "Bạn làm việc ở đâu?")}
              </h2>
              <p id="wfh-dialog-date" className="mt-1 text-sm text-muted">
                {new Intl.DateTimeFormat(vi ? "vi" : "en", {
                  dateStyle: "full",
                  timeZone: "UTC",
                }).format(new Date(`${selected}T00:00:00Z`))}
              </p>
            </div>
            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
                {error}
              </p>
            )}
            <div className="grid gap-3">
              <button
                type="button"
                aria-labelledby="wfh-office-label"
                aria-describedby="wfh-office-description"
                className="flex w-full items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-left transition-colors hover:border-blue-400 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 dark:border-blue-900 dark:bg-blue-950/30 dark:hover:bg-blue-950/60"
                disabled={busy || !canEdit(selected)}
                onClick={async () => {
                  if (busy || !canEdit(selected)) return;
                  const saved = await mutate((client) =>
                    client.wfh["check-ins"].$post({
                      json: { date: selected, status: "OFFICE", note },
                    }),
                  );
                  if (saved) setDialogOpen(false);
                }}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  {busy ? (
                    <LoaderCircle
                      size={22}
                      className="animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <Building2 size={22} aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span id="wfh-office-label" className="block font-semibold">
                    {t("At the office", "Tại văn phòng")}
                  </span>
                  <span
                    id="wfh-office-description"
                    className="mt-1 block text-sm text-muted"
                    aria-live="polite"
                  >
                    {busy ? t("Saving…", "Đang lưu…") : t("Record immediately", "Ghi nhận ngay")}
                  </span>
                  {byDate.get(selected)?.status === "OFFICE" && (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                      <Check size={12} aria-hidden="true" />
                      {t("Current", "Hiện tại")}
                    </span>
                  )}
                </span>
              </button>
              <button
                ref={homeChoice}
                type="button"
                aria-labelledby="wfh-home-label"
                aria-describedby="wfh-home-description"
                className="flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50 dark:border-emerald-900 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60"
                disabled={busy}
                onClick={() => {
                  setError("");
                  setDialogStep("form");
                }}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                  <House size={22} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span id="wfh-home-label" className="block font-semibold">
                    {t("Work from home", "Làm việc tại nhà")}
                  </span>
                  <span id="wfh-home-description" className="mt-1 block text-sm text-muted">
                    {t("Continue to add a note", "Tiếp tục thêm ghi chú")}
                  </span>
                  {byDate.get(selected)?.status === "WFH" && (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      <Check size={12} aria-hidden="true" />
                      {t("Current", "Hiện tại")}
                    </span>
                  )}
                </span>
                <ArrowRight
                  size={18}
                  className="shrink-0 text-emerald-700 dark:text-emerald-300"
                  aria-hidden="true"
                />
              </button>
            </div>
            <button
              type="button"
              className="justify-self-center rounded-md px-4 py-2 text-sm text-muted hover:bg-panel-muted hover:text-text disabled:opacity-50"
              disabled={busy}
              onClick={() => setDialogOpen(false)}
            >
              {t("Cancel", "Hủy")}
            </button>
          </div>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy || !canEdit(selected)) return;
              const saved = await mutate((client) =>
                client.wfh["check-ins"].$post({ json: { date: selected, status: "WFH", note } }),
              );
              if (saved) setDialogOpen(false);
            }}
          >
            <h2 id="wfh-dialog-title" className="text-xl font-semibold">
              {t("Work from home", "Làm việc tại nhà")}
            </h2>
            <p id="wfh-dialog-date" className="text-sm text-muted">
              {formatDate(selected)}
            </p>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <label className="grid gap-1 text-sm">
              {t("Note (optional)", "Ghi chú (không bắt buộc)")}
              <textarea
                ref={noteInput}
                placeholder={t(
                  "Anything to note about this day?",
                  "Bạn muốn ghi chú gì cho ngày này?",
                )}
                className={input}
                rows={3}
                maxLength={2000}
                value={note}
                disabled={busy}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50"
                disabled={busy || !canEdit(selected)}
              >
                {busy ? t("Saving…", "Đang lưu…") : t("Save WFH", "Lưu WFH")}
              </button>
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => {
                  setError("");
                  setDialogStep("choice");
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ArrowLeft size={16} aria-hidden="true" />
                  {t("Back", "Quay lại")}
                </span>
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
        )}
      </dialog>
    </div>
  );
}
