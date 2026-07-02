"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Input, Label } from "@/components/ui/input";

export type StationOption = {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
};

/** Searchable station picker with keyboard navigation. */
export function StationCombobox({
  label,
  name,
  stations,
  value,
  onChange,
  error,
  placeholder = "Search by city or station…",
}: {
  label: string;
  name: string;
  stations: StationOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  error?: string;
  placeholder?: string;
}) {
  const selected = stations.find((s) => s.id === value) ?? null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = `${name}-listbox`;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stations.slice(0, 8);
    return stations
      .filter(
        (s) =>
          s.city.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.state.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [stations, query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pick = (s: StationOption) => {
    onChange(s.id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <Label htmlFor={`${name}-input`}>{label}</Label>
      <input type="hidden" name={name} value={value ?? ""} />
      {selected ? (
        <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-input bg-card px-3.5 shadow-soft">
          <span className="truncate text-sm">
            <span className="font-medium">{selected.city}</span>
            <span className="text-muted-foreground"> · {selected.name} ({selected.code})</span>
          </span>
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <>
          <Input
            id={`${name}-input`}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            placeholder={placeholder}
            value={query}
            error={error}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setHighlight((h) => Math.min(h + 1, matches.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === "Enter") {
                if (open && matches[highlight]) {
                  e.preventDefault();
                  pick(matches[highlight]);
                }
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
          {open && (
            <ul
              id={listId}
              role="listbox"
              aria-label={label}
              className="absolute z-30 mt-1.5 max-h-72 w-full animate-scale-in overflow-auto rounded-xl border border-border bg-card p-1.5 shadow-lifted"
            >
              {matches.length === 0 && (
                <li className="px-3 py-2.5 text-sm text-muted-foreground">No stations found.</li>
              )}
              {matches.map((s, i) => (
                <li key={s.id} role="option" aria-selected={i === highlight}>
                  <button
                    type="button"
                    onClick={() => pick(s)}
                    onMouseEnter={() => setHighlight(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
                      i === highlight ? "bg-muted" : "",
                    )}
                  >
                    <span className="flex h-8 w-11 shrink-0 items-center justify-center rounded-md bg-primary-soft font-mono text-[11px] font-semibold text-primary">
                      {s.code}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {s.city}, {s.state}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{s.name}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {error && !selected && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
