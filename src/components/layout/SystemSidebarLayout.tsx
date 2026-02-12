import * as React from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type SidebarItem = {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type SystemSidebarLayoutProps = {
  title?: string;
  items: SidebarItem[];
  activeValue: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
};

/**
 * Layout padrão para páginas /sistema com navegação lateral.
 * - Sidebar mini sempre visível
 * - Expande ao passar o mouse (desktop)
 * - No mobile, abre via SidebarTrigger (drawer)
 */
export function SystemSidebarLayout({
  title,
  items,
  activeValue,
  onChange,
  children,
  className,
}: SystemSidebarLayoutProps) {
  const [hovered, setHovered] = React.useState(false);
  const [pinnedOpen, setPinnedOpen] = React.useState(false);

  // Sem “fixar com setinha” por enquanto, mas deixamos preparado.
  const open = pinnedOpen || hovered;

  return (
    <SidebarProvider open={open} onOpenChange={setPinnedOpen}>
      <div className={cn("flex w-full min-h-[60vh]", className)}>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="hidden md:block"
        >
          <Sidebar collapsible="icon" className="border-r border-sidebar-border">
            <SidebarContent>
              <SidebarGroup>
                {title ? <SidebarGroupLabel>{title}</SidebarGroupLabel> : null}
                <SidebarMenu>
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.value}>
                        <SidebarMenuButton
                          type="button"
                          isActive={activeValue === item.value}
                          tooltip={item.label}
                          onClick={() => onChange(item.value)}
                        >
                          <Icon className="shrink-0" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        </div>

        {/* Mobile (drawer) */}
        <div className="md:hidden">
          <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border">
            <SidebarContent>
              <SidebarGroup>
                {title ? <SidebarGroupLabel>{title}</SidebarGroupLabel> : null}
                <SidebarMenu>
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.value}>
                        <SidebarMenuButton
                          type="button"
                          isActive={activeValue === item.value}
                          onClick={() => onChange(item.value)}
                        >
                          <Icon className="shrink-0" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        </div>

        <SidebarInset className="min-w-0">
          {/* Trigger visível no mobile */}
          <div className="md:hidden flex items-center gap-2 p-2 border-b border-border">
            <SidebarTrigger />
            {title ? <span className="text-sm font-medium">{title}</span> : null}
          </div>
          <div className="p-0">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
