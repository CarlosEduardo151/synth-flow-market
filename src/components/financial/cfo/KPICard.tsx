import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string;
  hint?: string;
  delta?: number; // percentual
  icon: LucideIcon;
  tone?: "neutral" | "positive" | "negative" | "warning" | "info";
  className?: string;
}

const toneMap: Record<NonNullable<KPICardProps["tone"]>, { ring: string; text: string; bg: string }> = {
  neutral:  { ring: "ring-border/60",       text: "text-foreground",     bg: "bg-muted/40" },
  positive: { ring: "ring-emerald-500/30",  text: "text-emerald-400",    bg: "bg-emerald-500/10" },
  negative: { ring: "ring-red-500/30",      text: "text-red-400",        bg: "bg-red-500/10" },
  warning:  { ring: "ring-amber-500/30",    text: "text-amber-400",      bg: "bg-amber-500/10" },
  info:     { ring: "ring-primary/30",      text: "text-primary",        bg: "bg-primary/10" },
};

export function KPICard({ label, value, hint, delta, icon: Icon, tone = "neutral", className }: KPICardProps) {
  const t = toneMap[tone];
  const deltaPositive = (delta ?? 0) >= 0;
  return (
    <Card
      className={cn(
        "relative overflow-hidden p-4 ring-1 bg-card/60 backdrop-blur",
        "transition-all hover:bg-card/80 hover:-translate-y-0.5",
        t.ring,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums leading-tight truncate">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground truncate">{hint}</p>}
        </div>
        <div className={cn("p-2 rounded-lg shrink-0", t.bg)}>
          <Icon className={cn("h-4 w-4", t.text)} />
        </div>
      </div>
      {typeof delta === "number" && (
        <div className={cn("mt-2 inline-flex items-center gap-1 text-xs font-medium", deltaPositive ? "text-emerald-400" : "text-red-400")}>
          {deltaPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(delta).toFixed(1)}% vs mês ant.
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
    </Card>
  );
}
