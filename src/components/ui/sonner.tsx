import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast ios-toast group-[.toaster]:bg-card/95 group-[.toaster]:text-foreground group-[.toaster]:border-border/20 group-[.toaster]:backdrop-blur-xl group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl",
          description: "group-[.toast]:text-muted-foreground/90",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-xl group-[.toast]:font-medium",
          cancelButton:
            "group-[.toast]:bg-muted/50 group-[.toast]:text-muted-foreground group-[.toast]:rounded-xl",
          success: "group-[.toast]:bg-success/10 group-[.toast]:border-success/20",
          error: "group-[.toast]:bg-destructive/10 group-[.toast]:border-destructive/20",
          warning: "group-[.toast]:bg-warning/10 group-[.toast]:border-warning/20",
          info: "group-[.toast]:bg-primary/10 group-[.toast]:border-primary/20",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
