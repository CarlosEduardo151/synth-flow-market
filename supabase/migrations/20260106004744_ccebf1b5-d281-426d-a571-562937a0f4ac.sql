-- Tabela de vagas configuráveis pelo cliente
CREATE TABLE public.rh_vagas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  requisitos TEXT,
  salario_min DECIMAL(10,2),
  salario_max DECIMAL(10,2),
  tipo_contrato TEXT DEFAULT 'CLT',
  local_trabalho TEXT,
  remoto BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'ativa',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de candidatos recebidos pelo n8n
CREATE TABLE public.rh_candidatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vaga_id UUID REFERENCES public.rh_vagas(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  idade INTEGER,
  telefone TEXT,
  email TEXT,
  avaliacao DECIMAL(3,1),
  msg TEXT,
  info_adicional TEXT,
  status TEXT DEFAULT 'novo',
  etapa TEXT DEFAULT 'triagem',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de entrevistas agendadas
CREATE TABLE public.rh_entrevistas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  candidato_id UUID REFERENCES public.rh_candidatos(id) ON DELETE CASCADE,
  vaga_id UUID REFERENCES public.rh_vagas(id) ON DELETE SET NULL,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  tipo TEXT DEFAULT 'online',
  link_reuniao TEXT,
  local TEXT,
  notas TEXT,
  status TEXT DEFAULT 'agendada',
  resultado TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rh_vagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_entrevistas ENABLE ROW LEVEL SECURITY;

-- Policies for rh_vagas
CREATE POLICY "Users can view their own vagas" ON public.rh_vagas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own vagas" ON public.rh_vagas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vagas" ON public.rh_vagas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vagas" ON public.rh_vagas FOR DELETE USING (auth.uid() = user_id);

-- Policies for rh_candidatos
CREATE POLICY "Users can view their own candidatos" ON public.rh_candidatos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own candidatos" ON public.rh_candidatos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own candidatos" ON public.rh_candidatos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own candidatos" ON public.rh_candidatos FOR DELETE USING (auth.uid() = user_id);

-- Policies for rh_entrevistas
CREATE POLICY "Users can view their own entrevistas" ON public.rh_entrevistas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own entrevistas" ON public.rh_entrevistas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own entrevistas" ON public.rh_entrevistas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own entrevistas" ON public.rh_entrevistas FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_rh_vagas_updated_at
  BEFORE UPDATE ON public.rh_vagas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_rh_candidatos_updated_at
  BEFORE UPDATE ON public.rh_candidatos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_rh_entrevistas_updated_at
  BEFORE UPDATE ON public.rh_entrevistas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();