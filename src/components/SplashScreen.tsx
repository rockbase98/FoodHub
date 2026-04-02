import { useEffect, useState } from 'react';

interface Props {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<'enter' | 'glow' | 'exit'>('enter');

  useEffect(() => {
    // Scale-in → glow → fade-out
    const t1 = setTimeout(() => setPhase('glow'), 400);
    const t2 = setTimeout(() => setPhase('exit'), 1800);
    const t3 = setTimeout(() => onDone(), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
      style={{
        background: 'radial-gradient(ellipse at 40% 35%, #FF8C42 0%, #FF6B35 45%, #E84A1A 100%)',
        opacity: phase === 'exit' ? 0 : 1,
        transition: phase === 'exit' ? 'opacity 0.4s ease-out' : 'none',
        pointerEvents: phase === 'exit' ? 'none' : 'all',
      }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute top-10 left-8 w-40 h-40 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-20 right-6 w-56 h-56 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Glow rings — animate only in glow phase */}
      {phase === 'glow' && (
        <>
          <div className="absolute w-64 h-64 rounded-full" style={ringStyle(1)} />
          <div className="absolute w-48 h-48 rounded-full" style={ringStyle(2)} />
        </>
      )}

      {/* Logo container */}
      <div
        style={{
          transform: phase === 'enter' ? 'scale(0.4)' : 'scale(1)',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease',
        }}
        className="flex flex-col items-center gap-4"
      >
        {/* Icon circle */}
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.18)',
            border: '2px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span style={{ fontSize: 48, lineHeight: 1 }}>🍽️</span>
        </div>

        {/* Brand name */}
        <div className="text-center">
          <h1
            className="font-black tracking-tight leading-none"
            style={{ color: '#fff', fontSize: 38, letterSpacing: '-0.02em', fontFamily: 'Poppins, sans-serif' }}
          >
            FoodHub
          </h1>
          <p
            className="font-medium mt-1"
            style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, letterSpacing: '0.08em' }}
          >
            CLOUD KITCHEN DELIVERY
          </p>
        </div>
      </div>

      {/* Bottom tagline */}
      <div
        className="absolute bottom-16 text-center"
        style={{
          opacity: phase === 'glow' ? 1 : 0,
          transform: phase === 'glow' ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 0.5s ease 0.2s',
          color: 'rgba(255,255,255,0.65)',
          fontSize: 12,
          letterSpacing: '0.1em',
          fontFamily: 'Poppins, sans-serif',
        }}
      >
        FRESH · FAST · FABULOUS
      </div>
    </div>
  );
}

function ringStyle(ring: 1 | 2): React.CSSProperties {
  const delay = ring === 1 ? '0s' : '0.3s';
  return {
    border: `${ring === 1 ? 2 : 1}px solid rgba(255,255,255,${ring === 1 ? 0.25 : 0.15})`,
    animation: `splash-ring 1.2s ease-out ${delay} infinite`,
    pointerEvents: 'none',
  };
}
