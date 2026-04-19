import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Sparkles, Clock, Loader2, Save, UserPlus } from 'lucide-react';

interface Props {
  customerProductId: string;
}

interface Settings {
  id?: string;
  is_enabled: boolean;
  business_hours_start: string;
  business_hours_end: string;
  active_weekdays: number[];
  timezone: string;
  ai_enrichment_enabled: boolean;
  ignore_outside_hours: boolean;
  default_status: string;
  default_source: string;
}

const DEFAULT: Settings = {
  is_enabled: true,
  business_hours_start: '09:00',
  business_hours_end: '18:00',
  active_weekdays: [1, 2, 3, 4, 5],
  timezone: 'America/Sao_Paulo',
  ai_enrichment_enabled: true,
  ignore_outside_hours: true,
  default_status: 'lead',
  default_source: 'whatsapp',
};

const WEEKDAYS = [
  { v: 0, label: 'Dom' },
  { v: 1, label: 'Seg' },
  { v: 2, label: 'Ter' },
  { v: 3, label: 'Qua' },
  { v: 4, label: 'Qui' },
  { v: 5, label: 'Sex' },
  { v: 6, label: 'Sáb' },
];

const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Belem',
  'America/Recife',
  'America/Fortaleza',
  'America/Cuiaba',
  'America/Rio_Branco',
];

export function CRMLeadCapturePanel({ customerProductId }: Props) {
  const [s, setS] = useState<Settings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [capturedToday, setCapturedToday] = useState(0);

  useEffect(() => {
    if (!customerProductId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('crm_capture_settings')
        .select('*')
        .eq('customer_product_id', customerProductId)
        .maybeSingle();
      if (data) {
        setS({
          id: data.id,
          is_enabled: data.is_enabled,
          business_hours_start: (data.business_hours_start as string).slice(0, 5),
          business_hours_end: (data.business_hours_end as string).slice(0, 5),
          active_weekdays: data.active_weekdays || DEFAULT.active_weekdays,
          timezone: data.timezone,
          ai_enrichment_enabled: data.ai_enrichment_enabled,
          ignore_outside_hours: data.ignore_outside_hours,
          default_status: data.default_status,
          default_source: data.default_source,
        });
      }
      // contador hoje
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('crm_customers')
        .select('*', { count: 'exact', head: true })
        .eq('customer_product_id', customerProductId)
        .eq('source', 'whatsapp')
        .gte('created_at', todayStart.toISOString());
      setCapturedToday(count || 0);
      setLoading(false);
    })();
  }, [customerProductId]);

  const toggleDay = (day: number) => {
    setS((prev) => ({
      ...prev,
      active_weekdays: prev.active_weekdays.includes(day)
        ? prev.active_weekdays.filter((d) => d !== day)
        : [...prev.active_weekdays, day].sort(),
    }));
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      customer_product_id: customerProductId,
      is_enabled: s.is_enabled,
      business_hours_start: s.business_hours_start,
      business_hours_end: s.business_hours_end,
      active_weekdays: s.active_weekdays,
      timezone: s.timezone,
      ai_enrichment_enabled: s.ai_enrichment_enabled,
      ignore_outside_hours: s.ignore_outside_hours,
      default_status: s.default_status,
      default_source: s.default_source,
    };
    const { error } = await supabase
      .from('crm_capture_settings')
      .upsert(payload, { onConflict: 'customer_product_id' });
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success('Configurações salvas! Captura automática atualizada.');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Captura Automática de Leads
            </CardTitle>
            <CardDescription>
              Toda nova conversa do WhatsApp vira lead no CRM dentro do horário configurado.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {capturedToday} hoje
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle principal */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-base font-semibold">Ativar captura</Label>
            <p className="text-sm text-muted-foreground">
              Cria leads automaticamente em <strong>Clientes</strong> a partir das mensagens recebidas.
            </p>
          </div>
          <Switch
            checked={s.is_enabled}
            onCheckedChange={(v) => setS((p) => ({ ...p, is_enabled: v }))}
          />
        </div>

        {/* Horário */}
        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" /> Horário de funcionamento
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Início</Label>
              <Input
                type="time"
                value={s.business_hours_start}
                onChange={(e) => setS((p) => ({ ...p, business_hours_start: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fim</Label>
              <Input
                type="time"
                value={s.business_hours_end}
                onChange={(e) => setS((p) => ({ ...p, business_hours_end: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Dias ativos</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const active = s.active_weekdays.includes(d.v);
                return (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => toggleDay(d.v)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Fuso horário</Label>
            <Select value={s.timezone} onValueChange={(v) => setS((p) => ({ ...p, timezone: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm">Ignorar mensagens fora do horário</Label>
              <p className="text-xs text-muted-foreground">
                Quando desligado, leads fora do expediente também são capturados.
              </p>
            </div>
            <Switch
              checked={s.ignore_outside_hours}
              onCheckedChange={(v) => setS((p) => ({ ...p, ignore_outside_hours: v }))}
            />
          </div>
        </div>

        {/* IA */}
        <div className="flex items-center justify-between rounded-lg border p-4 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <div>
              <Label className="text-base font-semibold">Enriquecimento por IA</Label>
              <p className="text-sm text-muted-foreground">
                Extrai automaticamente <strong>nome</strong>, <strong>empresa</strong>,{' '}
                <strong>segmento</strong> e <strong>interesse</strong> da primeira mensagem.
              </p>
            </div>
          </div>
          <Switch
            checked={s.ai_enrichment_enabled}
            onCheckedChange={(v) => setS((p) => ({ ...p, ai_enrichment_enabled: v }))}
          />
        </div>

        {/* Status / origem padrão */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Status inicial</Label>
            <Select
              value={s.default_status}
              onValueChange={(v) => setS((p) => ({ ...p, default_status: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="qualificado">Qualificado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Origem</Label>
            <Input
              value={s.default_source}
              onChange={(e) => setS((p) => ({ ...p, default_source: e.target.value }))}
            />
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full" size="lg">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Salvar configurações
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
