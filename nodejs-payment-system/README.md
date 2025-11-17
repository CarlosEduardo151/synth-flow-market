# Sistema de Pagamentos - Mercado Pago + Semi-Automático

Sistema completo de pagamentos em Node.js com integração ao Mercado Pago (automático) e sistema PIX semi-automático.

## 🚀 Funcionalidades

- ✅ **Pagamento Automático** via Mercado Pago SDK
- ✅ **Pagamento Semi-Automático** (PIX)
- ✅ **Webhook** funcional para notificações do Mercado Pago
- ✅ **Gestão de Produtos** completa (CRUD)
- ✅ **Gestão de Pedidos** e Pagamentos
- ✅ **Sistema de Logs** detalhado em JSON
- ✅ **Validação** automática de pagamentos
- ✅ **Liberação automática** de produtos após aprovação

## 📦 Instalação

### 1. Clone ou copie os arquivos

```bash
cd nodejs-payment-system
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e preencha com suas credenciais:

```bash
cp config/.env.example .env
```

Edite o arquivo `.env`:

```env
# Mercado Pago (obtenha em: https://www.mercadopago.com.br/developers/panel/app)
MERCADO_PAGO_ACCESS_TOKEN=seu_access_token_aqui
MERCADO_PAGO_PUBLIC_KEY=sua_public_key_aqui

# Webhook (sua URL pública para receber notificações)
WEBHOOK_URL=https://seu-dominio.com/webhook/mercadopago

# Database PostgreSQL
DATABASE_URL=postgresql://usuario:senha@localhost:5432/payment_system
DB_HOST=localhost
DB_PORT=5432
DB_NAME=payment_system
DB_USER=seu_usuario
DB_PASSWORD=sua_senha

# Aplicação
APP_PORT=3000
NODE_ENV=development

# PIX (para pagamento semi-automático)
PIX_KEY=sua_chave_pix@email.com
PIX_RECEIVER_NAME=Seu Nome ou Empresa
```

### 4. Configure o banco de dados

#### Opção A: PostgreSQL local

```bash
# Instale PostgreSQL
# Ubuntu/Debian:
sudo apt-get install postgresql postgresql-contrib

# macOS:
brew install postgresql

# Crie o banco de dados
createdb payment_system

# Execute as migrations
npm run migrate
```

#### Opção B: PostgreSQL online (Supabase, ElephantSQL, etc.)

Use a DATABASE_URL fornecida pelo serviço.

### 5. Execute o servidor

```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

## 📚 API Endpoints

### Produtos

#### POST /products/add
Adiciona um novo produto.

```json
{
  "title": "CRM Simples",
  "slug": "crm-simples",
  "description": "Sistema CRM completo",
  "price": 20000,
  "category": "micro-empresas",
  "images": ["/images/crm.png"],
  "features": ["Dashboard", "Gestão de clientes"],
  "in_stock": true,
  "delivery": "Imediato"
}
```

#### GET /products
Lista todos os produtos.

#### GET /products/:id
Busca produto por ID.

### Pagamentos

#### POST /create-payment
Cria um novo pagamento (automático ou semi-automático).

**Pagamento Automático (Mercado Pago):**
```json
{
  "payment_type": "automatic",
  "customer_name": "João Silva",
  "customer_email": "joao@email.com",
  "customer_phone": "11999999999",
  "items": [
    {
      "product_id": "uuid-do-produto",
      "quantity": 1
    }
  ],
  "success_url": "https://seusite.com/sucesso",
  "failure_url": "https://seusite.com/falha"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid-do-pedido",
    "payment_id": "uuid-do-pagamento",
    "preference_id": "12345678-abcd",
    "payment_link": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=..."
  }
}
```

**Pagamento Semi-Automático (PIX):**
```json
{
  "payment_type": "semi-auto",
  "customer_name": "Maria Santos",
  "customer_email": "maria@email.com",
  "customer_phone": "11988888888",
  "items": [
    {
      "product_id": "uuid-do-produto",
      "quantity": 1
    }
  ]
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid-do-pedido",
    "payment_id": "uuid-do-pagamento",
    "total_amount": 20000,
    "pix_info": {
      "key": "sua_chave@email.com",
      "receiver_name": "Seu Nome"
    }
  }
}
```

#### POST /semi-auto/pay
Atalho para criar pagamento PIX.

#### GET /payments/all
Lista todos os pagamentos.

### Webhook

#### POST /webhook/mercadopago
Recebe notificações automáticas do Mercado Pago.

**Este endpoint é chamado automaticamente pelo Mercado Pago quando há mudanças no status do pagamento.**

## 🔧 Configuração do Webhook no Mercado Pago

1. Acesse o [Painel de Desenvolvedores](https://www.mercadopago.com.br/developers/panel/app)
2. Selecione sua aplicação
3. Vá em "Webhooks"
4. Configure a URL: `https://seu-dominio.com/webhook/mercadopago`
5. Selecione eventos: **Pagamentos**

## 🧪 Testando a API

### Usando curl

```bash
# Adicionar produto
curl -X POST http://localhost:3000/products/add \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Produto Teste",
    "slug": "produto-teste",
    "price": 10000,
    "description": "Descrição do produto",
    "category": "teste"
  }'

# Criar pagamento automático
curl -X POST http://localhost:3000/create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "payment_type": "automatic",
    "customer_name": "Teste",
    "customer_email": "teste@email.com",
    "items": [{"product_id": "uuid-aqui", "quantity": 1}]
  }'

# Listar produtos
curl http://localhost:3000/products

# Listar pagamentos
curl http://localhost:3000/payments/all
```

### Usando Postman ou Insomnia

Importe as rotas acima criando requisições com os mesmos endpoints e payloads.

## 📊 Estrutura do Banco de Dados

```
products          → Catálogo de produtos
orders            → Pedidos realizados
payments          → Pagamentos (automáticos e semi-automáticos)
order_items       → Itens de cada pedido
logs              → Logs detalhados de eventos
```

## 🔒 Segurança

- ✅ Validação de dados de entrada
- ✅ Variáveis de ambiente para credenciais
- ✅ Logs detalhados para auditoria
- ✅ Tratamento de erros robusto

## 📝 Logs

Todos os eventos são registrados na tabela `logs` com:
- Tipo de evento
- Origem (mercadopago, semi-auto, system)
- Dados completos em JSON
- IP e User-Agent
- Timestamp

## 🚀 Deploy

### Heroku

```bash
heroku create seu-app
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

### Railway / Render

1. Conecte o repositório
2. Configure as variáveis de ambiente
3. Deploy automático

### VPS (DigitalOcean, AWS, etc.)

```bash
# Instale Node.js e PostgreSQL
# Clone o projeto
git clone seu-repo
cd nodejs-payment-system
npm install
npm run migrate
pm2 start server.js
```

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verifique os logs da aplicação
2. Verifique os logs da tabela `logs` no banco
3. Teste as rotas individualmente
4. Verifique as credenciais do Mercado Pago

## 📄 Licença

MIT
