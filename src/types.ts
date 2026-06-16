export type TetriminoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export interface Piece {
  type: TetriminoType;
  matrix: number[][];
  x: number;
  y: number;
}

export interface PlayerScore {
  score: number;
  lines: number;
  level: number;
  date: string;
}

export type ThemeId = 'neon' | 'retro' | 'pastel' | 'mono';

export interface ThemeColors {
  background: string;
  gridBackground: string;
  gridLine: string;
  ghostColor: string;
  colors: Record<TetriminoType, string>;
  accent: string;
  text: string;
  cardBg: string;
}

export const THEMES: Record<ThemeId, { name: string; colors: ThemeColors }> = {
  neon: {
    name: 'Cyber Neon',
    colors: {
      background: 'bg-slate-950',
      gridBackground: '#0b0f19',
      gridLine: 'rgba(56, 189, 248, 0.15)',
      ghostColor: 'rgba(255, 255, 255, 0.15)',
      accent: '#06b6d4',
      text: 'text-slate-100',
      cardBg: 'bg-slate-900/80 border-slate-800',
      colors: {
        I: '#fcfaf8', // Soft Warm White (하얀 고양이)
        O: '#fb923c', // Ginger Cheese Orange (노랑 고양이)
        T: '#292524', // Sleek Charcoal Black (검은 고양이)
        S: '#78716c', // Slate Grey Tabby (회색 고양이)
        Z: '#ebdcb9', // Siamese Light Beige (시암 고양이)
        J: '#7c2d12', // Cocoa Chocolate Brown (브라운 고양이)
        L: '#f59e0b', // Calico Spotted Orange/Amber (얼룩이/삼색이 고양이)
      },
    },
  },
  retro: {
    name: 'Retro NES',
    colors: {
      background: 'bg-zinc-900',
      gridBackground: '#000000',
      gridLine: 'rgba(255, 255, 255, 0.1)',
      ghostColor: 'rgba(255, 255, 255, 0.2)',
      accent: '#e11d48',
      text: 'text-zinc-100',
      cardBg: 'bg-zinc-950/90 border-zinc-800 border-2',
      colors: {
        I: '#3cbcfc', // Retro light blue
        O: '#fcf8fc', // Retro white-gray
        T: '#d82800', // Retro red-orange
        S: '#a4e400', // Retro bright green
        Z: '#e40058', // Retro pink
        J: '#0000bc', // Retro dark blue
        L: '#fca044', // Retro light orange
      },
    },
  },
  pastel: {
    name: 'Pastel Dream',
    colors: {
      background: 'bg-pink-50/50',
      gridBackground: '#ffffff',
      gridLine: 'rgba(244, 63, 94, 0.1)',
      ghostColor: 'rgba(15, 23, 42, 0.08)',
      accent: '#ec4899',
      text: 'text-slate-800',
      cardBg: 'bg-white/80 border-pink-100 shadow-sm shadow-pink-100/50',
      colors: {
        I: '#93c5fd', // Soft Blue
        O: '#fef08a', // Soft Yellow
        T: '#c084fc', // Soft Purple
        S: '#86efac', // Soft Green
        Z: '#fca5a5', // Soft Red
        J: '#a5f3fc', // Soft Cyan
        L: '#fed7aa', // Soft Orange
      },
    },
  },
  mono: {
    name: 'Sleek Mono',
    colors: {
      background: 'bg-neutral-900',
      gridBackground: '#171717',
      gridLine: 'rgba(255, 255, 255, 0.05)',
      ghostColor: 'rgba(255, 255, 255, 0.12)',
      accent: '#ffffff',
      text: 'text-neutral-100',
      cardBg: 'bg-neutral-950/80 border-neutral-800',
      colors: {
        I: '#f5f5f5', // Neutral 100
        O: '#e5e5e5', // Neutral 200
        T: '#d4d4d4', // Neutral 300
        S: '#a3a3a3', // Neutral 400
        Z: '#737373', // Neutral 500
        J: '#525252', // Neutral 600
        L: '#404040', // Neutral 700
      },
    },
  },
};

export const SHAPES: Record<TetriminoType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};
