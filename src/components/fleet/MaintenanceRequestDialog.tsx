import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import {
  Wrench, Plus, X, Gauge, AlertTriangle, ClipboardList,
  Car, Loader2, CheckCircle, ChevronRight, Sparkles
} from 'lucide-react';
import type { FleetVehicle } from '@/hooks/useFleetData';

interface MaintenanceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: FleetVehicle;
  onSubmit: (data: {
    vehicle_id: string;
    km_atual: number;
    descricao_problema: string;
    servicos_solicitados: string[];
    oficina_nome?: string;
  }) => Promise<boolean>;
  saving: boolean;
}

const SERVICOS_COMUNS = [
  'Revisão dos 10.000 km',
  'Revisão dos 20.000 km',
  'Revisão dos 30.000 km',
  'Revisão dos 40.000 km',
  'Revisão dos 50.000 km',
  'Revisão dos 100.000 km',
  'Troca de óleo e filtros',
  'Troca de pastilhas de freio',
  'Alinhamento e balanceamento',
  'Troca de pneus',
  'Troca de correia dentada',
  'Revisão do sistema elétrico',
  'Revisão do ar-condicionado',
  'Troca de amortecedores',
  'Revisão de suspensão',
  'Diagnóstico eletrônico',
  'Troca de bateria',
  'Revisão de motor',
  'Funilaria e pintura',
  'Troca de embreagem',
];

export function MaintenanceRequestDialog({
  open,
  onOpenChange,
  vehicle,
  onSubmit,
  saving,
}: MaintenanceRequestDialogProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [kmAtual, setKmAtual] = useState(String(vehicle.km_atual || ''));
  const [descricaoProblema, setDescricaoProblema] = useState('');
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [servicoCustom, setServicoCustom] = useState('');
  const [oficinaNome, setOficinaNome] = useState('');

  const toggleServico = (servico: string) => {
    setServicosSelecionados(prev =>
      prev.includes(servico)
        ? prev.filter(s => s !== servico)
        : [...prev, servico]
    );
  };

  const addCustomServico = () => {
    const trimmed = servicoCustom.trim();
    if (trimmed && !servicosSelecionados.includes(trimmed)) {
      setServicosSelecionados(prev => [...prev, trimmed]);
      setServicoCustom('');
    }
  };

  const handleSubmit = async () => {
    if (!kmAtual || parseInt(kmAtual) <= 0) {
      return;
    }
    if (!descricaoProblema.trim()) {
      return;
    }
    if (servicosSelecionados.length === 0) {
      return;
    }

    const success = await onSubmit({
      vehicle_id: vehicle.id,
      km_atual: parseInt(kmAtual),
      descricao_problema: descricaoProblema.trim(),
      servicos_solicitados: servicosSelecionados,
      oficina_nome: oficinaNome.trim() || undefined,
    });

    if (success) {
      setStep('success');
      setTimeout(() => {
        setStep('form');
        setKmAtual('');
        setDescricaoProblema('');
        setServicosSelecionados([]);
        setServicoCustom('');
        setOficinaNome('');
        onOpenChange(false);
      }, 2500);
    }
  };

  const handleClose = () => {
    if (step === 'success') return;
    onOpenChange(false);
  };

  const kmDiff = kmAtual ? parseInt(kmAtual) - (vehicle.km_atual || 0) : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {step === 'success' ? (
          <div className="p-10 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">Chamado de Manutenção Criado!</p>
              <p className="text-sm text-muted-foreground mt-2">
                O veículo <strong className="text-foreground">{vehicle.placa}</strong> foi enviado para manutenção com sucesso.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-border/50">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-amber-500" />
                  </div>
                  Enviar para Manutenção
                </DialogTitle>
              </DialogHeader>

              {/* Vehicle Info Card */}
              <Card className="mt-4 border border-border/50 bg-muted/20">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Car className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground">{vehicle.placa}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground truncate">{vehicle.modelo || vehicle.marca || '—'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {vehicle.ano && <span>{vehicle.ano}</span>}
                      {vehicle.cor && <><span>·</span><span>{vehicle.cor}</span></>}
                      <span>·</span>
                      <span className="font-mono">{(vehicle.km_atual || 0).toLocaleString('pt-BR')} km</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* 1. KM Update */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Gauge className="w-4 h-4 text-primary" />
                  Quilometragem Atual <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Atualize a quilometragem atual do veículo antes de enviar para manutenção
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    placeholder="Ex: 185.420"
                    value={kmAtual}
                    onChange={(e) => setKmAtual(e.target.value)}
                    className="font-mono text-base"
                  />
                  {kmDiff > 0 && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 whitespace-nowrap" variant="outline">
                      +{kmDiff.toLocaleString('pt-BR')} km
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* 2. Problem Description */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Descrição do Problema / Defeito <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Descreva o problema ou sintoma que o veículo está apresentando
                </p>
                <Textarea
                  placeholder="Ex: O veículo está apresentando barulho na suspensão dianteira lado esquerdo ao passar em lombadas. Também senti a direção mais pesada nos últimos dias..."
                  value={descricaoProblema}
                  onChange={(e) => setDescricaoProblema(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <Separator />

              {/* 3. Services */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  Serviços Desejados <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Selecione os serviços que deseja solicitar ou adicione um personalizado
                </p>

                {/* Selected Services */}
                {servicosSelecionados.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {servicosSelecionados.map((s) => (
                      <Badge
                        key={s}
                        className="bg-primary/10 text-primary border-primary/20 gap-1.5 pr-1.5 cursor-pointer hover:bg-primary/20 transition-colors"
                        variant="outline"
                        onClick={() => toggleServico(s)}
                      >
                        {s}
                        <X className="w-3 h-3" />
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Common Services Grid */}
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {SERVICOS_COMUNS.filter(s => !servicosSelecionados.includes(s)).map((servico) => (
                    <button
                      key={servico}
                      onClick={() => toggleServico(servico)}
                      className="text-left px-3 py-2 rounded-lg border border-border/40 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-xs text-muted-foreground hover:text-foreground flex items-center gap-2"
                    >
                      <Plus className="w-3 h-3 shrink-0 text-primary/60" />
                      <span className="truncate">{servico}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Service */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar serviço personalizado..."
                    value={servicoCustom}
                    onChange={(e) => setServicoCustom(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomServico()}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addCustomServico}
                    disabled={!servicoCustom.trim()}
                    className="shrink-0 gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </Button>
                </div>
              </div>

              <Separator />

              {/* 4. Optional: Target Workshop */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  Oficina Preferencial <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  placeholder="Ex: ThermoCar, EngeMec..."
                  value={oficinaNome}
                  onChange={(e) => setOficinaNome(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/50 bg-muted/10 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {servicosSelecionados.length} serviço{servicosSelecionados.length !== 1 ? 's' : ''} selecionado{servicosSelecionados.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} disabled={saving}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving || !kmAtual || !descricaoProblema.trim() || servicosSelecionados.length === 0}
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wrench className="w-4 h-4" />
                  )}
                  Enviar para Manutenção
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
