import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface RocketParticle {
  id: number;
  x: number;
  delay: number;
  duration: number;
}

interface ConfettiParticle {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
  rotation: number;
}

interface SparkleParticle {
  id: number;
  x: number;
  y: number;
  delay: number;
}

interface RocketCelebrationProps {
  show: boolean;
  intensity?: number;
}

export function RocketCelebration({ show, intensity = 1 }: RocketCelebrationProps) {
  const [rockets, setRockets] = useState<RocketParticle[]>([]);
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [sparkles, setSparkles] = useState<SparkleParticle[]>([]);

  useEffect(() => {
    if (show) {
      const rocketCount = Math.min(3 + Math.floor(intensity * 2), 8);
      const newRockets: RocketParticle[] = [];
      for (let i = 0; i < rocketCount; i++) {
        newRockets.push({
          id: i,
          x: 10 + Math.random() * 80,
          delay: Math.random() * 0.5,
          duration: 1 + Math.random() * 0.5
        });
      }
      setRockets(newRockets);

      const confettiCount = Math.min(20 + Math.floor(intensity * 10), 50);
      const colors = ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#ef4444'];
      const newConfetti: ConfettiParticle[] = [];
      for (let i = 0; i < confettiCount; i++) {
        newConfetti.push({
          id: i,
          x: Math.random() * 100,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * 1,
          size: 4 + Math.random() * 8,
          rotation: Math.random() * 360
        });
      }
      setConfetti(newConfetti);

      const sparkleCount = 15;
      const newSparkles: SparkleParticle[] = [];
      for (let i = 0; i < sparkleCount; i++) {
        newSparkles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          delay: Math.random() * 1.5
        });
      }
      setSparkles(newSparkles);

      const timer = setTimeout(() => {
        setRockets([]);
        setConfetti([]);
        setSparkles([]);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, intensity]);

  if (!show && rockets.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {rockets.map((rocket) => (
          <motion.div
            key={`rocket-${rocket.id}`}
            initial={{ y: '120vh', x: `${rocket.x}%`, opacity: 1, scale: 1 }}
            animate={{ 
              y: '-20vh', 
              opacity: [1, 1, 0],
              scale: [1, 1.2, 0.8]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: rocket.duration, 
              delay: rocket.delay,
              ease: "easeOut"
            }}
            className="absolute text-4xl"
            style={{ left: `${rocket.x}%` }}
          >
            <motion.div
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 0.2, repeat: Infinity }}
            >
              🚀
            </motion.div>
            <motion.div 
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-4 h-20"
              style={{
                background: 'linear-gradient(to bottom, rgba(249, 115, 22, 0.8), rgba(234, 88, 12, 0.4), transparent)'
              }}
              animate={{ opacity: [1, 0.5, 1], scaleY: [1, 1.2, 1] }}
              transition={{ duration: 0.1, repeat: Infinity }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {confetti.map((particle) => (
          <motion.div
            key={`confetti-${particle.id}`}
            initial={{ y: -20, x: `${particle.x}%`, opacity: 1, rotate: 0 }}
            animate={{ 
              y: '110vh',
              rotate: particle.rotation + 720,
              opacity: [1, 1, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 3 + Math.random(),
              delay: particle.delay,
              ease: "linear"
            }}
            className="absolute"
            style={{ 
              left: `${particle.x}%`,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px'
            }}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {sparkles.map((sparkle) => (
          <motion.div
            key={`sparkle-${sparkle.id}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0]
            }}
            transition={{ 
              duration: 0.8,
              delay: sparkle.delay,
              ease: "easeOut"
            }}
            className="absolute"
            style={{ left: `${sparkle.x}%`, top: `${sparkle.y}%` }}
          >
            <Sparkles className="h-6 w-6 text-yellow-400" />
          </motion.div>
        ))}
      </AnimatePresence>

      {rockets.length > 0 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.5, 2], opacity: [0, 0.8, 0] }}
          transition={{ duration: 1, delay: 0.3 }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="w-40 h-40 rounded-full bg-gradient-to-r from-emerald-500/30 via-yellow-500/30 to-orange-500/30 blur-xl" />
        </motion.div>
      )}
    </div>
  );
}
