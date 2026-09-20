"use client";

import type { WfhSettings } from "@hope/shared";
import { useEffect, useRef, useState } from "react";

const input = "min-w-0 rounded-md border border-border bg-app p-2 text-text";
const button =
  "rounded-md border border-border bg-panel-muted px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-contrast disabled:opacity-40";

export function WfhSettingsDialog({
  language,
  settings,
  quota,
  year,
  today,
  onSave,
  onClose,
}: {
  language: "en" | "vi";
  settings: WfhSettings | null;
  quota: number;
  year: number;
  today: string;
  onSave: (value: { quota?: number; settings?: WfhSettings }) => Promise<{
    quotaSaved: boolean;
    settingsSaved: boolean;
    error?: string;
  }>;
  onClose: () => void;
}) {
  const t = (en: string, vi: string) => (language === "vi" ? vi : en);
  const dialog = useRef<HTMLDialogElement>(null);
  const [startDate, setStartDate] = useState(settings?.startDate ?? today);
  const [endDate, setEndDate] = useState(settings?.endDate ?? "");
  const [reminderEnabled, setReminderEnabled] = useState(settings?.reminderEnabled ?? false);
  const [totalDays, setTotalDays] = useState(String(quota));
  const [savedQuota, setSavedQuota] = useState(quota);
  const [savedSettings, setSavedSettings] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const quotaChanged = totalDays !== "" && Number(totalDays) !== savedQuota;
  const settingsChanged =
    !savedSettings ||
    startDate !== savedSettings.startDate ||
    endDate !== (savedSettings.endDate ?? "") ||
    reminderEnabled !== savedSettings.reminderEnabled;
  const changed = quotaChanged || settingsChanged;

  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  useEffect(() => {
    if (saving) dialog.current?.focus();
  }, [saving]);

  return (
    <dialog
      ref={dialog}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = event.currentTarget.querySelectorAll<HTMLElement>(
          "input:not(:disabled), button:not(:disabled)",
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first) {
          event.preventDefault();
          event.currentTarget.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === event.currentTarget)
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || document.activeElement === event.currentTarget)
        ) {
          event.preventDefault();
          first.focus();
        }
      }}
      aria-labelledby="wfh-settings-title"
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-border bg-panel p-5 text-text shadow-xl backdrop:bg-black/50"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
    >
      <form
        className="grid gap-4"
        aria-busy={saving}
        onSubmit={async (event) => {
          event.preventDefault();
          if (saving || !changed) return;
          setSaving(true);
          setError("");
          try {
            const result = await onSave({
              ...(quotaChanged ? { quota: Number(totalDays) } : {}),
              ...(settingsChanged
                ? { settings: { startDate, endDate: endDate || null, reminderEnabled } }
                : {}),
            });
            if (result.quotaSaved) setSavedQuota(Number(totalDays));
            if (result.settingsSaved)
              setSavedSettings({ startDate, endDate: endDate || null, reminderEnabled });
            if (result.quotaSaved && result.settingsSaved) onClose();
            else {
              setSaving(false);
              setError(
                result.error ??
                  t(
                    "Some changes were not saved. Retry to continue.",
                    "Một số thay đổi chưa được lưu. Hãy thử lại để tiếp tục.",
                  ),
              );
            }
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : t("Could not save. Please try again.", "Không thể lưu. Vui lòng thử lại."),
            );
            setSaving(false);
          }
        }}
      >
        <h2 id="wfh-settings-title" className="text-xl font-semibold">
          {t(`WFH settings · ${year}`, `Cài đặt WFH · ${year}`)}
        </h2>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <label className="grid gap-1 text-sm">
          {t(`Annual quota · ${year}`, `Hạn mức năm · ${year}`)}
          <input
            className={input}
            type="number"
            min="0"
            max="366"
            step="1"
            required
            value={totalDays}
            disabled={saving}
            onChange={(event) => setTotalDays(event.target.value)}
          />
        </label>
        <p className="text-sm text-muted">
          {t(
            "The default is 45 days per calendar year. Your quota is not prorated for partial years. Unused days do not carry over.",
            "Mặc định là 45 ngày mỗi năm dương lịch. Hạn mức không giảm khi làm chưa đủ năm. Ngày chưa dùng không chuyển sang năm sau.",
          )}
        </p>
        <div className="grid gap-4 border-t border-border pt-4">
          <label className="grid min-w-0 gap-1 text-sm">
            {t("First working day", "Ngày bắt đầu")}
            <input
              className={input}
              type="date"
              min="1900-01-01"
              max="9998-12-31"
              required
              value={startDate}
              disabled={saving}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="grid min-w-0 gap-1 text-sm">
            {t("Last working day (optional)", "Ngày kết thúc (không bắt buộc)")}
            <input
              className={input}
              type="date"
              min={startDate || "1900-01-01"}
              max="9998-12-31"
              value={endDate}
              disabled={saving}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              className="mt-1"
              type="checkbox"
              checked={reminderEnabled}
              disabled={saving}
              onChange={(event) => setReminderEnabled(event.target.checked)}
              aria-describedby="wfh-reminder-schedule"
            />
            <span>
              {t("Email reminders", "Nhắc nhở qua email")}
              <span id="wfh-reminder-schedule" className="mt-1 block text-muted">
                {t(
                  "Every weekday at 17:30 Vietnam time, if you have not checked in.",
                  "Các ngày từ thứ Hai đến thứ Sáu lúc 17:30 giờ Việt Nam, nếu bạn chưa ghi nhận.",
                )}
              </span>
            </span>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={button} type="submit" disabled={saving || !changed}>
            {saving ? t("Saving…", "Đang lưu…") : t("Save", "Lưu")}
          </button>
          <button className={button} type="button" disabled={saving} onClick={onClose}>
            {t("Cancel", "Hủy")}
          </button>
        </div>
      </form>
    </dialog>
  );
}
