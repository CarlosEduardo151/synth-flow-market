#!/bin/bash

# 🔒 Script de Verificação de Segurança - StarAI
# Execute este script periodicamente para verificar vulnerabilidades

set -e

echo "🔒 Iniciando verificações de segurança..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
ISSUES=0

# 1. Verificar dependências do Node.js
echo "📦 Verificando dependências do frontend..."
if command -v npm &> /dev/null; then
    npm audit --json > npm-audit.json 2>&1 || true
    
    CRITICAL=$(cat npm-audit.json | grep -o '"critical":[0-9]*' | cut -d':' -f2)
    HIGH=$(cat npm-audit.json | grep -o '"high":[0-9]*' | cut -d':' -f2)
    
    if [ "$CRITICAL" != "0" ] || [ "$HIGH" != "0" ]; then
        echo -e "${RED}❌ Encontradas vulnerabilidades: $CRITICAL críticas, $HIGH altas${NC}"
        ISSUES=$((ISSUES + 1))
    else
        echo -e "${GREEN}✅ Nenhuma vulnerabilidade crítica/alta encontrada${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  npm não encontrado, pulando verificação${NC}"
fi
echo ""

# 2. Verificar se há secrets hardcoded
echo "🔍 Procurando por secrets hardcoded..."
if grep -r "api[_-]key\|token\|secret\|password" src/ --include="*.tsx" --include="*.ts" | grep -v "// " | grep -v "/\*" | grep -v "SUPABASE_URL" | grep -v "SUPABASE_PUBLISHABLE_KEY"; then
    echo -e "${RED}❌ Possíveis secrets encontrados no código!${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ Nenhum secret hardcoded detectado${NC}"
fi
echo ""

# 3. Verificar .env no .gitignore
echo "📝 Verificando .gitignore..."
if grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✅ .env está no .gitignore${NC}"
else
    echo -e "${RED}❌ .env NÃO está no .gitignore!${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 4. Verificar CORS nas edge functions
echo "🌐 Verificando configurações de CORS..."
CORS_ISSUES=$(grep -r "Access-Control-Allow-Origin.*\*" supabase/functions/ 2>/dev/null | wc -l)
if [ "$CORS_ISSUES" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Encontradas $CORS_ISSUES edge functions com CORS totalmente aberto${NC}"
    echo "   Arquivos:"
    grep -r "Access-Control-Allow-Origin.*\*" supabase/functions/ 2>/dev/null | cut -d':' -f1 | sort -u
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ CORS configurado corretamente${NC}"
fi
echo ""

# 5. Verificar se Supabase CLI está instalado
echo "🔧 Verificando Supabase CLI..."
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✅ Supabase CLI instalado${NC}"
    
    # Executar linter do Supabase
    echo "   Executando Supabase linter..."
    if supabase db lint 2>&1 | tee supabase-lint.log; then
        LINT_ISSUES=$(grep -c "Level: WARN\|Level: ERROR" supabase-lint.log 2>/dev/null || echo "0")
        if [ "$LINT_ISSUES" -gt 0 ]; then
            echo -e "${YELLOW}⚠️  Encontrados $LINT_ISSUES problemas no banco de dados${NC}"
            ISSUES=$((ISSUES + 1))
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Supabase CLI não instalado${NC}"
    echo "   Instale com: npm install -g supabase"
fi
echo ""

# 6. Verificar validação de input nas edge functions
echo "🛡️  Verificando validação de input..."
VALIDATION_MISSING=0
for func in supabase/functions/*/index.ts; do
    if [ -f "$func" ]; then
        if ! grep -q "validate" "$func"; then
            echo -e "${YELLOW}⚠️  Sem validação detectada: $func${NC}"
            VALIDATION_MISSING=$((VALIDATION_MISSING + 1))
        fi
    fi
done

if [ "$VALIDATION_MISSING" -eq 0 ]; then
    echo -e "${GREEN}✅ Todas edge functions têm validação${NC}"
else
    echo -e "${YELLOW}⚠️  $VALIDATION_MISSING edge functions sem validação${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 7. Verificar rate limiting
echo "⏱️  Verificando rate limiting..."
RATE_LIMIT_MISSING=0
for func in supabase/functions/*/index.ts; do
    if [ -f "$func" ]; then
        if ! grep -q "rate.limit\|rateLimit\|checkRateLimit" "$func"; then
            echo -e "${YELLOW}⚠️  Sem rate limiting: $func${NC}"
            RATE_LIMIT_MISSING=$((RATE_LIMIT_MISSING + 1))
        fi
    fi
done

if [ "$RATE_LIMIT_MISSING" -eq 0 ]; then
    echo -e "${GREEN}✅ Todas edge functions têm rate limiting${NC}"
else
    echo -e "${YELLOW}⚠️  $RATE_LIMIT_MISSING edge functions sem rate limiting${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 8. Verificar se há console.log com dados sensíveis
echo "📋 Verificando logs com dados sensíveis..."
SENSITIVE_LOGS=$(grep -r "console\.log.*password\|console\.log.*token\|console\.log.*secret" src/ supabase/functions/ 2>/dev/null | wc -l)
if [ "$SENSITIVE_LOGS" -gt 0 ]; then
    echo -e "${RED}❌ Encontrados $SENSITIVE_LOGS logs com possíveis dados sensíveis${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ Nenhum log suspeito encontrado${NC}"
fi
echo ""

# Resumo
echo "======================================"
echo "📊 RESUMO DA VERIFICAÇÃO DE SEGURANÇA"
echo "======================================"
if [ "$ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ Nenhum problema crítico encontrado!${NC}"
    exit 0
else
    echo -e "${RED}❌ $ISSUES problemas de segurança encontrados${NC}"
    echo ""
    echo "Revise os problemas acima e corrija antes de fazer deploy."
    echo ""
    echo "📚 Documentação:"
    echo "   - SECURITY_REPORT.md - Relatório completo de segurança"
    echo "   - SECURITY_CHECKLIST.md - Checklist de verificação"
    echo ""
    exit 1
fi
