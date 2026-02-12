import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RailItem = {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type Props = {
  title?: string;
  items: RailItem[];
  activeValue: string;
  onChange: (value: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
};

/**
 * Seletor vertical compacto (sem hover) para trocar "abas".
 * - Colapsa/expande via clique na setinha
 * - Altura "fit" (não ocupa a tela inteira)
 * - Centralizado verticalmente via container externo
 */
export function VerticalTabRail({
  title = "Navegação",
  items,
  activeValue,
  onChange,
  collapsed = true,
  onCollapsedChange,
  className,
}: Props) {
  const setCollapsed = React.useCallback(
    (next: boolean) => {
      onCollapsedChange?.(next);
    },
    [onCollapsedChange]
  );

  return (
    <div
      className={cn(
        // Keep everything fully inside the rail bounds (no negative offsets)
        // so it never gets clipped by parent containers with overflow-hidden.
        "relative overflow-visible rounded-2xl border border-sidebar-border/60 bg-sidebar/70 backdrop-blur supports-[backdrop-filter]:bg-sidebar/50 shadow-card",
        collapsed ? "w-14" : "w-56",
        "transition-[width] duration-200",
        className
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute right-1 top-1/2 -translate-y-1/2 z-20 h-7 w-7 rounded-full"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Abrir navegação" : "Fechar navegação"}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      <div className={cn("p-2", collapsed ? "" : "p-3")}>
        <div className={cn("text-xs font-medium text-sidebar-foreground/70", collapsed ? "sr-only" : "mb-2 px-1")}
        >
          {title}
        </div>

        <div className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeValue === item.value;
            return (
              <button
                key={item.value}
                type="button"
                title={item.label}
                onClick={() => onChange(item.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm transition-colors",
                  "hover:bg-sidebar-accent/40",
                  isActive ? "bg-sidebar-accent/50 text-sidebar-accent-foreground" : "text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn("truncate", collapsed ? "sr-only" : "")}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
