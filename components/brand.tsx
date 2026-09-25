import { cn } from "@/lib/utils";

/** The Warp mark — forward motion in three deliberate, evidence-led steps. */
export function WarpMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 31 48" className={cn("h-6 w-4", className)} fill="none" aria-hidden>
      <g fill="#4f46e5">
        <path d="m0 17.8433 30.9054-17.8433-.8189 12.6994-26.32053 15.1961z" />
        <path d="m3.76562 27.8951 21.73568-12.5492-.8189 12.6994-17.15081 9.902z" opacity=".5" />
        <path d="m7.5293 37.9477 12.566-7.255-.8189 12.6994-7.9811 4.6079z" opacity=".25" />
      </g>
    </svg>
  );
}

export function WarpWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <WarpMark className="h-7 w-[18px]" />
      <span className="font-semibold tracking-tight">Warp</span>
    </span>
  );
}
