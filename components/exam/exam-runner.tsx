"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExamTimer } from "@/components/exam/exam-timer";
import { IntegrityGuard } from "@/components/exam/integrity-guard";
import { QuestionPrompt, QuestionRenderer } from "@/components/exam/question-renderer";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

type ExamSnapshot = {
  questions: Array<{
    id: string;
    type: string;
    prompt: string;
    points: number;
    options?: Array<{ id: string; text: string; matchKey?: string | null }>;
  }>;
};

type AttemptData = {
  id: string;
  dueAt: string;
  examSnapshot: ExamSnapshot | null;
  answers: Array<{ questionId: string; response: unknown }>;
  assessment: {
    enforceFullScreen: boolean;
    oneAtATime: boolean;
    noBacktrack: boolean;
    logFocusLoss: boolean;
    title: string;
  };
};

export function ExamRunner({
  assessmentId,
  initialAttempt,
}: {
  assessmentId: string;
  initialAttempt?: AttemptData | null;
}) {
  const t = useTranslations("exam");
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [attempt, setAttempt] = useState<AttemptData | null>(initialAttempt ?? null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!attempt) return;
    const map: Record<string, unknown> = {};
    for (const a of attempt.answers) map[a.questionId] = a.response;
    setAnswers(map);
  }, [attempt]);

  const questions = attempt?.examSnapshot?.questions ?? [];
  const current = questions[currentIndex];
  const showOneAtATime = attempt?.assessment.oneAtATime || isMobile;

  const debouncedSave = useCallback(
    (questionId: string, response: unknown) => {
      if (!attempt) return;
      if (saveTimers.current[questionId]) clearTimeout(saveTimers.current[questionId]);
      saveTimers.current[questionId] = setTimeout(() => {
        void fetch(`/api/attempts/${attempt.id}/answers`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId, response }),
        });
      }, 500);
    },
    [attempt],
  );

  async function startExam() {
    setError(null);
    const res = await fetch(`/api/assessments/${assessmentId}/attempts`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? t("startFailed"));
      return;
    }
    const full = await fetch(`/api/attempts/${data.attempt.id}`);
    const fullData = await full.json();
    setAttempt(fullData.attempt);
  }

  const submitExam = useCallback(async () => {
    if (!attempt) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/attempts/${attempt.id}/submit`, { method: "POST" });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.message ?? t("submitFailed"));
      return;
    }
    window.location.href = "/grades";
  }, [attempt, t]);

  useEffect(() => {
    if (!attempt) return;
    const check = setInterval(async () => {
      if (new Date(attempt.dueAt) <= new Date()) {
        await submitExam();
      }
    }, 5000);
    return () => clearInterval(check);
  }, [attempt, submitExam]);

  if (!attempt) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={() => void startExam()}>{t("start")}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="font-semibold">{attempt.assessment.title}</h1>
        <ExamTimer dueAt={attempt.dueAt} />
      </header>
      <IntegrityGuard
        logFocusLoss={attempt.assessment.logFocusLoss}
        enforceFullScreen={attempt.assessment.enforceFullScreen}
        attemptId={attempt.id}
      />
      <main className="flex-1 overflow-auto p-4">
        {showOneAtATime ? (
          current && (
            <Card className="max-w-2xl mx-auto">
              <CardContent className="space-y-4 pt-6">
                <QuestionPrompt question={current} />
                <QuestionRenderer
                  question={current}
                  value={answers[current.id]}
                  onChange={(v) => {
                    setAnswers((prev) => ({ ...prev, [current.id]: v }));
                    debouncedSave(current.id, v);
                  }}
                />
              </CardContent>
            </Card>
          )
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {questions.map((question) => (
              <Card key={question.id}>
                <CardContent className="space-y-4 pt-6">
                  <QuestionPrompt question={question} />
                  <QuestionRenderer
                    question={question}
                    value={answers[question.id]}
                    onChange={(v) => {
                      setAnswers((prev) => ({ ...prev, [question.id]: v }));
                      debouncedSave(question.id, v);
                    }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <footer className="flex items-center justify-between border-t px-4 py-3">
        <div className="flex gap-2">
          {showOneAtATime && (
            <>
              <Button
                variant="outline"
                disabled={currentIndex === 0 || attempt.assessment.noBacktrack}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              >
                {t("previous")}
              </Button>
              <Button
                variant="outline"
                disabled={currentIndex >= questions.length - 1}
                onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
              >
                {t("next")}
              </Button>
            </>
          )}
        </div>
        {showOneAtATime && (
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {questions.length}
          </span>
        )}
        <Button onClick={() => void submitExam()} disabled={submitting}>
          {submitting ? t("submitting") : t("submit")}
        </Button>
      </footer>
      {error && <p className="px-4 pb-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
