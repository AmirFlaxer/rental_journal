"use client";

import { useState, useEffect } from "react";

function addCommas(str: string): string {
  const [int, dec] = str.split(".");
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec !== undefined ? `${formatted}.${dec}` : formatted;
}

interface Props {
  value: number | undefined | null;
  onChange: (v: number | undefined) => void;
  className?: string;
  placeholder?: string;
  allowDecimal?: boolean;
}

export function NumberInput({ value, onChange, className, placeholder, allowDecimal = false }: Props) {
  const toDisplay = (n: number | undefined | null) =>
    n != null && !isNaN(n) ? addCommas(String(n)) : "";

  const [display, setDisplay] = useState(toDisplay(value));

  // Sync when value is reset externally (e.g., form reset)
  useEffect(() => {
    setDisplay(toDisplay(value));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value == null ? value : undefined]);

  const handleChange = (raw: string) => {
    // Keep only digits (and optional decimal point)
    const allowed = allowDecimal ? /[^\d.]/g : /\D/g;
    const cleaned = raw.replace(/,/g, "").replace(allowed, "");

    // Prevent multiple decimal points
    const parts = cleaned.split(".");
    const sanitized = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;

    setDisplay(sanitized === "" ? "" : addCommas(sanitized));

    const num = sanitized === "" ? undefined : parseFloat(sanitized);
    onChange(isNaN(num as number) ? undefined : num);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(e) => handleChange(e.target.value)}
      className={className}
      placeholder={placeholder}
    />
  );
}
