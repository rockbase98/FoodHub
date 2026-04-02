import { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';

interface Props {
  onDone: () => void;
}

const SLIDES = [
  {
    emoji: '🍛',
    title: 'Order Anything',
    subtitle: 'Biryani to Burgers',
    description:
      'Discover hundreds of cloud kitchens near you. Browse menus, filter by cuisine, and order your favourites in seconds.',
    bg: 'from-orange-500 to-red-500',
    blob: '#FF8C42',
    dot: '#FF6B35',
    accent: 'rgba(255,107,53,0.15)',
  },
  {
    emoji: '📍',
    title: 'Track Live',
    subtitle: 'Every step of the way',
    description:
      'Watch your order move in real-time — from kitchen to your door. See the exact location of your delivery partner on a live map.',
    bg: 'from-violet-500 to-purple-700',
    blob: '#9B59D9',
    dot: '#7C3AED',
    accent: 'rgba(124,58,237,0.15)',
  },
  {
    emoji: '⚡',
    title: 'Fast Delivery',
    subtitle: 'Hot food, every time',
    description:
      'Our optimised kitchen coordination ensures your food arrives hot and fresh, even when ordering from multiple restaurants at once.',
    bg: 'from-emerald-400 to-teal-600',
    blob: '#2DD4BF',
    dot: '#0D9488',
    accent: 'rgba(13,148,136,0.15)',
  },
];

export default function OnboardingScreen({ onDone }: Props) {
  const [current, setCurrent] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  const goNext = () => {
    if (isLast) { finish(); return; }
    setDir(1);
    setExiting(true);
    setTimeout(() => { setCurrent((p) => p + 1); setExiting(false); }, 220);
  };

  const finish = () => {
    localStorage.setItem('foodhub_onboarded', '1');
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col bg-white select-none overflow-hidden">

      {/* Hero illustration area */}
      <div
        className={`relative flex-shrink-0 flex flex-col items-center justify-end bg-gradient-to-br ${slide.bg}`}
        style={{ height: '55%', transition: 'background 0.5s ease' }}
      >
        {/* Blob decoration */}
        <div
          className="absolute top-6 right-8 w-40 h-40 rounded-full"
          style={{ background: `radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)` }}
        />
        <div
          className="absolute bottom-14 left-4 w-24 h-24 rounded-full"
          style={{ background: `radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)` }}
        />

        {/* Skip button */}
        {!isLast && (
          <button
            onClick={finish}
            className="absolute top-8 right-4 flex items-center gap-1 px-3 py-1.5 rounded-full tap-highlight"
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.9)',
              fontSize: 12,
              fontWeight: 600,
              minHeight: 32,
              minWidth: 32,
            }}
          >
            Skip <X className="h-3 w-3" />
          </button>
        )}

        {/* Big emoji */}
        <div
          key={current}
          style={{
            fontSize: 96,
            lineHeight: 1,
            marginBottom: 32,
            animation: exiting
              ? `ob-exit-${dir > 0 ? 'left' : 'right'} 0.22s ease-in forwards`
              : 'ob-enter 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            display: 'inline-block',
          }}
        >
          {slide.emoji}
        </div>

        {/* Wave bottom */}
        <svg
          viewBox="0 0 430 80"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 right-0 w-full"
          style={{ height: 60, display: 'block' }}
        >
          <path d="M0 80 Q215 0 430 80 L430 80 L0 80 Z" fill="white" />
        </svg>
      </div>

      {/* Content area */}
      <div
        className="flex-1 flex flex-col items-center justify-between px-8 pt-6 pb-10"
        style={{ background: '#fff' }}
      >
        {/* Text block */}
        <div
          key={`text-${current}`}
          className="text-center w-full"
          style={{ animation: exiting ? 'ob-fade-out 0.22s ease forwards' : 'ob-fade-in 0.35s ease 0.1s both' }}
        >
          <p
            className="font-semibold mb-0.5"
            style={{ color: slide.dot, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}
          >
            {slide.subtitle}
          </p>
          <h2
            className="font-black leading-tight mb-3"
            style={{ fontSize: 28, color: '#111', fontFamily: 'Poppins, sans-serif' }}
          >
            {slide.title}
          </h2>
          <p
            className="leading-relaxed mx-auto"
            style={{ fontSize: 14, color: '#666', maxWidth: 300, lineHeight: 1.65 }}
          >
            {slide.description}
          </p>
        </div>

        {/* Dots + CTA */}
        <div className="w-full flex flex-col items-center gap-6">
          {/* Dot indicators */}
          <div className="flex gap-2 items-center">
            {SLIDES.map((s, i) => (
              <button
                key={i}
                onClick={() => { setDir(i > current ? 1 : -1); setCurrent(i); }}
                style={{
                  width: i === current ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === current ? slide.dot : '#e0e0e0',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minHeight: 'unset',
                  minWidth: 'unset',
                  padding: 0,
                }}
              />
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={goNext}
            className="w-full max-w-xs flex items-center justify-center gap-2 font-bold rounded-2xl tap-highlight"
            style={{
              background: `linear-gradient(135deg, ${slide.blob}, ${slide.dot})`,
              color: '#fff',
              height: 52,
              fontSize: 15,
              boxShadow: `0 8px 24px ${slide.accent}`,
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.4s ease, box-shadow 0.4s ease',
              minHeight: 52,
            }}
          >
            {isLast ? "Let's Eat! 🍽️" : 'Next'}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Keyframe styles injected inline */}
      <style>{`
        @keyframes ob-enter {
          from { transform: scale(0.5) translateY(20px); opacity: 0; }
          to   { transform: scale(1) translateY(0);    opacity: 1; }
        }
        @keyframes ob-exit-left {
          to { transform: translateX(-60px) scale(0.85); opacity: 0; }
        }
        @keyframes ob-exit-right {
          to { transform: translateX(60px) scale(0.85); opacity: 0; }
        }
        @keyframes ob-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ob-fade-out {
          to { opacity: 0; transform: translateY(-8px); }
        }
        @keyframes splash-ring {
          0%   { transform: scale(0.8); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
