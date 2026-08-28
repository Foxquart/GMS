"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) handler();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, handler]);
}

export interface DropdownOption {
  id: string;
  name: string;
}

interface AnimatedDropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showClearOption?: boolean;
  clearLabel?: string;
}

export function AnimatedDropdown({
  options = [],
  value = "",
  onChange,
  placeholder = "Select an option...",
  className,
  disabled = false,
  showClearOption = false,
  clearLabel = "None",
}: AnimatedDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setIsOpen(false));

  const selectedOption = options.find((opt) => opt.id === value);
  const displayLabel = selectedOption ? selectedOption.name : placeholder;

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full text-left select-none", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-[var(--r-control)] border bg-[var(--surface-bright)] px-4 text-sm",
          "transition-[border-color,color] duration-150 ease-out cursor-pointer disabled:opacity-45",
          isOpen
            ? "border-[var(--forest)] text-[var(--ink)]"
            : "border-[var(--hairline-strong)] text-[var(--ink)] hover:border-[var(--ink-label)]",
          !selectedOption && "text-[var(--ink-label)]"
        )}
      >
        <span className="truncate font-medium">{displayLabel}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="ml-2 shrink-0 text-[var(--ink-label)]"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cn(
              "absolute left-0 right-0 top-[calc(100%+0.375rem)] z-50 max-h-56 overflow-y-auto rounded-[var(--r-tile)]",
              "space-y-0.5 border border-[var(--hairline)] bg-[var(--surface-bright)] p-1.5 shadow-[var(--lift-2)]"
            )}
          >
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.03 } },
              }}
            >
              {showClearOption && (
                <motion.button
                  type="button"
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    visible: { opacity: 1, x: 0 },
                  }}
                  onClick={() => handleSelect("")}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between rounded-full px-3.5 py-2 text-xs font-bold",
                    "transition-colors duration-150 ease-out",
                    value === ""
                      ? "bg-[var(--sage)] text-[var(--forest)]"
                      : "text-[var(--ink-muted)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]"
                  )}
                >
                  <span>{clearLabel}</span>
                  {value === "" && <Check className="h-3.5 w-3.5 text-[var(--forest)]" />}
                </motion.button>
              )}

              {options.map((opt) => {
                const isSelected = value === opt.id;
                return (
                  <motion.button
                    key={opt.id}
                    type="button"
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    onClick={() => handleSelect(opt.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded-full px-3.5 py-2 text-xs font-bold",
                      "transition-colors duration-150 ease-out",
                      isSelected
                        ? "bg-[var(--sage)] text-[var(--forest)]"
                        : "text-[var(--ink-muted)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]"
                    )}
                  >
                    <span className="truncate">{opt.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--forest)]" />}
                  </motion.button>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
