import { useEffect, useRef, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const STEP_MS = 55;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface FlapTextProps {
  text: string;
  className?: string;
  /** Tamaño de fuente de la aleta, p.ej. "clamp(2rem, 6vw, 4.5rem)" */
  size?: string;
}

/**
 * Título en aletas split-flap: cada letra recorre unos glifos y se asienta.
 * El texto real va en aria-label; las aletas son decorativas.
 */
export const FlapText = ({ text, className = '', size }: FlapTextProps) => {
  const target = text.toUpperCase();
  const [shown, setShown] = useState<string[]>(() => [...target]);
  const [flipping, setFlipping] = useState<boolean[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const chars = [...target];
    if (prefersReducedMotion()) {
      setShown(chars);
      setFlipping([]);
      return;
    }
    setShown(chars.map(c => (c === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])));
    chars.forEach((final, i) => {
      if (final === ' ') return;
      const cycles = 3 + Math.min(i, 8) % 4;
      for (let k = 0; k <= cycles; k++) {
        const id = window.setTimeout(() => {
          setShown(prev => {
            const next = [...prev];
            next[i] = k === cycles ? final : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            return next;
          });
          setFlipping(prev => {
            const next = [...prev];
            next[i] = k !== cycles;
            return next;
          });
        }, i * 28 + k * STEP_MS);
        timers.current.push(id);
      }
    });
    return () => timers.current.forEach(clearTimeout);
  }, [target]);

  // Agrupa por palabra para que el salto de línea no parta palabras
  const words: { chars: string[]; start: number }[] = [];
  let cursor = 0;
  target.split(' ').forEach(w => {
    words.push({ chars: shown.slice(cursor, cursor + w.length), start: cursor });
    cursor += w.length + 1;
  });

  return (
    <span className={`flap ${className}`} style={size ? { fontSize: size } : undefined} role="text" aria-label={text}>
      {words.map((w, wi) => (
        <span className="flap-word" key={wi} aria-hidden="true">
          {w.chars.map((c, ci) => (
            <span key={ci} className={`flap-tile ${flipping[w.start + ci] ? 'is-flipping' : ''}`}>
              {c}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
};

export default FlapText;
