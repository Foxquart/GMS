"use client";

import { useRef, useState } from "react";
import { ChevronDown, Keyboard, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui";

/**
 * Indian registration numbers, entered on a phone.
 *
 * ── Why four fields and not one ──────────────────────────────────────
 * The obvious build is one text input that swaps `inputMode` as the caret
 * moves: letters for the state, digits for the district, and so on. It does
 * not work. iOS picks the keyboard when the keyboard *opens* and ignores
 * `inputmode` changes while it is up, so the operator would type the whole
 * number on whichever keyboard happened to appear first. Forcing it with
 * blur+refocus makes the keyboard drop and re-raise mid-number, which on a
 * short viewport also throws the page scroll.
 *
 * Four focusable segments each get their own keyboard at focus, which is the
 * one moment iOS honours. That is the whole reason for the shape — the same
 * reason OTP and card-expiry fields are segmented.
 *
 * ── The state segment has no keyboard at all ─────────────────────────
 * It is a native <select>, which iOS renders as a wheel and Android as a
 * dialog. For a workshop whose vehicles are overwhelmingly one state, the
 * first two characters should cost zero typing.
 *
 * ── Format ───────────────────────────────────────────────────────────
 * `SS DD L(LL) NNNN` — state, district, 1–3 letter series, 4 digits.
 * Older and special registrations do not fit it (the BH series is
 * `YY BH NNNN LL`, and army/diplomatic plates are different again), so the
 * manual toggle is not a nicety — it is the only way those get recorded.
 *
 * Deliberately *not* here: a district-code whitelist. Published TR-code lists
 * disagree with one another, and codes are added when districts are, so a
 * whitelist would reject real numbers to catch typos it cannot reliably
 * identify. Shape is checked; district is not second-guessed.
 */

const GUIDED = /^([A-Z]{2})(\d{2})([A-Z]{1,3})(\d{4})$/;
/** The same shape, partially typed — decides whether an existing value can re-open in guided mode. */
const GUIDED_PARTIAL = /^([A-Z]{2})(\d{0,2})([A-Z]{0,3})(\d{0,4})$/;

/**
 * Ordered so a Tripura workshop finds its own state and its neighbours
 * without scrolling a 36-row wheel. `BH` is deliberately absent: the Bharat
 * series is a different grammar, and offering it here would let someone build
 * a registration number that cannot exist. It goes through manual entry.
 */
const NEARBY = ["TR", "AS", "MZ", "ML", "MN", "NL", "AR", "SK", "WB"] as const;

const STATES: Record<string, string> = {
  AN: "Andaman & Nicobar",
  AP: "Andhra Pradesh",
  AR: "Arunachal Pradesh",
  AS: "Assam",
  BR: "Bihar",
  CG: "Chhattisgarh",
  CH: "Chandigarh",
  DD: "Daman & Diu",
  DL: "Delhi",
  DN: "Dadra & Nagar Haveli",
  GA: "Goa",
  GJ: "Gujarat",
  HP: "Himachal Pradesh",
  HR: "Haryana",
  JH: "Jharkhand",
  JK: "Jammu & Kashmir",
  KA: "Karnataka",
  KL: "Kerala",
  LA: "Ladakh",
  LD: "Lakshadweep",
  MH: "Maharashtra",
  ML: "Meghalaya",
  MN: "Manipur",
  MP: "Madhya Pradesh",
  MZ: "Mizoram",
  NL: "Nagaland",
  OD: "Odisha",
  PB: "Punjab",
  PY: "Puducherry",
  RJ: "Rajasthan",
  SK: "Sikkim",
  TN: "Tamil Nadu",
  TR: "Tripura",
  TS: "Telangana",
  UK: "Uttarakhand",
  UP: "Uttar Pradesh",
  WB: "West Bengal",
};

const REST_OF_INDIA = Object.keys(STATES)
  .filter((c) => !NEARBY.includes(c as (typeof NEARBY)[number]))
  .sort();

type Parts = { state: string; district: string; series: string; number: string };

const blank = (state: string): Parts => ({ state, district: "", series: "", number: "" });

/** Strips the separators people type, so "TR-01-AB-1234" and "tr01ab1234" parse alike. */
export function canonicalRegistration(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** True for a complete, well-formed standard registration number. */
export function isCompleteRegistration(value: string) {
  return GUIDED.test(canonicalRegistration(value));
}

/**
 * Splits a registration into segments, or returns null when it does not fit
 * the standard grammar — the signal to fall back to manual entry rather than
 * mangle what is already on file.
 */
export function parseRegistration(value: string): Parts | null {
  const raw = canonicalRegistration(value);
  if (!raw) return null;
  const m = GUIDED.exec(raw) ?? GUIDED_PARTIAL.exec(raw);
  if (!m) return null;
  const [, state, district, series, number] = m;
  if (!STATES[state]) return null;
  return { state, district, series, number };
}

/** The stored form. Spaced for reading; the server's dedupe key strips them again. */
function join(p: Parts) {
  // The state defaults to TR, so an untouched field must come back empty —
  // otherwise skipping the registration books the vehicle as "TR", and every
  // such vehicle then dedupes onto the same row.
  if (!p.district && !p.series && !p.number) return "";
  return [p.state, p.district, p.series, p.number].filter(Boolean).join(" ");
}

export function RegistrationInput({
  value,
  onChange,
  defaultState = "TR",
  disabled,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  /** The state this workshop sees most of. */
  defaultState?: string;
  disabled?: boolean;
  id?: string;
}) {
  // Decided from whatever the record already holds: a number that does not fit
  // the grammar opens in manual mode so it can be read and edited, not rewritten.
  const [manual, setManual] = useState(() => value.trim().length > 0 && !parseRegistration(value));
  const [parts, setParts] = useState<Parts>(() => parseRegistration(value) ?? blank(defaultState));

  const districtRef = useRef<HTMLInputElement>(null);
  const seriesRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);

  // An outside change — the parent clearing the form after a save, autofilling
  // from the customer's last visit, or an edit sheet re-opening onto a
  // different vehicle — has to reach the segments.
  //
  // Adjusted during render rather than in an effect: this is derived state, and
  // an effect would paint one frame of the previous vehicle's number before
  // correcting itself.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (!manual && join(parts) !== value) {
      const parsed = parseRegistration(value);
      if (!parsed && value.trim()) {
        // A number arrived that the four segments cannot represent. Blanking
        // them would leave the field showing nothing while the parent still
        // holds the real value — so switch to free text, where it is visible
        // and editable.
        setManual(true);
      } else {
        setParts(parsed ?? blank(defaultState));
      }
    }
  }

  /**
   * One update per keystroke — and it must stay one. Every segment routes
   * through here, including the characters it hands forward to its neighbour,
   * because two calls in a single handler would both merge onto the same stale
   * `parts` and the second would undo the first.
   */
  const set = (next: Partial<Parts>) => {
    const merged = { ...parts, ...next };
    setParts(merged);
    onChange(join(merged));
  };

  /** Distributes a pasted or scanned full number across the segments. */
  const spread = (text: string) => {
    const parsed = parseRegistration(text);
    if (!parsed) {
      // Not a standard number. Keep it rather than dropping it on the floor.
      setManual(true);
      onChange(text.trim().toUpperCase());
      return;
    }
    setParts(parsed);
    onChange(join(parsed));
  };

  const complete = isCompleteRegistration(join(parts));
  const started = Boolean(parts.district || parts.series || parts.number);

  if (manual) {
    return (
      <div className="space-y-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          disabled={disabled}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          // `uppercase` as well as the onChange transform: an Android
          // keyboard's inline suggestion can render before the state round-trip.
          className="uppercase tracking-wider"
          placeholder="e.g. 22 BH 1234 AB"
        />
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <p className="text-xs text-[var(--ink-muted)]">
            Anything goes — BH series, older plates, out-of-country vehicles.
          </p>
          <ModeToggle
            disabled={disabled}
            icon={<LayoutGrid size={13} />}
            label="Guided format"
            onClick={() => {
              const parsed = parseRegistration(value) ?? blank(defaultState);
              setParts(parsed);
              onChange(join(parsed));
              setManual(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label="Registration number"
        className={cn(
          "flex items-stretch overflow-hidden rounded-[var(--r-control)] border border-[var(--hairline-strong)]",
          "bg-[var(--surface-bright)] transition-[border-color] duration-150 ease-out",
          // The four segments are one field as far as the operator is
          // concerned, so the focus treatment belongs to the container.
          "focus-within:border-[var(--forest)]",
          disabled && "opacity-45",
        )}
      >
        {/* State — a select, so the first two characters never raise a keyboard. */}
        <div className="relative shrink-0">
          <select
            id={id}
            aria-label="State code"
            value={parts.state}
            disabled={disabled}
            onChange={(e) => {
              set({ state: e.target.value });
              districtRef.current?.focus();
            }}
            className={cn(
              "h-11 appearance-none bg-transparent pl-3.5 pr-6",
              "text-sm font-extrabold text-[var(--ink)] cursor-pointer focus:outline-none",
            )}
          >
            <optgroup label="Nearby">
              {NEARBY.map((c) => (
                <option key={c} value={c}>
                  {c} — {STATES[c]}
                </option>
              ))}
            </optgroup>
            <optgroup label="All states">
              {REST_OF_INDIA.map((c) => (
                <option key={c} value={c}>
                  {c} — {STATES[c]}
                </option>
              ))}
            </optgroup>
          </select>
          <ChevronDown
            aria-hidden="true"
            size={13}
            className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--ink-label)]"
          />
        </div>

        <Divider />

        <Segment
          ref={districtRef}
          label="District code, two digits"
          value={parts.district}
          maxLength={2}
          mode="numeric"
          placeholder="01"
          grow={2}
          disabled={disabled}
          onPasteFull={spread}
          onBackspaceEmpty={() => {}}
          // A letter typed here belongs to the series — this is what lets
          // someone type "01AB1234" straight through without tapping.
          onInput={(mine, rest) => {
            set(rest ? { district: mine, series: rest.slice(0, 3) } : { district: mine });
            if (rest || mine.length === 2) seriesRef.current?.focus();
          }}
        />

        <Divider />

        <Segment
          ref={seriesRef}
          label="Series letters"
          value={parts.series}
          maxLength={3}
          mode="text"
          placeholder="AB"
          grow={3}
          disabled={disabled}
          onPasteFull={spread}
          onBackspaceEmpty={() => districtRef.current?.focus()}
          onInput={(mine, rest) => {
            set(rest ? { series: mine, number: rest.slice(0, 4) } : { series: mine });
            if (rest || mine.length === 3) numberRef.current?.focus();
          }}
        />

        <Divider />

        <Segment
          ref={numberRef}
          label="Number, four digits"
          value={parts.number}
          maxLength={4}
          mode="numeric"
          placeholder="1234"
          grow={4}
          disabled={disabled}
          onPasteFull={spread}
          onBackspaceEmpty={() => seriesRef.current?.focus()}
          onInput={(mine) => set({ number: mine })}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <p className="text-xs text-[var(--ink-muted)]">
          {started && !complete ? (
            // Phrased as what is missing, not as "invalid" — the field is
            // optional, and a half-typed number is not an error yet.
            <span className="font-semibold text-[var(--ochre-ink)]">
              Finish all four parts, or switch to a different format.
            </span>
          ) : (
            STATES[parts.state]
          )}
        </p>
        <ModeToggle
          disabled={disabled}
          icon={<Keyboard size={13} />}
          label="Different format"
          onClick={() => {
            onChange(join(parts));
            setManual(true);
          }}
        />
      </div>
    </div>
  );
}

const Divider = () => (
  <span aria-hidden="true" className="w-px shrink-0 self-stretch bg-[var(--hairline)]" />
);

const ModeToggle = ({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-[var(--r-control)] px-1.5 py-1",
      "text-xs font-bold text-[var(--ink-muted)] transition-colors duration-150 ease-out",
      "hover:text-[var(--ink)] focus-visible:text-[var(--ink)] focus-visible:outline-none",
      "focus-visible:ring-2 focus-visible:ring-[var(--forest)]/35 disabled:opacity-45",
    )}
  >
    {icon}
    {label}
  </button>
);

/**
 * One segment. It filters its own charset — a numeric segment must not end up
 * holding letters just because some keyboard offered them (Android's number
 * row, a Bluetooth keyboard, a barcode scanner) — and hands anything it cannot
 * hold to the next segment rather than dropping it.
 */
function Segment({
  ref,
  label,
  value,
  maxLength,
  mode,
  placeholder,
  grow,
  disabled,
  onInput,
  onBackspaceEmpty,
  onPasteFull,
}: {
  ref: React.RefObject<HTMLInputElement | null>;
  label: string;
  value: string;
  maxLength: number;
  mode: "numeric" | "text";
  placeholder: string;
  /** Flex weight, so the segments share the row in proportion to their length. */
  grow: number;
  disabled?: boolean;
  /** `mine` is what this segment keeps; `rest` is what belongs further right. */
  onInput: (mine: string, rest: string) => void;
  onBackspaceEmpty: () => void;
  onPasteFull: (text: string) => void;
}) {
  const accepts = mode === "numeric" ? /[0-9]/ : /[A-Z]/;

  return (
    <input
      ref={ref}
      aria-label={label}
      value={value}
      disabled={disabled}
      inputMode={mode}
      // `text` rather than `tel` for the numeric segments: `tel` raises a phone
      // keypad complete with + * # , none of which are registration characters.
      // `inputMode="numeric"` on a text input gives the bare digit pad.
      type="text"
      autoCapitalize="characters"
      autoCorrect="off"
      autoComplete="off"
      spellCheck={false}
      placeholder={placeholder}
      onPaste={(e) => {
        const text = e.clipboardData.getData("text");
        // Only intercept a paste that is longer than this segment — pasting
        // two digits into the district field should behave normally.
        if (canonicalRegistration(text).length > maxLength) {
          e.preventDefault();
          onPasteFull(text);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Backspace" && !e.currentTarget.value) {
          e.preventDefault();
          onBackspaceEmpty();
        }
      }}
      onChange={(e) => {
        const raw = canonicalRegistration(e.target.value);
        // Take the leading run this segment can hold; everything from the first
        // character it cannot hold onwards moves right, in order.
        let cut = 0;
        while (cut < raw.length && cut < maxLength && accepts.test(raw[cut])) cut += 1;
        onInput(raw.slice(0, cut), raw.slice(cut));
      }}
      style={{ flexGrow: grow, flexBasis: 0 }}
      className={cn(
        "h-11 min-w-0 bg-transparent px-1.5 text-center",
        "text-sm font-extrabold uppercase tracking-wider text-[var(--ink)]",
        "tabular placeholder:font-semibold placeholder:tracking-normal",
        "placeholder:text-[var(--ink-label)] focus:outline-none",
        // The container carries the focus treatment for the group; a per-segment
        // ring would draw four boxes inside one field.
        "focus:bg-[var(--sage)]/30",
      )}
    />
  );
}
