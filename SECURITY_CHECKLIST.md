# 🔒 CHECKLIST DE SEGURANÇA - StarAI

Use este checklist para auditoria periódica de segurança.

## 🎯 CRÍTICO (Verificar Semanalmente)

### Autenticação & Autorização
- [ ] Nenhum hardcoded credential no código
- [ ] Roles de admin atribuídos apenas via banco de dados
- [ ] Função `has_role()` usando SECURITY DEFINER
- [ ] Nenhuma policy RLS com `USING (true)` ou `WITH CHECK (true)`
- [ ] Sessions expiram após inatividade
- [ ] Tokens JWT não expostos no localStorage sem necessidade

### Input Validation
- [ ] Todas edge functions validam inputs
- [ ] Todas edge functions sanitizam strings
- [ ] Nenhum SQL injection possível (usar Supabase client sempre)
- [ ] Nenhum XSS possível (sanitizar outputs)
- [ ] File uploads validados (tipo, tamanho, conteúdo)

### Secrets Management
- [ ] Nenhuma API key hardcoded no código
- [ ] Todas API keys em Supabase Secrets
- [ ] `.env` no `.gitignore`
- [ ] Nenhum secret em logs
- [ ] Z-API credentials apenas no backend

## 🛡️ ALTO (Verificar Mensalmente)

### Network Security
- [ ] CORS restrito aos domínios corretos
- [ ] Rate limiting aplicado em todas endpoints
- [ ] HTTPS enforced (sem HTTP)
- [ ] HSTS headers configurados
- [ ] Security headers implementados (CSP, X-Frame-Options, etc.)

### RLS Policies
- [ ] Todas as tabelas sensíveis com RLS habilitado
- [ ] Policies testadas com diferentes roles
- [ ] Nenhuma policy muito permissiva
- [ ] Policies de admin usando `has_role(auth.uid(), 'admin')`

### Dependencies
- [ ] `npm audit` sem vulnerabilidades HIGH/CRITICAL
- [ ] Todas dependências atualizadas
- [ ] Nenhuma dependência deprecated
- [ ] Supabase CLI atualizado

## 📊 MÉDIO (Verificar Trimestralmente)

### Logging & Monitoring
- [ ] Logs de autenticação funcionando
- [ ] Logs de edge functions sem dados sensíveis
- [ ] Alertas de segurança configurados
- [ ] Failed login attempts monitorados
- [ ] Rate limit excedido monitorado

### Testing
- [ ] Testes de segurança automatizados no CI/CD
- [ ] SAST rodando no pipeline
- [ ] Dependency scanning no pipeline
- [ ] Penetration testing realizado

### Documentation
- [ ] Documentação de segurança atualizada
- [ ] Processos de resposta a incidentes documentados
- [ ] Contatos de emergência atualizados
- [ ] Backup e DR procedures testados

## 🔍 BAIXO (Verificar Anualmente)

### Compliance
- [ ] LGPD compliance verificado
- [ ] Termos de uso atualizados
- [ ] Política de privacidade atualizada
- [ ] Data retention policies implementadas

### Infrastructure
- [ ] Postgres version atualizada
- [ ] Leaked password protection habilitado
- [ ] Function search paths configurados
- [ ] Database backups testados

---

## 📋 COMANDOS ÚTEIS

### Verificar Vulnerabilidades
```bash
# Frontend dependencies
npm audit

# Fix vulnerabilidades automáticas
npm audit fix

# Verificar com Snyk
npx snyk test

# Supabase linter
supabase db lint
```

### Testar RLS Policies
```sql
-- Testar como usuário normal
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO 'user-uuid-here';
SELECT * FROM sensitive_table;

-- Testar como admin
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO 'admin-uuid-here';
SELECT * FROM sensitive_table;
```

### Verificar Headers de Segurança
```bash
# Verificar headers HTTP
curl -I https://yourdomain.com

# Testar com SecurityHeaders.com
# https://securityheaders.com/?q=yourdomain.com
```

### Scan de Segurança com OWASP ZAP
```bash
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://yourdomain.com \
  -r zap-report.html
```

---

## 🚨 EM CASO DE INCIDENTE

### 1. Contenção Imediata
- [ ] Isolar sistema comprometido
- [ ] Desabilitar contas suspeitas
- [ ] Bloquear IPs maliciosos
- [ ] Revogar tokens/sessions comprometidos

### 2. Investigação
- [ ] Coletar logs relevantes
- [ ] Identificar vetor de ataque
- [ ] Avaliar extensão do comprometimento
- [ ] Documentar timeline

### 3. Erradicação
- [ ] Corrigir vulnerabilidade explorada
- [ ] Aplicar patches de segurança
- [ ] Atualizar credenciais comprometidas
- [ ] Fortalecer controles afetados

### 4. Recuperação
- [ ] Restaurar sistemas afetados
- [ ] Verificar integridade de dados
- [ ] Testar correções
- [ ] Monitorar por nova atividade suspeita

### 5. Pós-Incidente
- [ ] Documentar incidente completo
- [ ] Atualizar procedimentos
- [ ] Treinar equipe
- [ ] Implementar melhorias

---

## 📞 CONTATOS DE EMERGÊNCIA

**Suporte Supabase**:
- Dashboard: https://supabase.com/dashboard
- Support: https://supabase.com/support
- Status: https://status.supabase.com

**CERT.br** (Incidentes Cibernéticos Brasil):
- Email: cert@cert.br
- Site: https://www.cert.br

---

**Última atualização**: 26/11/2025  
**Próxima revisão**: [Data + 1 mês]
