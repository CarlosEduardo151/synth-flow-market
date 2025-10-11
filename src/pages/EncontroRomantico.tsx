import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

interface EncontroRomantico {
  data: string;
  dia: string;
  tema: string;
  local: string;
  atividade: string;
  emoji: string;
  cor: string;
}

const CalendarioRomantico = () => {
  const [touchedCards, setTouchedCards] = useState<Set<number>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);

  const playSound = (frequency: number, duration: number) => {
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    }
  };

  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const handleCardTouch = (index: number) => {
    setTouchedCards(prev => new Set([...prev, index]));
    
    // Som fofo baseado no índice
    const frequencies = [523.25, 659.25, 783.99, 880.00, 1046.50]; // C5, E5, G5, A5, C6
    playSound(frequencies[index % frequencies.length], 0.3);
    
    // Vibração fofa
    vibrate([50, 30, 50]);
    
    // Remove o destaque após animação
    setTimeout(() => {
      setTouchedCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }, 1000);
  };

  const playHeartSound = () => {
    playSound(880, 0.2);
    setTimeout(() => playSound(1108.73, 0.2), 150);
    vibrate([30, 20, 30, 20, 50]);
  };

  const encontros: EncontroRomantico[] = [
    {
      data: "20",
      dia: "Sábado, 20 Setembro",
      tema: "Dia do reconselho",
      local: "Beira Rio - Casa do cadu",
      atividade: "Comer, Conversar e reconsiliar",
      emoji: "🧺",
      cor: "from-pink-200 to-rose-200"
    },
    {
      data: "28",
      dia: "Domingo, 28 Setembro", 
      tema: "Caça Selfies pela Cidade",
      local: "Centro Histórico & Praça",
      atividade: "5 fotos criativas & sorvete",
      emoji: "📸",
      cor: "from-purple-200 to-pink-200"
    },
    {
      data: "05",
      dia: "Domingo, 05 Outubro",
      tema: "Cinema em Casa",
      local: "Casa de um de vocês",
      atividade: "Filme, cozinhar juntos & ingresso caseiro",
      emoji: "🍿",
      cor: "from-blue-200 to-purple-200"
    },
    {
      data: "12",
      dia: "Sábado, 12 Outubro",
      tema: "Dia de Princesa",
      local: "Casa dela",
      atividade: "Receita especial, jantar romântico & assistir filme juntos",
      emoji: "👸",
      cor: "from-yellow-200 to-pink-200"
    },
    {
      data: "18",
      dia: "Sexta, 18 Outubro",
      tema: "Pôr do Sol & Pizza",
      local: "Beira Rio - Deck Principal",
      atividade: "Ver pôr do sol, pizza & lembrancinha nosso aniversário de namoro",
      emoji: "🌅",
      cor: "from-orange-200 to-red-200"
    }
  ];

  useEffect(() => {
    // Som de boas-vindas suave
    setTimeout(() => {
      playSound(523.25, 0.4);
      setTimeout(() => playSound(659.25, 0.4), 200);
      setTimeout(() => playSound(783.99, 0.6), 400);
    }, 500);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background animado com gradientes */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,165,0,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,192,203,0.15),transparent_50%)]"></div>
      </div>

      {/* Partículas flutuantes */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          >
            {['💕', '✨', '🌸', '💖', '🦋'][i % 5]}
          </div>
        ))}
      </div>

      <div className="relative z-10 max-w-sm mx-auto p-4 space-y-6">
        {/* Header Interativo */}
        <div className="text-center py-8">
          <div 
            className="inline-block cursor-pointer transform transition-all duration-300 hover:scale-110 active:scale-95"
            onClick={playHeartSound}
          >
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FFA500] via-pink-500 to-rose-500 bg-clip-text text-transparent mb-3 animate-pulse">
              Nossos Encontros 💕
            </h1>
          </div>
          <div className="flex justify-center items-center gap-2 text-sm">
            <span className="text-gray-600">Criado com muito amor</span>
            <button 
              onClick={() => {
                playSound(659.25, 0.3);
                vibrate(100);
              }}
              className="text-[#FFA500] transform transition-all duration-200 hover:scale-125 active:scale-95 animate-bounce"
            >
              🧡
            </button>
          </div>
        </div>

        {/* Lista de Encontros Interativa */}
        <div className="space-y-6">
          {encontros.map((encontro, index) => (
            <Card 
              key={index} 
              className={`
                relative overflow-hidden cursor-pointer
                transform transition-all duration-500 ease-out
                hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]
                ${touchedCards.has(index) ? 'animate-pulse ring-4 ring-[#FFA500]/50' : ''}
                bg-gradient-to-br ${encontro.cor} backdrop-blur-sm
                border-2 border-white/50 hover:border-[#FFA500]/30
                shadow-lg hover:shadow-[#FFA500]/20
              `}
              onClick={() => handleCardTouch(index)}
            >
              {/* Efeito de brilho */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] hover:translate-x-[200%] transition-transform duration-1000"></div>
              
              <div className="relative p-6">
                {/* Header do Card */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FFA500] to-orange-400 flex items-center justify-center text-white font-bold text-xl shadow-lg transform transition-all duration-300 hover:rotate-12">
                      {encontro.data}
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-pink-400 rounded-full flex items-center justify-center text-xs animate-ping">
                      ✨
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#FFA500] mb-1">
                      {encontro.dia}
                    </p>
                  </div>
                  <div className="text-3xl transform transition-all duration-300 hover:scale-125 hover:rotate-12">
                    {encontro.emoji}
                  </div>
                </div>

                {/* Conteúdo Fofo */}
                <div className="space-y-3 ml-2">
                  <div className="group flex items-center gap-3 p-2 rounded-lg bg-white/30 backdrop-blur-sm hover:bg-white/50 transition-all duration-300">
                    <span className="text-[#FFA500] text-lg group-hover:animate-bounce">💖</span>
                    <h3 className="font-bold text-gray-800 group-hover:text-[#FFA500] transition-colors">
                      {encontro.tema}
                    </h3>
                  </div>
                  
                  <div className="group flex items-start gap-3 p-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-all duration-300">
                    <span className="text-[#FFA500] text-lg mt-0.5 group-hover:animate-pulse">📍</span>
                    <p className="text-sm text-gray-700 font-medium">{encontro.local}</p>
                  </div>
                  
                  <div className="group flex items-start gap-3 p-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-all duration-300">
                    <span className="text-[#FFA500] text-lg mt-0.5 group-hover:animate-spin">✨</span>
                    <p className="text-sm text-gray-700 font-medium">{encontro.atividade}</p>
                  </div>
                </div>

                {/* Decoração Sensorial */}
                <div className="flex justify-center mt-6 gap-2">
                  {['⭐', '💫', '✨', '💖', '⭐'].map((emoji, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        playSound(880 + (i * 110), 0.2);
                        vibrate(30);
                      }}
                      className="text-lg transform transition-all duration-200 hover:scale-150 active:scale-75 opacity-60 hover:opacity-100"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Footer Interativo */}
        <div className="text-center py-8 space-y-4">
          <div className="flex justify-center gap-3">
            {['🧡', '💕', '🧡'].map((emoji, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound(523.25 + (i * 220), 0.4);
                  vibrate([100, 50, 100]);
                }}
                className="text-2xl transform transition-all duration-300 hover:scale-125 active:scale-75 animate-pulse"
                style={{ animationDelay: `${i * 0.3}s` }}
              >
                {emoji}
              </button>
            ))}
          </div>
          
          <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-4 border border-[#FFA500]/20">
            <p className="text-sm text-gray-600 italic font-medium mb-3">
              "Cada momento juntos é especial" 💌
            </p>
            <div className="flex justify-center gap-3">
              {['🍦', '🎬', '🌅', '💝'].map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => {
                    playSound(659.25 + (i * 165), 0.3);
                    vibrate(50);
                  }}
                  className="text-xl transform transition-all duration-200 hover:scale-125 hover:rotate-12 active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        
        .animate-float {
          animation: float 4s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default CalendarioRomantico;