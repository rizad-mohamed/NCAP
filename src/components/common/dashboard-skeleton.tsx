import { Skeleton } from "@/components/ui/skeleton";

export function MetricGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="metric-card panel p-5">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-9 rounded-lg" />
          </div>
          <Skeleton className="mt-3 h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton({ label, header = true }: { label: string; header?: boolean }) {
  return (
    <div
      className={header ? "container-ncap max-w-[1400px] py-2" : "min-w-0"}
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      {header && (
        <div aria-hidden="true" className="border-b pb-5">
          <Skeleton className="mb-3 h-3 w-36" />
          <Skeleton className="h-9 w-full max-w-md" />
          <Skeleton className="mt-3 h-5 w-full max-w-xl" />
        </div>
      )}
      <MetricGridSkeleton />
      <div aria-hidden="true" className="mt-5 grid gap-4 xl:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="panel p-5">
            <Skeleton className="h-5 w-40" />
            <div className="mt-6 flex h-48 items-end gap-3">
              {[45, 70, 55, 90, 75, 100, 65].map((height, index) => (
                <Skeleton
                  key={index}
                  className="min-w-0 flex-1 rounded-b-none"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <Skeleton className="mt-4 h-4 w-1/2" />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="mt-5 grid gap-4 xl:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="panel p-5">
            <Skeleton className="h-5 w-36" />
            {[0, 1, 2].map((j) => (
              <Skeleton key={j} className="mt-4 h-9 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
