"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Search, X, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";

export interface SearchSelectOption {
  id: string;
  /** The line people read to recognise the record. */
  label: string;
  /** Second line — a phone number, a part number, whatever identifies it. */
  sublabel?: React.ReactNode;
  /** Right-hand corner: a figure, a badge, a count. */
  meta?: React.ReactNode;
  /** Left-hand mark, shown when the row is not the selected one. */
  icon?: React.ReactNode;
}

interface SearchSelectProps {
  /** Controlled: the parent owns the text so it can debounce and fetch. */
  query: string;
  onQueryChange: (query: string) => void;
  options: SearchSelectOption[];
  value?: string;
  onSelect: (option: SearchSelectOption) => void;
  placeholder?: string;
  "aria-label"?: string;
  /** First load — the panel shows placeholder rows instead of "nothing found". */
  loading?: boolean;
  /** A search is in flight over results already on screen. */
  busy?: boolean;
  /** Shown inside the panel when the search found nothing. */
  empty?: React.ReactNode;
  className?: string;
  /**
   * Rows committed to the DOM. The panel scrolls, but a registry of thousands
   * should not all be rendered behind it — past this the footer says so and
   * asks for a narrower search.
   */
  maxRender?: number;
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const onDown = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) handler();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [ref, handler]);
}

/**
 * A search box whose matches drop down beneath it in a scrollable panel.
 *
 * A plain <select> is fine for a fixed handful of options; it is the wrong
 * control for a list that grows — a registry of customers, a shelf of parts —
 * where the way in is typing a name, not scrolling to one. Filtering happens
 * in the parent (usually server-side), so this owns only the opening,
 * closing and keyboard handling.
 */
export function SearchSelect({
  query,
  onQueryChange,
  options,
  value = "",
  onSelect,
  placeholder = "Search…",
  "aria-label": ariaLabel,
  loading = false,
  busy = false,
  empty,
  className,
  maxRender = 50,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useClickOutside(containerRef, () => setOpen(false));

  const shown = options.slice(0, maxRender);
  const hidden = options.length - shown.length;

  // Keep the highlighted row inside the scroll port when arrowing through a
  // list longer than the panel.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelectorAll("[data-option]")
      ?.[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (option: SearchSelectOption) => {
    onSelect(option);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (!shown.length) return;
      setActive((i) => (e.key === "ArrowDown" ? Math.min(i + 1, shown.length - 1) : Math.max(i - 1, 0)));
      return;
    }
    if (e.key === "Enter") {
      // This often sits inside a larger form. Enter picks the highlighted
      // row; it must never submit the form around it.
      e.preventDefault();
      if (open && shown[active]) choose(shown[active]);
      else setOpen(true);
      return;
    }
    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (e.key === "Tab") setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <Search
        size={16}
        className="pointer-events-none absolute left-4 top-[1.375rem] z-10 -translate-y-1/2 text-[var(--ink-label)]"
      />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          // A new set of matches means the old highlight points at someone
          // else, so it goes back to the top.
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && shown[active] ? `${listId}-${shown[active].id}` : undefined}
        autoComplete="off"
        className={cn(
          "h-11 w-full rounded-[var(--r-control)] border bg-[var(--surface-bright)] pl-11 pr-11",
          "text-sm text-[var(--ink)] placeholder:text-[var(--ink-label)]",
          "transition-[border-color] duration-150 ease-out focus:outline-none",
          open ? "border-[var(--forest)]" : "border-[var(--hairline-strong)] hover:border-[var(--ink-label)]",
        )}
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            onQueryChange("");
            setActive(0);
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className={cn(
            "absolute right-2.5 top-[1.375rem] flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full",
            "text-[var(--ink-label)] transition-[background-color,color] duration-150 ease-out",
            "hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
          )}
        >
          <X size={14} />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cn(
              "absolute left-0 right-0 top-[calc(100%+0.375rem)] z-50 overflow-hidden rounded-[var(--r-tile)]",
              "border border-[var(--hairline)] bg-[var(--surface-bright)] shadow-[var(--lift-2)]",
            )}
          >
            {loading ? (
              <div className="space-y-2 p-2.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-11 animate-pulse rounded-[var(--r-tile)] bg-[var(--surface-sunk)]" />
                ))}
              </div>
            ) : !shown.length ? (
              <div className="p-3">{empty}</div>
            ) : (
              <>
                {/* 17.5rem ≈ four rows: enough to show there is more below the
                    fold without the panel swallowing the form behind it. */}
                <ul
                  ref={listRef}
                  id={listId}
                  role="listbox"
                  className="max-h-[17.5rem] space-y-1 overflow-y-auto overscroll-contain p-1.5"
                >
                  {shown.map((option, i) => {
                    const selected = option.id === value;
                    return (
                      <li
                        key={option.id}
                        id={`${listId}-${option.id}`}
                        data-option
                        role="option"
                        aria-selected={selected}
                        onMouseEnter={() => setActive(i)}
                        // mousedown, not click: the input is focused, and a
                        // click would blur it and close the panel first.
                        onMouseDown={(e) => {
                          e.preventDefault();
                          choose(option);
                        }}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-[var(--r-tile)] px-2.5 py-2",
                          "transition-[background-color] duration-100 ease-out",
                          selected
                            ? "bg-[var(--sage)]"
                            : i === active
                              ? "bg-[var(--surface-sunk)]"
                              : "bg-transparent",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                            selected
                              ? "bg-[var(--forest)] text-[var(--ink-on-dark)]"
                              : "bg-[var(--surface-sunk)] text-[var(--ink-muted)]",
                          )}
                        >
                          {selected ? <Check size={15} /> : option.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-extrabold text-[var(--ink)]">
                            {option.label}
                          </span>
                          {option.sublabel && (
                            <span className="block truncate text-xs font-semibold text-[var(--ink-label)]">
                              {option.sublabel}
                            </span>
                          )}
                        </span>
                        {option.meta && <span className="shrink-0 text-right">{option.meta}</span>}
                      </li>
                    );
                  })}
                </ul>

                {(hidden > 0 || busy) && (
                  <p className="border-t border-[var(--hairline)] px-3.5 py-2 text-xs font-bold text-[var(--ink-label)]">
                    {busy
                      ? "Searching…"
                      : `Showing ${shown.length} of ${options.length} — keep typing to narrow it down`}
                  </p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
