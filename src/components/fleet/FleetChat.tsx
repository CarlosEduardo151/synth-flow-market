import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Users, Wrench, Plus, Search, MoreHorizontal, ArrowUpRight,
  MessageCircle, Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX,
  Paperclip, Clock, CheckCircle2, PhoneCall, PhoneIncoming, PhoneMissed
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FleetMessage {
  id: string;
  sender_role: 'frota' | 'oficina';
  sender_name: string;
  recipient_name: string;
  message_text: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
  workshop_id: string | null;
}

interface FleetCall {
  id: string;
  caller_role: string;
  caller_name: string;
  recipient_name: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  workshop_id: string | null;
}

interface Workshop {
  id: string;
  nome_fantasia: string | null;
  razao_social: string | null;
  cnpj: string;
  status: string;
}

interface FleetChatProps {
  customerProductId: string;
  currentRole: 'frota' | 'oficina';
  currentName: string;
  /** For oficina: their own workshop ID. For frota: optional pre-selected workshop */
  workshopId?: string | null;
}

export function FleetChat({ customerProductId, currentRole, currentName, workshopId }: FleetChatProps) {
  const [messages, setMessages] = useState<FleetMessage[]>([]);
  const [calls, setCalls] = useState<FleetCall[]>([]);
  const [input, setInput] = useState('');
  const [searchOficina, setSearchOficina] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Workshops list (for frota role)
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(workshopId || null);

  // Call state
  const [activeCall, setActiveCall] = useState<FleetCall | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // For oficina, workshopId is fixed; for frota, user selects
  const activeWorkshopId = currentRole === 'oficina' ? workshopId : selectedWorkshopId;

  // Fetch approved workshops (frota only)
  useEffect(() => {
    if (currentRole !== 'frota') return;
    const fetchWorkshops = async () => {
      const { data } = await (supabase
        .from('fleet_partner_workshops' as any)
        .select('id, nome_fantasia, razao_social, cnpj, status')
        .eq('status', 'aprovado')
        .order('nome_fantasia', { ascending: true }) as any);
      setWorkshops(data || []);
    };
    fetchWorkshops();
  }, [currentRole]);

  // Fetch messages scoped by workshop
  const fetchMessages = useCallback(async () => {
    if (!activeWorkshopId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await (supabase
        .from('fleet_messages' as any)
        .select('*')
        .eq('customer_product_id', customerProductId)
        .eq('workshop_id', activeWorkshopId)
        .order('created_at', { ascending: true }) as any);

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [customerProductId, activeWorkshopId]);

  // Fetch calls scoped by workshop
  const fetchCalls = useCallback(async () => {
    if (!activeWorkshopId) {
      setCalls([]);
      return;
    }
    try {
      const { data, error } = await (supabase
        .from('fleet_calls' as any)
        .select('*')
        .eq('customer_product_id', customerProductId)
        .eq('workshop_id', activeWorkshopId)
        .order('created_at', { ascending: false })
        .limit(20) as any);

      if (error) throw error;
      setCalls(data || []);
    } catch (err) {
      console.error('Error fetching calls:', err);
    }
  }, [customerProductId, activeWorkshopId]);

  useEffect(() => {
    setLoading(true);
    fetchMessages();
    fetchCalls();
  }, [fetchMessages, fetchCalls]);

  // Realtime subscription scoped to workshop
  useEffect(() => {
    if (!activeWorkshopId) return;
    const channel = supabase
      .channel(`fleet_msgs_${activeWorkshopId}` as any)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fleet_messages',
          filter: `workshop_id=eq.${activeWorkshopId}`,
        },
        (payload: any) => {
          const newMsg = payload.new as FleetMessage;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeWorkshopId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!input.trim() || sending || !activeWorkshopId) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const recipientName = currentRole === 'frota'
      ? getWorkshopDisplayName(activeWorkshopId)
      : 'Gestor de Frota';

    try {
      const { error } = await (supabase
        .from('fleet_messages' as any)
        .insert({
          customer_product_id: customerProductId,
          sender_role: currentRole,
          sender_name: currentName,
          recipient_name: recipientName,
          message_text: text,
          message_type: 'text',
          workshop_id: activeWorkshopId,
        } as any) as any);

      if (error) throw error;
    } catch (err) {
      console.error('Error sending message:', err);
      toast({ title: 'Erro ao enviar', description: 'Tente novamente.', variant: 'destructive' });
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const getWorkshopDisplayName = (wsId: string) => {
    const ws = workshops.find(w => w.id === wsId);
    return ws?.nome_fantasia || ws?.razao_social || 'Oficina';
  };

  // Browser call
  const startCall = async (recipientName: string) => {
    if (!activeWorkshopId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const { data, error } = await (supabase
        .from('fleet_calls' as any)
        .insert({
          customer_product_id: customerProductId,
          caller_role: currentRole,
          caller_name: currentName,
          recipient_name: recipientName,
          status: 'active',
          started_at: new Date().toISOString(),
          workshop_id: activeWorkshopId,
        } as any)
        .select()
        .single() as any);

      if (error) throw error;

      setActiveCall(data);
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      await (supabase
        .from('fleet_messages' as any)
        .insert({
          customer_product_id: customerProductId,
          sender_role: currentRole,
          sender_name: currentName,
          recipient_name: recipientName,
          message_text: `📞 Chamada de voz iniciada`,
          message_type: 'call_started',
          workshop_id: activeWorkshopId,
        } as any) as any);

      toast({ title: 'Chamada iniciada', description: `Ligando para ${recipientName}...` });
    } catch (err: any) {
      console.error('Error starting call:', err);
      toast({
        title: 'Erro na chamada',
        description: err?.message?.includes('Permission')
          ? 'Permita o acesso ao microfone nas configurações do navegador.'
          : 'Não foi possível iniciar a chamada.',
        variant: 'destructive',
      });
    }
  };

  const endCall = async () => {
    if (!activeCall) return;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    try {
      await (supabase
        .from('fleet_calls' as any)
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration_seconds: callDuration,
        } as any)
        .eq('id', activeCall.id) as any);

      const mins = Math.floor(callDuration / 60);
      const secs = callDuration % 60;

      await (supabase
        .from('fleet_messages' as any)
        .insert({
          customer_product_id: customerProductId,
          sender_role: currentRole,
          sender_name: currentName,
          recipient_name: activeCall.recipient_name,
          message_text: `📞 Chamada encerrada — ${mins}:${secs.toString().padStart(2, '0')}`,
          message_type: 'call_ended',
          workshop_id: activeWorkshopId,
        } as any) as any);
    } catch (err) {
      console.error('Error ending call:', err);
    }

    setActiveCall(null);
    setCallDuration(0);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsMuted(!isMuted);
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Get unread count per workshop (for frota sidebar)
  const getUnreadCountForWorkshop = (wsId: string) => {
    // We'd need all messages loaded — for now just show if selected
    return 0;
  };

  // ─── Contact name for chat header ───
  const chatPartnerName = currentRole === 'frota'
    ? (activeWorkshopId ? getWorkshopDisplayName(activeWorkshopId) : 'Selecione uma oficina')
    : 'Gestor de Frota';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Canal de Comunicação</h2>
          <p className="text-sm text-muted-foreground">
            {currentRole === 'frota'
              ? 'Selecione uma oficina para iniciar a conversa'
              : 'Canal exclusivo com o gestor de frota'}
          </p>
        </div>
      </div>

      {/* Active Call Banner */}
      {activeCall && (
        <Card className="border-2 border-emerald-500/50 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center animate-pulse">
                <PhoneCall className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Em chamada com {activeCall.recipient_name}</p>
                <p className="text-xs text-muted-foreground font-mono">{formatDuration(callDuration)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={toggleMute}>
                {isMuted ? <MicOff className="w-4 h-4 text-destructive" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setIsSpeakerOn(!isSpeakerOn)}>
                {isSpeakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button variant="destructive" size="sm" className="gap-1.5 rounded-full" onClick={endCall}>
                <PhoneOff className="w-4 h-4" /> Encerrar
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-[280px_1fr] gap-4 h-[600px]">
        {/* Sidebar — Workshop Contacts (frota) / Single channel info (oficina) */}
        <Card className="border border-border/50 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border/30">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {currentRole === 'frota' ? 'Oficinas Parceiras' : 'Canal'}
            </h3>
            {currentRole === 'frota' && (
              <Input
                value={searchOficina}
                onChange={e => setSearchOficina(e.target.value)}
                placeholder="Buscar oficina..."
                className="h-8 text-xs"
              />
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {currentRole === 'frota' ? (
              <>
                {workshops
                  .filter(ws => {
                    if (!searchOficina) return true;
                    const name = (ws.nome_fantasia || ws.razao_social || '').toLowerCase();
                    return name.includes(searchOficina.toLowerCase());
                  })
                  .map(ws => {
                    const displayName = ws.nome_fantasia || ws.razao_social || ws.cnpj;
                    const isSelected = selectedWorkshopId === ws.id;
                    return (
                      <button
                        key={ws.id}
                        onClick={() => setSelectedWorkshopId(ws.id)}
                        className={cn(
                          'w-full text-left px-3 py-3 border-b border-border/20 hover:bg-muted/30 transition-colors flex items-center gap-3',
                          isSelected && 'bg-primary/5 border-l-2 border-l-primary'
                        )}
                      >
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Wrench className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-600">Aprovada</Badge>
                          </p>
                        </div>
                      </button>
                    );
                  })}
                {workshops.length === 0 && (
                  <div className="p-6 text-center">
                    <Wrench className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhuma oficina aprovada</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">Oficinas aparecerão aqui após aprovação</p>
                  </div>
                )}
              </>
            ) : (
              /* Oficina side: single channel */
              <div className="px-3 py-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Gestor de Frota</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] text-muted-foreground">Canal exclusivo</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-3">
                  Este é o seu canal direto e exclusivo com o gestor de frota.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Main Chat Area */}
        <Card className="border border-border/50 shadow-sm overflow-hidden flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-border/30 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                {currentRole === 'frota' ? <Wrench className="w-5 h-5 text-emerald-500" /> : <Users className="w-5 h-5 text-primary" />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{chatPartnerName}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">Canal exclusivo via Supabase</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeWorkshopId && !activeCall && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:text-emerald-500"
                  onClick={() => startCall(chatPartnerName)}
                  title="Iniciar chamada de voz"
                >
                  <Phone className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8"><Search className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!activeWorkshopId ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">Selecione uma oficina</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Escolha uma oficina parceira ao lado para abrir o canal de comunicação</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground animate-pulse">Carregando mensagens...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Envie uma mensagem para iniciar a conversa</p>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.sender_role === currentRole;
                const isSystem = msg.message_type === 'call_started' || msg.message_type === 'call_ended';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="bg-muted/50 border border-border/30 rounded-full px-4 py-1.5 flex items-center gap-2">
                        <PhoneCall className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">{msg.message_text}</span>
                        <span className="text-[10px] text-muted-foreground/60">{formatTime(msg.created_at)}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2.5',
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted/50 border border-border/50 text-foreground rounded-bl-md'
                    )}>
                      <p className={cn('text-[10px] font-semibold mb-0.5', isMe ? 'text-primary-foreground/70' : 'text-emerald-500')}>
                        {isMe ? 'Você' : msg.sender_name}
                      </p>
                      <p className="text-sm leading-relaxed">{msg.message_text}</p>
                      <p className={cn('text-[10px] mt-1 text-right', isMe ? 'text-primary-foreground/50' : 'text-muted-foreground')}>
                        {formatTime(msg.created_at)} {isMe && '✓✓'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border/30 bg-muted/10">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"><Plus className="w-4 h-4" /></Button>
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={activeWorkshopId ? `Mensagem para ${chatPartnerName}...` : 'Selecione uma oficina...'}
                className="h-9 text-sm flex-1"
                disabled={sending || !activeWorkshopId}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending || !activeWorkshopId}
                size="sm"
                className="h-9 px-4 gap-1.5"
              >
                <ArrowUpRight className="w-4 h-4" />
                Enviar
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Calls */}
      {calls.length > 0 && (
        <Card className="border border-border/50 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Histórico de Chamadas</h3>
          <div className="space-y-2">
            {calls.slice(0, 5).map(call => (
              <div key={call.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                <div className="flex items-center gap-3">
                  {call.status === 'ended' ? (
                    <PhoneCall className="w-4 h-4 text-emerald-500" />
                  ) : call.status === 'missed' ? (
                    <PhoneMissed className="w-4 h-4 text-destructive" />
                  ) : (
                    <PhoneIncoming className="w-4 h-4 text-primary" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {call.caller_role === currentRole ? call.recipient_name : call.caller_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {call.caller_role === currentRole ? 'Chamada enviada' : 'Chamada recebida'}
                      {call.duration_seconds != null && ` — ${formatDuration(call.duration_seconds)}`}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{formatTime(call.created_at)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
