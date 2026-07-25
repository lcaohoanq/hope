"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Language } from "@/lib/i18n";

type LanguagePickerProps = {
  ariaLabel: string;
  onChange: (language: Language) => void;
  value: Language;
};

const options: Array<{ flag: string; label: string; value: Language }> = [
  { flag: "🇻🇳", label: "Tiếng Việt", value: "vi" },
  { flag: "🇺🇸", label: "English", value: "en" },
];

export function LanguagePicker({ ariaLabel, onChange, value }: LanguagePickerProps) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  function selectLanguage(nextValue: string) {
    if ((nextValue === "vi" || nextValue === "en") && nextValue !== value) {
      onChange(nextValue);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={ariaLabel}
          className="h-10 border-border bg-panel px-3 text-text shadow-sm hover:bg-panel-muted hover:text-text focus-visible:ring-accent"
          variant="outline"
        >
          <Languages aria-hidden="true" className="h-4 w-4 text-muted" />
          <span aria-hidden="true">{selected.flag}</span>
          <span>{selected.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        aria-label={ariaLabel}
        className="w-48 border-border bg-panel text-text"
      >
        <DropdownMenuLabel>{ariaLabel}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuRadioGroup onValueChange={selectLanguage} value={value}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              className="focus:bg-panel-muted focus:text-text"
              key={option.value}
              value={option.value}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true">{option.flag}</span>
                <span>{option.label}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
