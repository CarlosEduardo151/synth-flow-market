import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Tablet, Monitor } from "lucide-react";
import { useDevice } from "@/contexts/DeviceContext";

export const DeviceSelector = () => {
  const { showDeviceSelector, setDeviceType } = useDevice();

  const devices = [
    {
      type: 'mobile' as const,
      icon: Smartphone,
      title: 'Celular',
      description: 'Interface otimizada para smartphones'
    },
    {
      type: 'tablet' as const,
      icon: Tablet,
      title: 'Tablet',
      description: 'Interface otimizada para tablets'
    },
    {
      type: 'desktop' as const,
      icon: Monitor,
      title: 'Computador/Notebook',
      description: 'Interface completa para desktops'
    }
  ];

  return (
    <Dialog open={showDeviceSelector} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Qual dispositivo você está usando?</DialogTitle>
          <DialogDescription className="text-center">
            Isso nos ajuda a otimizar a interface para o seu dispositivo
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {devices.map((device) => {
            const Icon = device.icon;
            return (
              <Button
                key={device.type}
                onClick={() => setDeviceType(device.type)}
                variant="outline"
                className="h-auto flex-col gap-3 py-6 hover:bg-primary/10 hover:border-primary transition-all"
              >
                <Icon className="h-12 w-12 text-primary" />
                <div className="text-center">
                  <div className="font-semibold text-lg">{device.title}</div>
                  <div className="text-sm text-muted-foreground">{device.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
