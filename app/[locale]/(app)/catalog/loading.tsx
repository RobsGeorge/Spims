import { CatalogSkeleton } from "@/components/courses/course-catalog";

export default function CatalogLoading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-surface-mid" />
      <CatalogSkeleton />
    </div>
  );
}
