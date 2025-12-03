# 🚀 CHECKLIST DE DEPLOY SEGURO - StarAI

Use este checklist antes de cada deploy para garantir segurança.

## ✅ PRÉ-DEPLOY

### 1. Código & Dependências
- [ ] `npm audit` sem vulnerabilidades HIGH/CRITICAL
- [ ] Todas dependências atualizadas
- [ ] `.env` não commitado no Git
- [ ] Nenhum `console.log` com dados sensíveis
- [ ] Nenhum hardcoded credential
- [ ] Build local funciona sem erros

### 2. Testes
- [ ] Testes unitários passando
- [ ] Testes de integração passando
- [ ] Testes de segurança passando
- [ ] Script `./run_security_checks.sh` sem erros

### 3. Banco de Dados
- [ ] Backup recente existe
- [ ] Migrações testadas em staging
- [ ] RLS policies revisadas
- [ ] Supabase linter sem warnings críticos

### 4. Edge Functions
- [ ] Todas validam inputs
- [ ] Todas têm rate limiting
- [ ] CORS configurado corretamente
- [ ] Secrets configurados no Supabase
- [ ] Deploy testado em staging

### 5. Frontend
- [ ] Nenhuma API key exposta no código
- [ ] Z-API usando edge function (não direto do browser)
- [ ] CSP headers configurados
- [ ] Error boundaries implementados

## 🚀 DURANTE O DEPLOY

### 1. Preparação
- [ ] Notificar stakeholders sobre deploy
- [ ] Confirmar horário de baixo tráfego
- [ ] Ter rollback plan preparado

### 2. Deploy
```bash
# 1. Verificar status do Supabase
curl -I https://agndhravgmcwpdjkozka.supabase.co/rest/v1/

# 2. Fazer backup do banco
# Via Dashboard: Database > Backups > Create Backup

# 3. Deploy das edge functions
supabase functions deploy

# 4. Aplicar migrações SQL (se houver)
# Execute SECURITY_FIXES.sql no SQL Editor

# 5. Build e deploy do frontend
npm run build
# Deploy via seu provedor (Vercel, Netlify, etc.)

# 6. Verificar logs em tempo real
# Via Dashboard: Logs > Functions
```

### 3. Validação Pós-Deploy
- [ ] Aplicação carrega corretamente
- [ ] Login funciona
- [ ] Páginas principais carregam
- [ ] Edge functions respondem
- [ ] Nenhum erro nos logs
- [ ] HTTPS funciona
- [ ] Headers de segurança presentes

## 🔍 PÓS-DEPLOY

### 1. Monitoramento (Primeiras 2 horas)
- [ ] Monitorar logs do Supabase
- [ ] Monitorar erros do frontend (Sentry/LogRocket)
- [ ] Verificar métricas de performance
- [ ] Checar rate de erros HTTP
- [ ] Verificar alertas de segurança

### 2. Smoke Tests
```bash
# Testar endpoints principais
curl -I https://yourdomain.com
curl -I https://yourdomain.com/api/health

# Testar autenticação
# Login manual via interface

# Testar funcionalidade crítica
# Criar pedido de teste
# Processar pagamento de teste
```

### 3. Validação de Segurança
- [ ] CORS funcionando corretamente
- [ ] Rate limiting ativo
- [ ] RLS policies funcionando
- [ ] Sessões expirando corretamente
- [ ] Logs sem dados sensíveis

## 🚨 ROLLBACK (Se Necessário)

### Quando Fazer Rollback
- Erros críticos afetando usuários
- Vulnerabilidade de segurança descoberta
- Performance degradada significativamente
- Perda de dados detectada

### Procedimento de Rollback
```bash
# 1. Reverter edge functions
supabase functions deploy <function-name> --version <previous-version>

# 2. Reverter frontend
# Usar funcionalidade de rollback do seu provedor

# 3. Reverter migrações SQL
# Executar migration down (se disponível)

# 4. Restaurar backup do banco (último caso)
# Via Dashboard: Database > Backups > Restore
```

### Pós-Rollback
- [ ] Notificar stakeholders
- [ ] Documentar causa do rollback
- [ ] Criar issue para correção
- [ ] Agendar novo deploy após correção

## 📊 MÉTRICAS DE SUCESSO

### Imediato (0-2h após deploy)
- [ ] 0 erros 5xx
- [ ] Taxa de erro < 1%
- [ ] Latência P95 < 2s
- [ ] 0 alertas de segurança

### Curto Prazo (24h após deploy)
- [ ] Taxa de erro < 0.5%
- [ ] Nenhum incidente de segurança
- [ ] Feedback positivo de usuários
- [ ] Métricas de negócio estáveis

### Médio Prazo (1 semana após deploy)
- [ ] Nenhuma vulnerabilidade reportada
- [ ] Performance estável ou melhorada
- [ ] Custos de infraestrutura controlados
- [ ] Satisfação de usuários mantida/melhorada

## 📝 TEMPLATE DE COMUNICAÇÃO

### Notificação Pré-Deploy
```
🚀 DEPLOY AGENDADO

Data/Hora: [DATA/HORA]
Duração Estimada: [TEMPO]
Impacto: [NENHUM/BAIXO/MÉDIO/ALTO]

Mudanças Principais:
- [MUDANÇA 1]
- [MUDANÇA 2]
- [MUDANÇA 3]

Ações Requeridas:
- [AÇÃO 1, se houver]
- [AÇÃO 2, se houver]

Contato de Emergência: [EMAIL/TELEFONE]
```

### Notificação Pós-Deploy (Sucesso)
```
✅ DEPLOY CONCLUÍDO COM SUCESSO

Data/Hora: [DATA/HORA]
Duração Real: [TEMPO]

Status:
✅ Frontend: OK
✅ Backend: OK  
✅ Database: OK
✅ Edge Functions: OK

Próximos Passos:
- Monitoramento ativo por 24h
- Métricas sendo coletadas
- Feedback de usuários sendo monitorado

Dashboard: [LINK]
```

### Notificação Pós-Deploy (Problemas)
```
⚠️ DEPLOY COM PROBLEMAS

Data/Hora: [DATA/HORA]
Status: [EM INVESTIGAÇÃO/ROLLBACK INICIADO/RESOLVIDO]

Problema:
[DESCRIÇÃO DO PROBLEMA]

Impacto:
[DESCRIÇÃO DO IMPACTO]

Ação Tomada:
[AÇÃO TOMADA]

Próximos Passos:
[PRÓXIMOS PASSOS]

ETA de Resolução: [TEMPO]
```

## 🔐 VERIFICAÇÃO DE SEGURANÇA PÓS-DEPLOY

```bash
# Execute após cada deploy
./run_security_checks.sh

# Verificar headers HTTP
curl -I https://yourdomain.com

# Testar CORS
curl -H "Origin: https://attacker.com" \
     -I https://yourdomain.com/api/endpoint

# Verificar rate limiting
for i in {1..50}; do 
  curl https://yourdomain.com/api/endpoint
done

# Verificar Supabase linter
supabase db lint
```

## 📞 CONTATOS DE EMERGÊNCIA

**Equipe de Desenvolvimento**:
- Primary: [EMAIL]
- Secondary: [EMAIL]
- Emergency: [TELEFONE]

**Supabase Support**:
- Dashboard: https://supabase.com/dashboard
- Support: https://supabase.com/support
- Status: https://status.supabase.com

**Provedor de Hosting**:
- Support: [LINK]
- Status Page: [LINK]

---

**Última atualização**: 26/11/2025  
**Próxima revisão**: [Data + 1 mês]
