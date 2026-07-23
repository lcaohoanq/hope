"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FaCheck, FaChevronDown } from "react-icons/fa";
import type { Language } from "@/lib/i18n";

type LanguagePickerProps = {
  ariaLabel: string;
  onChange: (language: Language) => void;
  value: Language;
};

const options: Array<{ description: string; flag: string; label: string; value: Language }> = [
  { description: "Vietnamese", flag: "🇻🇳", label: "Tiếng Việt", value: "vi" },
  { description: "English", flag: "🇺🇸", label: "English", value: "en" },
];

export function LanguagePicker({ ariaLabel, onChange, value }: LanguagePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function selectLanguage(language: Language) {
    setIsOpen(false);
    if (language !== value) onChange(language);
  }

  return (
    <div className="relative" ref={pickerRef}>
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="group flex h-14 w-full items-center gap-3 rounded-xl border border-border bg-panel px-3.5 text-left shadow-[0_1px_0_rgb(15_23_42/0.05)] outline-none transition hover:border-muted/60 hover:bg-panel-muted focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/15"
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        type="button"
      >
        <span
          aria-hidden="true"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/12 text-xl leading-none"
        >
          {selected.flag}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-text">{selected.label}</span>
          <span className="mt-0.5 block text-xs text-muted">{selected.description}</span>
        </span>
        <FaChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 group-hover:text-text ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 rounded-xl border border-border bg-panel p-1.5 shadow-[0_20px_50px_rgb(15_23_42/0.18)]">
          <div aria-label={ariaLabel} id={listboxId} role="listbox">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  aria-selected={isSelected}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-lg px-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-accent/50 ${
                    isSelected
                      ? "bg-accent/12 text-text"
                      : "text-muted hover:bg-panel-muted hover:text-text"
                  }`}
                  key={option.value}
                  onClick={() => selectLanguage(option.value)}
                  role="option"
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl leading-none ${
                      isSelected ? "bg-accent text-accent-contrast" : "bg-panel-muted text-muted"
                    }`}
                  >
                    {option.flag}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{option.description}</span>
                  </span>
                  {isSelected ? (
                    <FaCheck aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
