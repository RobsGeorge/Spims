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
  options: string[];
  allowedFileTypes: string[];
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
    if (field.type === "FILE") continue;
    const value = profileValueForField(field, profile);
    if (value) values[field.id] = value;
  }
  return values;
}

function extensionAllowed(filename: string, allowed: string[]): boolean {
  if (allowed.length === 0) return true;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return allowed.some((a) => a.replace(/^\./, "").toLowerCase() === ext);
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
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);
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

  async function uploadFile(field: Field, file: File) {
    if (!extensionAllowed(file.name, field.allowedFileTypes)) {
      setError(t("admissions.invalidFileType"));
      return;
    }

    setUploadingFieldId(field.id);
    setError(null);

    try {
      const res = await fetch("/api/applications/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          fieldId: field.id,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.configured) {
        setError(t("admissions.storageUnavailable"));
        return;
      }

      const putRes = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) {
        setError(t("admissions.uploadFailed"));
        return;
      }

      setFileUrls((prev) => ({ ...prev, [field.id]: data.fileUrl as string }));
      setFileNames((prev) => ({ ...prev, [field.id]: file.name }));
    } catch {
      setError(t("admissions.uploadFailed"));
    } finally {
      setUploadingFieldId(null);
    }
  }

  async function submit() {
    setError(null);
    const payload = fields.map((f) => ({
      fieldId: f.id,
      value: f.type === "FILE" ? fileNames[f.id] ?? null : values[f.id] ?? null,
      fileUrl: f.type === "FILE" ? fileUrls[f.id] ?? null : undefined,
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

  function renderField(field: Field) {
    const commonProps = {
      id: field.id,
      required: field.required,
    };

    switch (field.type) {
      case "TEXTAREA":
        return (
          <textarea
            {...commonProps}
            className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={values[field.id] ?? ""}
            onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
          />
        );
      case "NUMBER":
        return (
          <Input
            {...commonProps}
            type="number"
            value={values[field.id] ?? ""}
            onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
          />
        );
      case "DATE":
        return (
          <Input
            {...commonProps}
            type="date"
            value={values[field.id] ?? ""}
            onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
          />
        );
      case "SELECT":
        return (
          <select
            {...commonProps}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={values[field.id] ?? ""}
            onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
          >
            <option value="">—</option>
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case "MULTISELECT": {
        const selected = values[field.id]?.split(",").filter(Boolean) ?? [];
        return (
          <div className="space-y-2 rounded-md border border-input p-3">
            {field.options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selected, opt]
                      : selected.filter((v) => v !== opt);
                    setValues({ ...values, [field.id]: next.join(",") });
                  }}
                />
                {opt}
              </label>
            ))}
          </div>
        );
      }
      case "CHECKBOX":
        return (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values[field.id] === "true"}
              onChange={(e) =>
                setValues({ ...values, [field.id]: e.target.checked ? "true" : "false" })
              }
            />
            {field.label}
          </label>
        );
      case "FILE":
        return (
          <div className="space-y-2">
            <Input
              {...commonProps}
              type="file"
              accept={
                field.allowedFileTypes.length > 0
                  ? field.allowedFileTypes.map((t) => `.${t.replace(/^\./, "")}`).join(",")
                  : undefined
              }
              disabled={uploadingFieldId === field.id}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(field, file);
              }}
            />
            {uploadingFieldId === field.id && (
              <p className="text-xs text-muted-foreground">{t("admissions.uploading")}</p>
            )}
            {fileNames[field.id] && (
              <p className="text-xs text-muted-foreground">
                {t("admissions.fileUploaded")}: {fileNames[field.id]}
              </p>
            )}
          </div>
        );
      default:
        return (
          <Input
            {...commonProps}
            value={values[field.id] ?? ""}
            onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
          />
        );
    }
  }

  const isUploading = uploadingFieldId !== null;

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
            <span>
              {profile.firstName} {profile.lastName}
            </span>
            <span>{profile.email}</span>
          </div>
        )}
        {fields.map((field) => (
          <div key={field.id}>
            {field.type !== "CHECKBOX" && (
              <Label htmlFor={field.id}>
                {field.label}
                {field.required ? " *" : ""}
              </Label>
            )}
            {field.adminNote && field.type !== "CHECKBOX" && (
              <p className="text-xs text-muted-foreground mb-1">{field.adminNote}</p>
            )}
            {renderField(field)}
          </div>
        ))}
        <Button onClick={submit} disabled={isUploading}>
          {t("admissions.submit")}
        </Button>
      </CardContent>
    </Card>
  );
}
