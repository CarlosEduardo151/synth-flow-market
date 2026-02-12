import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Node {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Connection {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
}

export function NeuralNetworkBackground() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const nodeCount = 25;
    const initialNodes = Array.from({ length: nodeCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.05,
      vy: (Math.random() - 0.5) * 0.05
    }));
    setNodes(initialNodes);

    const animate = () => {
      setNodes(prevNodes => {
        const newNodes = prevNodes.map(node => {
          let { x, y, vx, vy } = node;
          
          x += vx;
          y += vy;
          
          if (x <= 0 || x >= 100) vx = -vx;
          if (y <= 0 || y >= 100) vy = -vy;
          
          x = Math.max(0, Math.min(100, x));
          y = Math.max(0, Math.min(100, y));
          
          return { ...node, x, y, vx, vy };
        });

        const newConnections: Connection[] = [];
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[i].x - newNodes[j].x;
            const dy = newNodes[i].y - newNodes[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 20) {
              newConnections.push({
                id: `${i}-${j}`,
                x1: newNodes[i].x,
                y1: newNodes[i].y,
                x2: newNodes[j].x,
                y2: newNodes[j].y,
                opacity: 1 - distance / 20
              });
            }
          }
        }
        setConnections(newConnections);
        
        return newNodes;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <svg className="w-full h-full opacity-30">
        <defs>
          <linearGradient id="neural-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
            <stop offset="50%" stopColor="hsl(142 76% 36%)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {connections.map(conn => (
          <line
            key={conn.id}
            x1={`${conn.x1}%`}
            y1={`${conn.y1}%`}
            x2={`${conn.x2}%`}
            y2={`${conn.y2}%`}
            stroke="url(#neural-gradient)"
            strokeWidth="1"
            opacity={conn.opacity * 0.5}
            filter="url(#glow)"
          />
        ))}

        {nodes.map(node => (
          <g key={node.id}>
            <circle
              cx={`${node.x}%`}
              cy={`${node.y}%`}
              r="3"
              fill="hsl(var(--primary))"
              opacity="0.6"
              filter="url(#glow)"
            />
            <circle
              cx={`${node.x}%`}
              cy={`${node.y}%`}
              r="6"
              fill="hsl(var(--primary))"
              opacity="0.2"
            >
              <animate
                attributeName="r"
                values="6;8;6"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.2;0.4;0.2"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        ))}
      </svg>

      <div className="absolute inset-0">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`data-line-${i}`}
            className="absolute h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
            style={{
              top: `${15 + i * 10}%`,
              width: '100%',
            }}
            animate={{
              x: ['-100%', '100%'],
              opacity: [0, 0.6, 0]
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.8,
              ease: 'linear'
            }}
          />
        ))}
      </div>

      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`pulse-${i}`}
          className="absolute rounded-full border border-primary/20"
          style={{
            left: `${20 + i * 15}%`,
            top: `${30 + (i % 3) * 20}%`,
            width: 100 + i * 20,
            height: 100 + i * 20,
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            delay: i * 0.5
          }}
        />
      ))}
    </div>
  );
}

export function TradingBackground({ isRunning }: { isRunning: boolean }) {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <NeuralNetworkBackground />
      
      {isRunning && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-2 h-2 rounded-full bg-emerald-500/30"
              style={{ left: `${20 + i * 15}%`, bottom: '10%' }}
              animate={{ 
                y: [0, -100, -200],
                opacity: [0.5, 0.8, 0],
                scale: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: 3 + i * 0.5, 
                repeat: Infinity, 
                delay: i * 0.8,
                ease: "easeOut"
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
