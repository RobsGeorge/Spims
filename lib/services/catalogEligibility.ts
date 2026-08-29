import { evaluateEnrollmentRules } from "@/lib/services/enrollmentRules";

export type CatalogOfferingInput = {
  id: string;
  mode: string;
  course: {
    code: string;
    title: string;
    isFree: boolean;
    isStandalone: boolean;
  };
  semester: { name: string } | null;
};

export type AnnotatedCatalogOffering = CatalogOfferingInput & {
  waitlist: boolean;
  warnings: string[];
};

const HIDE_ERROR_PREFIXES = [
  "Missing prerequisite",
  "Program enrollment required",
  "Invalid student program",
  "Course not in selected program",
  "Already enrolled",
  "Outside registration window",
  "Financial hold",
  "Exceeds max credits",
  "Exceeds max courses",
  "Offering not found",
  "Cohort offering has no semester",
] as const;

function shouldHideOffering(errors: string[]): boolean {
  return errors.some((error) =>
    HIDE_ERROR_PREFIXES.some((prefix) => error.startsWith(prefix) || error.includes(prefix)),
  );
}

/**
 * Annotates catalog offerings for a student: hides hard-rule failures,
 * keeps waitlistable full offerings, and surfaces schedule-conflict warnings.
 */
export async function annotateCatalogEligibility(input: {
  studentId: string;
  offerings: CatalogOfferingInput[];
  studentProgramId?: string;
}): Promise<AnnotatedCatalogOffering[]> {
  const annotated: AnnotatedCatalogOffering[] = [];
  for (const offering of input.offerings) {
    const rules = await evaluateEnrollmentRules({
      studentId: input.studentId,
      offeringId: offering.id,
      studentProgramId: input.studentProgramId,
    });
    if (!rules.allowed && shouldHideOffering(rules.errors)) {
      continue;
    }
    annotated.push({
      ...offering,
      waitlist: rules.waitlist,
      warnings: rules.warnings,
    });
  }
  return annotated;
}
