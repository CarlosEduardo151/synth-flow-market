import { Product } from '@/types/product';

export const starapp: Product = {
  title: "StarAPP - Sistema NFC para Hotéis",
  slug: "starapp",
  price: 1500000, // R$ 15.000,00 em centavos (compra)
  rentalPrice: 850000, // R$ 8.500,00/mês em centavos
  category: "nfc",
  images: ["/images/produtos/starapp.png"],
  short: "Sistema inteligente com tecnologia NFC para gerenciar pedidos de restaurantes em hotéis, pousadas e resorts.",
  badges: ["Tecnologia NFC", "Automação Total", "Gestão Hoteleira"],
  features: [
    "Leitura automática de pulseiras NFC",
    "Cadastro de cardápio digital completo",
    "Painel administrativo central",
    "Painéis individuais por hotel",
    "Sistema de login para funcionários e garçons",
    "Gestão de pedidos em tempo real",
    "Integração automática com check-out",
    "Relatórios de consumo por hóspede",
    "Controle de acesso por níveis",
    "App personalizado com nome do hotel"
  ],
  rentalAdvantages: [
    "💰 Economia de 43% mensalmente",
    "🔄 Atualizações constantes do sistema",
    "🚀 Suporte técnico prioritário",
    "🛠️ Configuração completa inclusa",
    "📱 Apps ilimitados para seus hotéis",
    "🔐 Backup em nuvem automático"
  ],
  requiredCredentials: [
    "E-mail administrativo (staraiofc@gmail.com)",
    "Dados dos hotéis parceiros",
    "Configuração de dispositivos NFC"
  ],
  inStock: true,
  delivery: "Configuração em até 48 horas + treinamento incluso",
  specs: "Sistema completo com tecnologia NFC - R$ 15.000 (compra) ou R$ 8.500/mês (aluguel)",
  content: `
# StarAPP - Sistema Inteligente NFC para Hotéis

O StarAPP é uma solução completa e automatizada para restaurantes de hotéis, pousadas e resorts. Utilizando tecnologia NFC de ponta, permite identificação instantânea de hóspedes e gerenciamento eficiente de pedidos.

## Como Funciona

1. **Check-in**: O hóspede recebe uma pulseira NFC cadastrada com nome e CPF
2. **Pedido**: O garçom aproxima a pulseira do dispositivo e o cardápio abre automaticamente
3. **Registro**: Todos os pedidos são vinculados ao hóspede automaticamente
4. **Check-out**: O sistema envia todos os consumos para pagamento final

## Painel Administrativo Central

O administrador principal (${`staraiofc@gmail.com`}) tem acesso total para:

- Cadastrar novos hotéis parceiros
- Gerenciar todos os painéis
- Acompanhar estatísticas gerais
- Visualizar relatórios consolidados
- Controlar acessos e permissões

## Painel Individual por Hotel

Cada hotel tem seu próprio sistema personalizado onde o dono pode:

- Cadastrar e editar o cardápio completo
- Adicionar comidas, bebidas, sobremesas e outros itens
- Gerenciar equipe (garçons e funcionários)
- Visualizar pedidos em tempo real
- Gerar relatórios de consumo
- Acompanhar faturamento

## Sistema de Login Multinível

### Administrador Principal
- Acesso total ao sistema
- Gerenciamento de hotéis
- Configurações globais

### Dono do Hotel
- Painel do seu hotel
- Gestão de cardápio
- Gerenciamento de equipe
- Relatórios completos

### Garçons/Funcionários
- Acesso ao app de pedidos
- Leitura de pulseiras NFC
- Registro de pedidos
- Consulta de cardápio

## Tecnologia NFC

- Leitura instantânea de pulseiras
- Identificação automática de hóspedes
- Sem necessidade de digitação manual
- Processo rápido e seguro
- Reduz erros de cadastro

## Recursos Avançados

- **Cardápio Digital**: Interface moderna e intuitiva
- **Pedidos em Tempo Real**: Acompanhamento instantâneo
- **Integração Check-out**: Envio automático de consumos
- **Relatórios Inteligentes**: Análise de consumo por hóspede
- **Multi-hotel**: Gerencie vários estabelecimentos
- **Personalização**: Nome do hotel no app (ex: StarAPP Paradise Hotel)

## Benefícios

- ✅ Redução de erros em pedidos
- ✅ Agilidade no atendimento
- ✅ Controle total de consumo
- ✅ Experiência premium para hóspedes
- ✅ Automatização do check-out
- ✅ Gestão centralizada e eficiente

## Para Quem É

Ideal para hotéis, pousadas, resorts e estabelecimentos hoteleiros que desejam modernizar o atendimento do restaurante e oferecer uma experiência diferenciada aos hóspedes.

## Desenvolvedor

Sistema desenvolvido por **Carlos Eduardo**  
Administração: staraiofc@gmail.com
  `
};
