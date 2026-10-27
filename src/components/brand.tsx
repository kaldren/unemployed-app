import { Sparkles } from "lucide-react";
import { SITE_NAME } from "@/lib/site";

// The logo: a spark-gradient mark and the name. `nameClassName` can hide the name visually on narrow screens.
export function Brand({ nameClassName }: { nameClassName?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-base font-semibold tracking-tight">
      <span aria-hidden className="flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-spark-1 to-spark-2 text-primary-foreground">
        <Sparkles className="size-4" />
      </span>
      <span className={nameClassName}>{SITE_NAME}</span>
    </span>
  );
}

// Words in a headline that carry the brand gradient.
export function SparkText({ children }: { children: React.ReactNode }) {
  return <span className="bg-linear-to-r from-spark-1 to-spark-2 bg-clip-text text-transparent forced-colors:bg-none forced-colors:text-[CanvasText]">{children}</span>;
}
