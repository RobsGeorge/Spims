"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Field {
  id: string;
  label: string;
  type: string;
  required: boolean;
  adminNote: string | null;
}

type ProfilePrefill = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

function profileValueForField(field: Field, profile: ProfilePrefill): string | undefined {
  const label = field.label.toLowerCase();
  if (label.includes("first") && label.includes("name")) return profile.firstName;
  if (label.includes("last") && label.includes("name")) return profile.lastName;
  if (label.includes("full") && label.includes("name")) {
    return `${profile.firstName} ${profile.lastName}`.trim();
  }
  if (label === "name") return profile.firstName;
  if (label.includes("email")) return profile.email;
  if (label.includes("phone")) return profile.phone;
  return undefined;
}

function initialValuesFromProfile(fields: Field[], profile: ProfilePrefill): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    const value = profileValueForField(field, profile);
    if (value) values[field.id] = value;
  }
  return values;
}

export function ApplicationRenderer({
  programId,
  programName,
  fields,
}: {
  programId: string;
  programName: string;
  fields: Field[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfilePrefill | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/applications/prefill")
      .then((r) => r.json())
      .then((d) => {
        const nextProfile = d.prefill as ProfilePrefill;
        setProfile(nextProfile);
        setValues((prev) => ({ ...initialValuesFromProfile(fields, nextProfile), ...prev }));
      });
  }, [fields]);

  async function submit() {
    setError(null);
    const payload = fields.map((f) => ({
      fieldId: f.id,
      value: values[f.id],
      fileUrl: f.type === "FILE" ? values[f.id] : undefined,
    }));
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId, values: payload }),
    });
    if (!res.ok) {
      setError(t("admissions.submitFailed"));
      return;
    }
    router.push("/dashboard");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{programName}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("admissions.applySubtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {profile && (
          <div className="grid gap-2 md:grid-cols-2 text-sm text-muted-foreground">
            <span>{profile.firstName} {profile.lastName}</span>
            <span>{profile.email}</span>
          </div>
        )}
        {fields.map((field) => (
          <div key={field.id}>
            <Label>{field.label}{field.required ? " *" : ""}</Label>
            {field.adminNote && (
              <p className="text-xs text-muted-foreground mb-1">{field.adminNote}</p>
            )}
            <Input
              value={values[field.id] ?? ""}
              onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
            />
          </div>
        ))}
        <Button onClick={submit}>{t("admissions.submit")}</Button>
      </CardContent>
    </Card>
  );
}
