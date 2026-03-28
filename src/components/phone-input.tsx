"use client";

import { formatPhone, stripPhone } from "@/lib/phone";

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Phone input that auto-formats Israeli numbers as the user types.
 * Stores and emits the formatted value (e.g. "052-123 4567").
 */
export function PhoneInput({ value, onChange, className, ...props }: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = stripPhone(e.target.value);
    const formatted = formatPhone(digits) || digits;
    onChange(formatted);
  };

  return (
    <input
      type="tel"
      inputMode="tel"
      dir="ltr"
      value={value}
      onChange={handleChange}
      className={className}
      {...props}
    />
  );
}
