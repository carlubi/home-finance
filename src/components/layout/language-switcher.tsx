"use client";

import { Check, Languages } from "lucide-react";
import { LANGUAGES, type AppLanguage } from "@/lib/language";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/layout/language-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSegmentedControl() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Languages className="size-4 text-muted-foreground" />
        Idioma
      </div>
      <div className="grid grid-cols-2 gap-2">
        {LANGUAGES.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={language === option.value ? "default" : "outline"}
            onClick={() => setLanguage(option.value)}
            className="justify-between"
          >
            {option.label}
            {language === option.value && <Check className="size-4" />}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function LanguageInlineOptions({
  onChange,
}: {
  onChange?: (language: AppLanguage) => void;
}) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="grid gap-1 px-1.5 py-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Languages className="size-3.5" />
        Idioma
      </div>
      <div className="grid gap-1">
        {LANGUAGES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setLanguage(option.value);
              onChange?.(option.value);
            }}
            className={cn(
              "flex items-center justify-between rounded-md px-1.5 py-1 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
              language === option.value && "bg-accent text-accent-foreground"
            )}
          >
            {option.label}
            {language === option.value && <Check className="size-3.5" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LanguageMenuButton() {
  const { language, setLanguage } = useLanguage();
  const activeLanguage = LANGUAGES.find((option) => option.value === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-9 cursor-pointer gap-1.5 px-2"
            aria-label="Idioma"
            title="Idioma"
          >
            <Languages className="size-4" />
            <span className="text-xs font-semibold" data-no-translate>
              {activeLanguage?.value.toUpperCase()}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-36">
        {LANGUAGES.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setLanguage(option.value)}
            className="cursor-pointer justify-between"
          >
            <span>{option.label}</span>
            {language === option.value && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageSubmenu() {
  const { language, setLanguage } = useLanguage();
  const activeLanguage = LANGUAGES.find((option) => option.value === language);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Languages />
        <span>Idioma</span>
        <span className="text-xs text-muted-foreground">{activeLanguage?.label}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-36">
        {LANGUAGES.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setLanguage(option.value)}
            className="justify-between"
          >
            <span>{option.label}</span>
            {language === option.value && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
