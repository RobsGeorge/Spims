import { CatalogSkeleton } from "@/components/courses/course-catalog";

export default function CoursesLoading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-surface-mid" />
      <CatalogSkeleton />
    </div>
  );
}
