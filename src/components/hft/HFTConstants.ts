export const CRYPTO_PAIRS = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 
  'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT',
  'USDC/USDT', 'LINK/USDT', 'ATOM/USDT', 'UNI/USDT', 'LTC/USDT'
];

export interface AssetInfo {
  name: string;
  description: string;
  color: string;
  icon: string;
}

export const ASSET_INFO: Record<string, AssetInfo> = {
  'BTC/USDT': { 
    name: 'Bitcoin', 
    description: 'Moeda digital descentralizada e líder de mercado. Reserva de valor digital.',
    color: 'from-orange-500 to-amber-500',
    icon: '₿'
  },
  'ETH/USDT': { 
    name: 'Ethereum', 
    description: 'Plataforma de contratos inteligentes. Base para DeFi e NFTs.',
    color: 'from-blue-500 to-indigo-500',
    icon: 'Ξ'
  },
  'SOL/USDT': { 
    name: 'Solana', 
    description: 'Blockchain de alta velocidade. Até 65.000 TPS com baixas taxas.',
    color: 'from-purple-500 to-fuchsia-500',
    icon: '◎'
  },
  'BNB/USDT': { 
    name: 'Binance Coin', 
    description: 'Token nativo da Binance. Usado para taxas e utilidades.',
    color: 'from-yellow-500 to-orange-400',
    icon: 'B'
  },
  'XRP/USDT': { 
    name: 'Ripple', 
    description: 'Sistema de pagamentos globais. Transferências instantâneas.',
    color: 'from-slate-400 to-slate-600',
    icon: 'X'
  },
  'ADA/USDT': { 
    name: 'Cardano', 
    description: 'Blockchain proof-of-stake. Foco em sustentabilidade e pesquisa.',
    color: 'from-blue-400 to-cyan-500',
    icon: '₳'
  },
  'DOGE/USDT': { 
    name: 'Dogecoin', 
    description: 'Memecoin popular. Grande comunidade e adoção crescente.',
    color: 'from-amber-400 to-yellow-500',
    icon: 'Ð'
  },
  'AVAX/USDT': { 
    name: 'Avalanche', 
    description: 'Plataforma de contratos inteligentes ultra-rápida.',
    color: 'from-red-500 to-rose-500',
    icon: 'A'
  },
  'DOT/USDT': { 
    name: 'Polkadot', 
    description: 'Protocolo multi-chain. Conecta blockchains diferentes.',
    color: 'from-pink-500 to-rose-400',
    icon: '●'
  },
  'MATIC/USDT': { 
    name: 'Polygon', 
    description: 'Solução Layer 2 para Ethereum. Taxas baixas e rápido.',
    color: 'from-violet-500 to-purple-500',
    icon: '⬡'
  },
  'USDC/USDT': { 
    name: 'USD Coin', 
    description: 'Stablecoin lastreada em dólar. Paridade 1:1 com USD.',
    color: 'from-blue-500 to-blue-600',
    icon: '$'
  },
  'LINK/USDT': { 
    name: 'Chainlink', 
    description: 'Oráculos descentralizados. Conecta dados externos à blockchain.',
    color: 'from-blue-400 to-indigo-600',
    icon: '⬡'
  },
  'ATOM/USDT': { 
    name: 'Cosmos', 
    description: 'Internet das blockchains. Interoperabilidade entre redes.',
    color: 'from-indigo-500 to-purple-600',
    icon: '⚛'
  },
  'UNI/USDT': { 
    name: 'Uniswap', 
    description: 'DEX líder em Ethereum. Troca descentralizada de tokens.',
    color: 'from-pink-400 to-rose-500',
    icon: '🦄'
  },
  'LTC/USDT': { 
    name: 'Litecoin', 
    description: 'Prata digital. Transações rápidas e baratas.',
    color: 'from-slate-400 to-blue-400',
    icon: 'Ł'
  },
};

export interface BotStatus {
  patrimonio: number;
  lucro_prejuizo: number;
  lucro_percentual: number;
  lucro: number;
  caixa: number;
  win_rate: number;
  total_trades: number;
  ativos: string[];
  status: string;
  sentimento: string;
  uptime?: string;
  vitorias?: number;
  derrotas?: number;
  posicoes_abertas?: number;
  ativos_alocados?: number;
}

export interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface HistoryEntry {
  time: string;
  patrimonio: number;
  lucro: number;
}
