"use client";

import { useEffect } from "react";

/**
 * Globally overrides browser HTML5 validation messages with Hebrew equivalents.
 * Add once to the root layout.
 */
export function HebrewValidation() {
  useEffect(() => {
    const handler = (e: Event) => {
      const input = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (!input.validity) return;

      let msg = "";
      if (input.validity.valueMissing)    msg = "שדה חובה";
      else if (input.validity.typeMismatch)  msg = "ערך לא תקין";
      else if (input.validity.patternMismatch) msg = "פורמט לא תקין";
      else if (input.validity.tooShort)   msg = "הערך קצר מדי";
      else if (input.validity.tooLong)    msg = "הערך ארוך מדי";
      else if (input.validity.rangeUnderflow) msg = "הערך נמוך מדי";
      else if (input.validity.rangeOverflow)  msg = "הערך גבוה מדי";
      else if (input.validity.stepMismatch)   msg = "ערך לא תקין";

      if (msg) {
        input.setCustomValidity(msg);
        // Reset after the user starts typing so validation re-runs cleanly
        const reset = () => { input.setCustomValidity(""); };
        input.addEventListener("input", reset, { once: true });
        input.addEventListener("change", reset, { once: true });
      }
    };

    document.addEventListener("invalid", handler, true);
    return () => document.removeEventListener("invalid", handler, true);
  }, []);

  return null;
}
