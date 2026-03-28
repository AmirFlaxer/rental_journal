"use client";

import { useId, useState, useEffect } from "react";

interface DateInputProps {
  value?: string; // YYYY-MM-DD
  onChange?: (value: string) => void;
  required?: boolean;
  min?: string; // YYYY-MM-DD
  className?: string;
  id?: string;
}

function parseDate(v: string | undefined): { d: string; m: string; y: string } {
  if (!v) return { d: "", m: "", y: "" };
  const [y, m, d] = v.split("-");
  return { d: d || "", m: m || "", y: y || "" };
}

function toIso(d: string, m: string, y: string): string {
  if (!d || !m || !y || y.length < 4) return "";
  const dd = d.padStart(2, "0");
  const mm = m.padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

const inp =
  "border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center px-2 py-2";

export function DateInput({ value, onChange, required, min, className, id }: DateInputProps) {
  const uid = useId();
  const baseId = id || uid;

  // Local state so partial input (e.g. day only) isn't reset while typing
  const [local, setLocal] = useState(() => parseDate(value));

  // Sync external value → local (e.g. when parent resets the field)
  useEffect(() => {
    setLocal(parseDate(value));
  }, [value]);

  const handle = (field: "d" | "m" | "y", raw: string) => {
    const val = raw.replace(/\D/g, "");
    const next = { ...local, [field]: val };
    setLocal(next);
    const iso = toIso(next.d, next.m, next.y);
    if (iso) {
      if (min && iso < min) return;
      onChange?.(iso);
    } else if (!next.d && !next.m && !next.y) {
      onChange?.("");
    }
  };

  return (
    <div className={`flex gap-1 items-center ${className || ""}`} dir="ltr">
      <div className="flex flex-col items-center">
        <input
          id={`${baseId}-d`}
          value={local.d}
          onChange={(e) => handle("d", e.target.value)}
          required={required}
          maxLength={2}
          inputMode="numeric"
          placeholder="יי"
          className={`${inp} w-12`}
          aria-label="יום"
        />
        <span className="text-[10px] text-gray-400 mt-0.5">יום</span>
      </div>
      <span className="text-gray-400 font-bold pb-4">/</span>
      <div className="flex flex-col items-center">
        <input
          id={`${baseId}-m`}
          value={local.m}
          onChange={(e) => handle("m", e.target.value)}
          required={required}
          maxLength={2}
          inputMode="numeric"
          placeholder="חח"
          className={`${inp} w-12`}
          aria-label="חודש"
        />
        <span className="text-[10px] text-gray-400 mt-0.5">חודש</span>
      </div>
      <span className="text-gray-400 font-bold pb-4">/</span>
      <div className="flex flex-col items-center">
        <input
          id={`${baseId}-y`}
          value={local.y}
          onChange={(e) => handle("y", e.target.value)}
          required={required}
          maxLength={4}
          inputMode="numeric"
          placeholder="שששש"
          className={`${inp} w-16`}
          aria-label="שנה"
        />
        <span className="text-[10px] text-gray-400 mt-0.5">שנה</span>
      </div>
    </div>
  );
}
