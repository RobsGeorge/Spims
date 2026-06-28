"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export function OtpDigitInput({
  value,
  onChange,
  error,
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  error?: boolean;
  disabled?: boolean;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  function setDigit(index: number, char: string) {
    const next = [...digits];
    next[index] = char;
    onChange(next.join("").replace(/\s/g, "").slice(0, 6));
  }

  function focusIndex(index: number) {
    inputsRef.current[index]?.focus();
  }

  return (
    <div className="flex justify-between gap-2 sm:gap-3" dir="ltr">
      {Array.from({ length: 6 }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          value={digits[index]?.trim() ?? ""}
          className={cn(
            "h-14 w-11 rounded-2xl border bg-background text-center text-xl font-semibold tabular-nums shadow-inner sm:h-16 sm:w-14",
            "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
            error ? "border-destructive text-destructive" : "border-border",
          )}
          onChange={(e) => {
            const char = e.target.value.replace(/\D/g, "").slice(-1);
            setDigit(index, char);
            if (char && index < 5) focusIndex(index + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[index]?.trim() && index > 0) {
              focusIndex(index - 1);
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            onChange(pasted);
            focusIndex(Math.min(pasted.length, 5));
          }}
        />
      ))}
    </div>
  );
}
