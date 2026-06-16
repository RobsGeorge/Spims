"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ExamQuestion = {
  id: string;
  type: string;
  prompt: string;
  points: number;
  options?: Array<{ id: string; text: string; matchKey?: string | null }>;
};

export function QuestionRenderer({
  question,
  value,
  onChange,
}: {
  question: ExamQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (question.type) {
    case "MCQ_SINGLE":
      return (
        <div className="space-y-2">
          {question.options?.map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={question.id}
                checked={value === opt.id}
                onChange={() => onChange(opt.id)}
              />
              {opt.text}
            </label>
          ))}
        </div>
      );
    case "MCQ_MULTI": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-2">
          {question.options?.map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(opt.id)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, opt.id]
                    : selected.filter((id) => id !== opt.id);
                  onChange(next);
                }}
              />
              {opt.text}
            </label>
          ))}
        </div>
      );
    }
    case "TRUE_FALSE":
      return (
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={value === true} onChange={() => onChange(true)} />
            True
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={value === false} onChange={() => onChange(false)} />
            False
          </label>
        </div>
      );
    case "ESSAY":
      return (
        <textarea
          className="flex min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "NUMERIC":
      return (
        <Input
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    case "SHORT_ANSWER":
    case "FILL_BLANK":
      return (
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return (
        <Input
          value={value != null ? String(value) : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export function QuestionPrompt({ question }: { question: ExamQuestion }) {
  return (
    <div className="space-y-1">
      <Label className="text-base font-medium">{question.prompt}</Label>
      <p className="text-xs text-muted-foreground">{question.points} pts</p>
    </div>
  );
}
