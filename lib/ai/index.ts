const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

export async function translateText(
  text: string,
  targetLocale: string,
): Promise<string | null> {
  const apiKey = process.env["GOOGLE_API_KEY"];
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Translate the following text to locale "${targetLocale}". Return only the translated text, nothing else.\n\n${text}`,
              },
            ],
          },
        ],
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function gradeEssay(opts: {
  prompt: string;
  response: string;
  keyPoints?: string | null;
  guidance?: string | null;
  maxPoints: number;
}): Promise<{ score: number; rationale: string } | null> {
  const apiKey = process.env["GOOGLE_API_KEY"];
  if (!apiKey || !opts.response.trim()) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are grading an essay. Return JSON only: {"score": number, "rationale": string}.
Max points: ${opts.maxPoints}.
Question: ${opts.prompt}
Key points: ${opts.keyPoints ?? "none"}
Guidance: ${opts.guidance ?? "none"}
Student answer:
${opts.response}`,
              },
            ],
          },
        ],
      }),
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;

    const parsed = JSON.parse(text) as { score?: number; rationale?: string };
    if (typeof parsed.score !== "number") return null;
    return {
      score: Math.min(opts.maxPoints, Math.max(0, parsed.score)),
      rationale: parsed.rationale ?? "",
    };
  } catch {
    return null;
  }
}
