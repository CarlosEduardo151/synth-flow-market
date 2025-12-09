import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, isToday, isTomorrow, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Video,
  MapPin,
  Phone,
  Clock,
  Calendar,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface SalesMeetingsProps {
  customerProductId: string;
}

interface Lead {
  id: string;
  name: string;
  company: string | null;
}

interface Meeting {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  meeting_type: string;
  location: string | null;
  meeting_link: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  lead?: Lead;
}

const TYPE_OPTIONS = [
  { value: 'online', label: 'Online', icon: Video },
  { value: 'presencial', label: 'Presencial', icon: MapPin },
  { value: 'call', label: 'Ligação', icon: Phone },
];

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Agendada', color: 'bg-blue-500' },
  { value: 'confirmed', label: 'Confirmada', color: 'bg-green-500' },
  { value: 'completed', label: 'Concluída', color: 'bg-emerald-500' },
  { value: 'cancelled', label: 'Cancelada', color: 'bg-red-500' },
  { value: 'no_show', label: 'No Show', color: 'bg-orange-500' },
];

export function SalesMeetings({ customerProductId }: SalesMeetingsProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [formData, setFormData] = useState({
    lead_id: '',
    title: '',
    description: '',
    meeting_type: 'online',
    location: '',
    meeting_link: '',
    scheduled_at: '',
    duration_minutes: 30
  });

  useEffect(() => {
    loadData();
  }, [customerProductId]);

  const loadData = async () => {
    setIsLoading(true);

    const [leadsRes, meetingsRes] = await Promise.all([
      supabase
        .from('sales_leads')
        .select('id, name, company')
        .eq('customer_product_id', customerProductId),
      supabase
        .from('sales_meetings')
        .select(`
          *,
          sales_leads!inner(id, name, company, customer_product_id)
        `)
        .eq('sales_leads.customer_product_id', customerProductId)
        .order('scheduled_at', { ascending: true })
    ]);

    if (leadsRes.data) setLeads(leadsRes.data);
    if (meetingsRes.data) {
      const mappedMeetings = meetingsRes.data.map(m => ({
        ...m,
        lead: m.sales_leads
      }));
      setMeetings(mappedMeetings);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!formData.lead_id || !formData.title || !formData.scheduled_at) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('sales_meetings').insert({
      lead_id: formData.lead_id,
      title: formData.title,
      description: formData.description || null,
      meeting_type: formData.meeting_type,
      location: formData.location || null,
      meeting_link: formData.meeting_link || null,
      scheduled_at: formData.scheduled_at,
      duration_minutes: formData.duration_minutes
    });

    if (error) {
      toast({ title: 'Erro ao agendar reunião', variant: 'destructive' });
    } else {
      toast({ title: 'Reunião agendada com sucesso!' });
      setIsDialogOpen(false);
      setFormData({
        lead_id: '',
        title: '',
        description: '',
        meeting_type: 'online',
        location: '',
        meeting_link: '',
        scheduled_at: '',
        duration_minutes: 30
      });
      loadData();
    }
  };

  const updateMeetingStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('sales_meetings')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao atualizar reunião', variant: 'destructive' });
    } else {
      toast({ title: 'Status atualizado!' });
      loadData();
    }
  };

  const getTypeIcon = (type: string) => {
    const option = TYPE_OPTIONS.find(t => t.value === type);
    if (!option) return Video;
    return option.icon;
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge className={`${option?.color} text-white`}>
        {option?.label}
      </Badge>
    );
  };

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  // Get meetings for selected date
  const selectedDateMeetings = meetings.filter(m => {
    const meetingDate = parseISO(m.scheduled_at);
    return format(meetingDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
  });

  // Stats
  const upcomingMeetings = meetings.filter(m => 
    m.status === 'scheduled' || m.status === 'confirmed'
  ).length;
  const completedMeetings = meetings.filter(m => m.status === 'completed').length;
  const todayMeetings = meetings.filter(m => 
    isToday(parseISO(m.scheduled_at)) && 
    (m.status === 'scheduled' || m.status === 'confirmed')
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reuniões</h2>
          <p className="text-muted-foreground">
            Agende e gerencie suas reuniões com leads
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Reunião
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{upcomingMeetings}</p>
                <p className="text-sm text-muted-foreground">Reuniões Agendadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{todayMeetings}</p>
                <p className="text-sm text-muted-foreground">Reuniões Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{completedMeetings}</p>
                <p className="text-sm text-muted-foreground">Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {weekDays.map((day, index) => {
              const dayMeetings = meetings.filter(m => 
                format(parseISO(m.scheduled_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
              ).length;
              const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
              
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    flex flex-col items-center min-w-[80px] p-3 rounded-xl transition-all
                    ${isSelected 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted/50 hover:bg-muted'
                    }
                  `}
                >
                  <span className="text-xs uppercase">
                    {format(day, 'EEE', { locale: ptBR })}
                  </span>
                  <span className="text-2xl font-bold">{format(day, 'd')}</span>
                  {dayMeetings > 0 && (
                    <Badge variant={isSelected ? "secondary" : "default"} className="mt-1">
                      {dayMeetings}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Meetings List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isToday(selectedDate) ? 'Hoje' : isTomorrow(selectedDate) ? 'Amanhã' : format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </CardTitle>
          <CardDescription>
            {selectedDateMeetings.length} reunião(ões)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedDateMeetings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma reunião para este dia
            </div>
          ) : (
            <div className="space-y-4">
              {selectedDateMeetings.map((meeting) => {
                const TypeIcon = getTypeIcon(meeting.meeting_type);
                
                return (
                  <div
                    key={meeting.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-all"
                  >
                    <div className="p-3 rounded-xl bg-primary/10">
                      <TypeIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{meeting.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {meeting.lead?.name} {meeting.lead?.company && `• ${meeting.lead.company}`}
                          </p>
                        </div>
                        {getStatusBadge(meeting.status)}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(parseISO(meeting.scheduled_at), 'HH:mm')} - {meeting.duration_minutes}min
                        </span>
                        {meeting.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {meeting.location}
                          </span>
                        )}
                      </div>

                      {meeting.meeting_link && (
                        <a
                          href={meeting.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Entrar na reunião
                        </a>
                      )}

                      {meeting.description && (
                        <p className="text-sm mt-2">{meeting.description}</p>
                      )}

                      {(meeting.status === 'scheduled' || meeting.status === 'confirmed') && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMeetingStatus(meeting.id, 'completed')}
                            className="gap-1"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Concluída
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMeetingStatus(meeting.id, 'no_show')}
                            className="gap-1"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            No Show
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMeetingStatus(meeting.id, 'cancelled')}
                            className="gap-1 text-destructive"
                          >
                            <XCircle className="h-4 w-4" />
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Reunião</DialogTitle>
            <DialogDescription>Agende uma nova reunião com um lead</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Lead *</Label>
              <Select value={formData.lead_id} onValueChange={(v) => setFormData({ ...formData, lead_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map(lead => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name} {lead.company && `(${lead.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Demonstração do produto"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.meeting_type} onValueChange={(v) => setFormData({ ...formData, meeting_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Select 
                  value={formData.duration_minutes.toString()} 
                  onValueChange={(v) => setFormData({ ...formData, duration_minutes: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h30</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data e Hora *</Label>
              <Input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
              />
            </div>

            {formData.meeting_type === 'online' && (
              <div className="space-y-2">
                <Label>Link da Reunião</Label>
                <Input
                  value={formData.meeting_link}
                  onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            )}

            {formData.meeting_type === 'presencial' && (
              <div className="space-y-2">
                <Label>Local</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Endereço da reunião"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes da reunião..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Agendar Reunião
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
