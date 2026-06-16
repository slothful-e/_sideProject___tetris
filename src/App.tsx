import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Play,
  Pause,
  RotateCw,
  Volume2,
  VolumeX,
  Trophy,
  Zap,
  Layers,
  RotateCcw,
  Sparkles,
  Sliders,
  HelpCircle,
  Clock,
  Trash2,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { useTetris } from './hooks/useTetris';
import { THEMES, ThemeId, TetriminoType, SHAPES } from './types';
import { sounds } from './utils/audio';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  decay: number;
}

interface BgCatAnimation {
  id: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  rotation: number;
  color: string;
}

export default function App() {
  const {
    board,
    currentPiece,
    queue,
    holdPiece,
    hasHeld,
    score,
    lines,
    level,
    gameOver,
    isPaused,
    gameStarted,
    highScores,
    clearedLineRows,
    startGame,
    pauseGame,
    rotatePiece,
    movePiece,
    dropPiece,
    hardDrop,
    triggerHold,
    clearHighScores
  } = useTetris();

  const [activeThemeId, setActiveThemeId] = useState<ThemeId>('neon');
  const [muted, setMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const bgCatsRef = useRef<BgCatAnimation[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const themeConfig = THEMES[activeThemeId];
  const { colors: pieceColors, gridBackground, gridLine, ghostColor, text: themeTextColor, accent: themeAccent } = themeConfig.colors;

  // Sync mute state on start
  useEffect(() => {
    document.title = "Premium Arcade Tetris";
    sounds.setMute(muted);
  }, [muted]);

  // Handle key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || isPaused || !gameStarted) {
        if ((e.key === 'r' || e.key === 'R') && gameOver) {
          startGame();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          movePiece(-1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          movePiece(1);
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          rotatePiece(true);
          break;
        case 'z':
        case 'Z':
          e.preventDefault();
          rotatePiece(false);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          dropPiece();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'Shift':
        case 'c':
        case 'C':
          e.preventDefault();
          triggerHold();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          pauseGame();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [movePiece, rotatePiece, dropPiece, hardDrop, triggerHold, pauseGame, startGame, gameOver, isPaused, gameStarted]);

  // Resize canvas helper
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const padding = 0;
    const hAvail = rect.height;
    const wAvail = rect.width;

    const boardRows = board?.length || 13;
    const ratio = boardRows / 10;
    let w = wAvail;
    let h = w * ratio;

    if (h > hAvail) {
      h = hAvail;
      w = h / ratio;
    }

    // Set high-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  // Set up resize observer
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    const observer = new ResizeObserver(() => resizeCanvas());
    if (canvasRef.current?.parentElement) {
      observer.observe(canvasRef.current.parentElement);
    }
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      observer.disconnect();
    };
  }, [resizeCanvas]);

  // Spawn clear line particles based on row index coordinates
  useEffect(() => {
    if (clearedLineRows.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const gridMarginX = 12;
    const gridMarginY = 14;
    const boardW = rect.width - gridMarginX * 2;
    const boardH = rect.height - gridMarginY * 2;
    const cellW = boardW / 10;
    const cellH = boardH / (board?.length || 16);

    const newParticles: Particle[] = [];
    clearedLineRows.forEach((rIndex) => {
      for (let c = 0; c < 10; c++) {
        // Select color from the clearing row, or random active theme piece color
        const typeKeys = Object.keys(pieceColors) as TetriminoType[];
        const randomType = typeKeys[Math.floor(Math.random() * typeKeys.length)];
        const color = pieceColors[randomType];

        const pX = gridMarginX + (c + 0.5) * cellW;
        const pY = gridMarginY + (rIndex + 0.5) * cellH;

        for (let i = 0; i < 4; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 4 + 2;
          newParticles.push({
            id: Math.random() + Date.now(),
            x: pX,
            y: pY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5, // Slightly upward float
            color,
            size: Math.random() * 5 + 2,
            life: 1.0,
            decay: Math.random() * 0.04 + 0.03
          });
        }
      }
    });

    particlesRef.current = [...particlesRef.current, ...newParticles].slice(0, 150);

    // 🐾 Spawn the expanding-fading background cat!
    const boardWReal = canvas.width / (window.devicePixelRatio || 1);
    const midRow = clearedLineRows.reduce((a, b) => a + b, 0) / clearedLineRows.length;
    const catY = gridMarginY + (midRow + 0.5) * cellH;

    bgCatsRef.current.push({
      id: Math.random() + Date.now(),
      x: boardWReal / 2,
      y: catY - 75, // 위치 훨씬 위쪽으로 이동하여 테두리와 겹치지 않고 귀여운 고양이가 잘보이도록 조정
      scale: 0.2,
      opacity: 0.85,
      rotation: (Math.random() - 0.5) * 0.08,
      color: '#22d3ee'
    });
  }, [clearedLineRows, pieceColors]);

  // Render loop
  useEffect(() => {
    let active = true;

    const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.fillStyle = gridBackground;
      ctx.fillRect(0, 0, width, height);

      const gridMarginX = 12;
      const gridMarginY = 14;
      const boardW = width - gridMarginX * 2;
      const boardH = height - gridMarginY * 2;

      // Vertical lines
      ctx.strokeStyle = gridLine;
      ctx.lineWidth = 0.5;
      for (let c = 1; c < 10; c++) {
        ctx.beginPath();
        ctx.moveTo(gridMarginX + (c * boardW) / 10, gridMarginY);
        ctx.lineTo(gridMarginX + (c * boardW) / 10, height - gridMarginY);
        ctx.stroke();
      }

      // Horizontal lines
      const rowsCount = board?.length || 16;
      for (let r = 1; r < rowsCount; r++) {
        ctx.beginPath();
        ctx.moveTo(gridMarginX, gridMarginY + (r * boardH) / rowsCount);
        ctx.lineTo(width - gridMarginX, gridMarginY + (r * boardH) / rowsCount);
        ctx.stroke();
      }

      // Inner game board frame border
      ctx.strokeStyle = gridLine;
      ctx.lineWidth = 1.25;
      ctx.strokeRect(gridMarginX, gridMarginY, boardW, boardH);
    };

    const drawCell = (
      ctx: CanvasRenderingContext2D,
      r: number,
      c: number,
      color: string,
      cellW: number,
      cellH: number,
      theme: ThemeId,
      isGhost = false,
      isHead = false,
      type?: TetriminoType
    ) => {
      const gridMarginX = 12;
      const gridMarginY = 14;
      const pad = 1.5;
      const x = gridMarginX + c * cellW + pad;
      const y = gridMarginY + r * cellH + pad;
      const w = cellW - pad * 2;
      const h = cellH - pad * 2;

      ctx.save();

      if (isGhost) {
        // Draw soft translucent ghost cat shape
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, w, h, 6) : ctx.rect(x, y, w, h);
        ctx.fill();
        ctx.stroke();

        if (isHead) {
          // Draw simple ghost cat ears
          ctx.beginPath();
          // Left Ear
          ctx.moveTo(x + w * 0.12, y + h * 0.2);
          ctx.lineTo(x + w * 0.22, y - h * 0.1);
          ctx.lineTo(x + w * 0.42, y + h * 0.2);
          // Right Ear
          ctx.moveTo(x + w * 0.58, y + h * 0.2);
          ctx.lineTo(x + w * 0.78, y - h * 0.1);
          ctx.lineTo(x + w * 0.88, y + h * 0.20);
          ctx.stroke();

          // Tiny ghost whispers
          ctx.beginPath();
          ctx.moveTo(x + w * 0.15, y + h * 0.55);
          ctx.lineTo(x - w * 0.1, y + h * 0.5);
          ctx.moveTo(x + w * 0.15, y + h * 0.65);
          ctx.lineTo(x - w * 0.12, y + h * 0.65);

          ctx.moveTo(x + w * 0.85, y + h * 0.55);
          ctx.lineTo(x + w * 1.1, y + h * 0.5);
          ctx.moveTo(x + w * 0.85, y + h * 0.65);
          ctx.lineTo(x + w * 1.12, y + h * 0.65);
          ctx.stroke();
        } else {
          // Ghost body - draw a tiny circle inside
          ctx.beginPath();
          ctx.arc(x + w * 0.5, y + h * 0.5, w * 0.15, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        return;
      }

      // Base solid fill
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, w, h, 6) : ctx.rect(x, y, w, h);
      ctx.fill();

      // Theme special glass/bezel accents
      if (theme === 'neon') {
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (theme === 'retro') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(x, y, w, 2);
        ctx.fillRect(x, y, 2, h);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(x, y + h - 2, w, 2);
        ctx.fillRect(x + w - 2, y, 2, h);
      } else if (theme === 'pastel') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else { // mono
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (isHead) {
        // ---- 🐱 CAT HEAD DRAWING ----
        // Draw Ears
        // Siamese cat ('Z') has chocolate brown ears!
        const earColor = type === 'Z' ? '#5c3d2e' : color;
        const innerEarColor = '#fda4af'; // cute soft blush pink

        ctx.fillStyle = earColor;
        // Left Ear
        ctx.beginPath();
        ctx.moveTo(x + w * 0.1, y + h * 0.25);
        ctx.lineTo(x + w * 0.22, y - h * 0.15); // ear tip
        ctx.lineTo(x + w * 0.45, y + h * 0.25);
        ctx.fill();
        // Inner Left Ear
        ctx.fillStyle = innerEarColor;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.16, y + h * 0.22);
        ctx.lineTo(x + w * 0.22, y - h * 0.04);
        ctx.lineTo(x + w * 0.35, y + h * 0.22);
        ctx.fill();

        // Right Ear
        ctx.fillStyle = earColor;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.55, y + h * 0.25);
        ctx.lineTo(x + w * 0.78, y - h * 0.15); // ear tip
        ctx.lineTo(x + w * 0.9, y + h * 0.25);
        ctx.fill();
        // Inner Right Ear
        ctx.fillStyle = innerEarColor;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.65, y + h * 0.22);
        ctx.lineTo(x + w * 0.78, y - h * 0.04);
        ctx.lineTo(x + w * 0.84, y + h * 0.22);
        ctx.fill();

        // Specific Breed details
        if (type === 'Z') {
          // Siamese dark cocoa mask on face
          ctx.fillStyle = '#5c3d2e';
          ctx.beginPath();
          ctx.ellipse ? ctx.ellipse(x + w * 0.5, y + h * 0.58, w * 0.22, h * 0.16, 0, 0, Math.PI * 2) : ctx.arc(x + w * 0.5, y + h * 0.58, w * 0.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (type === 'O' || type === 'S') {
          // Tabby Forehead Marks
          ctx.fillStyle = type === 'O' ? '#c2410c' : '#44403c';
          // Tabby cheeks whiskers stripes
          ctx.beginPath();
          ctx.moveTo(x, y + h * 0.35); ctx.lineTo(x + w * 0.14, y + h * 0.38); ctx.lineTo(x, y + h * 0.45);
          ctx.moveTo(x + w, y + h * 0.35); ctx.lineTo(x + w * 0.86, y + h * 0.38); ctx.lineTo(x + w, y + h * 0.45);
          ctx.fill();

          // Forehead classic tabby 'M'
          ctx.beginPath();
          ctx.moveTo(x + w * 0.44, y + h * 0.22);
          ctx.lineTo(x + w * 0.46, y + h * 0.3);
          ctx.lineTo(x + w * 0.5, y + h * 0.26);
          ctx.lineTo(x + w * 0.54, y + h * 0.3);
          ctx.lineTo(x + w * 0.56, y + h * 0.22);
          ctx.lineTo(x + w * 0.5, y + h * 0.24);
          ctx.closePath();
          ctx.fill();
        } else if (type === 'L') {
          // Calico patching of black and white on head
          ctx.fillStyle = '#292524'; // Black patch
          ctx.beginPath();
          ctx.arc(x + w * 0.2, y + h * 0.32, w * 0.18, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#faf9f6'; // White patch
          ctx.beginPath();
          ctx.arc(x + w * 0.8, y + h * 0.32, w * 0.16, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw Soft pink cheeks
        ctx.fillStyle = 'rgba(254, 113, 169, 0.7)';
        ctx.beginPath();
        ctx.arc(x + w * 0.22, y + h * 0.62, w * 0.09, 0, Math.PI * 2);
        ctx.arc(x + w * 0.78, y + h * 0.62, w * 0.09, 0, Math.PI * 2);
        ctx.fill();

        // Draw Eye sockets / eyes (contrasting colors)
        let customEyeColor = theme === 'mono' ? '#ffffff' : '#0f172a';
        let customPupilColor = '#ffffff';

        if (type === 'T') {
          // Black cat - glowing lime-green/gold eyes!
          customEyeColor = '#bef264';
          customPupilColor = '#0f172a';
        } else if (type === 'Z') {
          // Siamese - gorgeous sky blue eyes!
          customEyeColor = '#38bdf8';
          customPupilColor = '#0f172a';
        }

        ctx.fillStyle = customEyeColor;
        ctx.beginPath();
        ctx.arc(x + w * 0.32, y + h * 0.46, w * 0.09, 0, Math.PI * 2);
        ctx.arc(x + w * 0.68, y + h * 0.46, w * 0.09, 0, Math.PI * 2);
        ctx.fill();

        // Sparkling highlights or slit pupils
        ctx.fillStyle = customPupilColor;
        if (type === 'T') {
          // Slit pupils for black cat
          ctx.beginPath();
          ctx.ellipse ? ctx.ellipse(x + w * 0.32, y + h * 0.46, w * 0.015, h * 0.065, 0, 0, Math.PI * 2) : ctx.arc(x + w * 0.32, y + h * 0.46, w * 0.015, 0, Math.PI * 2);
          ctx.ellipse ? ctx.ellipse(x + w * 0.68, y + h * 0.46, w * 0.015, h * 0.065, 0, 0, Math.PI * 2) : ctx.arc(x + w * 0.68, y + h * 0.46, w * 0.015, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(x + w * 0.30, y + h * 0.43, w * 0.035, 0, Math.PI * 2);
          ctx.arc(x + w * 0.66, y + h * 0.43, w * 0.035, 0, Math.PI * 2);
          ctx.fill();
        }

        // Pink Cat Nose
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.46, y + h * 0.56);
        ctx.lineTo(x + w * 0.54, y + h * 0.56);
        ctx.lineTo(x + w * 0.5, y + h * 0.62);
        ctx.closePath();
        ctx.fill();

        // Cat Mouth (:3)
        ctx.strokeStyle = type === 'T' ? 'rgba(255, 255, 255, 0.7)' : (theme === 'mono' ? '#ffffff' : '#334155');
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(x + w * 0.44, y + h * 0.62, w * 0.065, 0, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + w * 0.56, y + h * 0.62, w * 0.065, 0, Math.PI);
        ctx.stroke();

        // Thin beautiful Whiskers
        ctx.strokeStyle = type === 'T' ? 'rgba(255, 255, 255, 0.6)' : (theme === 'mono' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(15, 23, 42, 0.45)');
        ctx.lineWidth = 0.95;
        ctx.beginPath();
        // Left whispers
        ctx.moveTo(x + w * 0.20, y + h * 0.56);
        ctx.lineTo(x - w * 0.12, y + h * 0.52);
        ctx.moveTo(x + w * 0.20, y + h * 0.62);
        ctx.lineTo(x - w * 0.15, y + h * 0.62);
        ctx.moveTo(x + w * 0.20, y + h * 0.68);
        ctx.lineTo(x - w * 0.12, y + h * 0.72);
        // Right whiskers
        ctx.moveTo(x + w * 0.80, y + h * 0.56);
        ctx.lineTo(x + w * 1.12, y + h * 0.52);
        ctx.moveTo(x + w * 0.80, y + h * 0.62);
        ctx.lineTo(x + w * 1.15, y + h * 0.62);
        ctx.moveTo(x + w * 0.80, y + h * 0.68);
        ctx.lineTo(x + w * 1.12, y + h * 0.72);
        ctx.stroke();

      } else {
        // ---- 🐈 CAT BODY DRAWING ----
        // Specific stripes / spots
        if (type === 'O') {
          // Cheese Tabby Orange stripes
          ctx.fillStyle = 'rgba(234, 88, 12, 0.35)';
        } else if (type === 'S') {
          // Grey Tabby Dark Grey stripes
          ctx.fillStyle = 'rgba(41, 37, 36, 0.3)';
        } else if (type === 'L') {
          // Calico multi-spot patches
          ctx.fillStyle = '#faf9f6'; // White spot
          ctx.beginPath();
          ctx.arc(x + w * 0.25, y + h * 0.35, w * 0.35, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#292524'; // Black spot
          ctx.beginPath();
          ctx.arc(x + w * 0.75, y + h * 0.65, w * 0.35, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Default soft highlight/shading stripe
          ctx.fillStyle = theme === 'mono' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.11)';
        }

        // Draw standard stripes for typical tabby / fallback cats
        if (type !== 'L' && type !== 'I') {
          // Left stripe
          ctx.beginPath();
          ctx.moveTo(x, y + h * 0.2);
          ctx.lineTo(x + w * 0.25, y + h * 0.35);
          ctx.lineTo(x, y + h * 0.5);
          ctx.fill();

          // Right stripe
          ctx.beginPath();
          ctx.moveTo(x + w, y + h * 0.5);
          ctx.lineTo(x + w * 0.75, y + h * 0.65);
          ctx.lineTo(x + w, y + h * 0.8);
          ctx.fill();

          // Center spine stripe
          ctx.beginPath();
          ctx.moveTo(x + w * 0.4, y);
          ctx.lineTo(x + w * 0.5, y + h * 0.18);
          ctx.lineTo(x + w * 0.6, y);
          ctx.fill();
        }

        // Cozy Paw outline inside center
        ctx.fillStyle = type === 'I' ? '#f472b6' : (type === 'T' || type === 'J' ? '#faf9f6' : 'rgba(255, 255, 255, 0.4)');
        
        // Large center pad
        ctx.beginPath();
        ctx.ellipse ? ctx.ellipse(x + w * 0.5, y + h * 0.58, w * 0.15, h * 0.11, 0, 0, Math.PI * 2) : ctx.arc(x + w * 0.5, y + h * 0.58, w * 0.13, 0, Math.PI * 2);
        ctx.fill();

        // 3 mini toe beans
        ctx.beginPath();
        ctx.arc(x + w * 0.33, y + h * 0.38, w * 0.055, 0, Math.PI * 2); // left toe
        ctx.arc(x + w * 0.5, y + h * 0.32, w * 0.06, 0, Math.PI * 2);   // middle toe
        ctx.arc(x + w * 0.67, y + h * 0.38, w * 0.055, 0, Math.PI * 2); // right toe
        ctx.fill();
      }

      ctx.restore();
    };

    const drawBackgroundCat = (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      size: number,
      opacity: number,
      color: string
    ) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 3.5;

      ctx.shadowBlur = 15;
      ctx.shadowColor = color;

      const w = size;
      const h = size * 0.75; // slightly wider/squisher for absolute cuteness
      
      ctx.beginPath();
      // Left cheek upper bend/ear start
      ctx.moveTo(cx - w * 0.32, cy - h * 0.15);
      // Small cute rounded left ear
      ctx.quadraticCurveTo(cx - w * 0.36, cy - h * 0.40, cx - w * 0.28, cy - h * 0.40);
      ctx.quadraticCurveTo(cx - w * 0.22, cy - h * 0.28, cx - w * 0.10, cy - h * 0.18);
      
      // Top of head (gentle modern soft curve)
      ctx.quadraticCurveTo(cx, cy - h * 0.20, cx + w * 0.10, cy - h * 0.18);
      
      // Small cute rounded right ear
      ctx.quadraticCurveTo(cx + w * 0.22, cy - h * 0.28, cx + w * 0.28, cy - h * 0.40);
      ctx.quadraticCurveTo(cx + w * 0.36, cy - h * 0.40, cx + w * 0.32, cy - h * 0.15);
      
      // Super chubby, puffy adorable cheek (right)
      ctx.quadraticCurveTo(cx + w * 0.48, cy + h * 0.12, cx + w * 0.35, cy + h * 0.35);
      // Extremely squishy chin
      ctx.quadraticCurveTo(cx, cy + h * 0.48, cx - w * 0.35, cy + h * 0.35);
      // Super chubby, puffy adorable cheek (left)
      ctx.quadraticCurveTo(cx - w * 0.48, cy + h * 0.12, cx - w * 0.32, cy - h * 0.15);

      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw pink inner ears matching rounded tiny shapes
      ctx.fillStyle = 'rgba(253, 164, 175, 0.35)';
      ctx.beginPath();
      // Left ear inner
      ctx.moveTo(cx - w * 0.26, cy - h * 0.18);
      ctx.quadraticCurveTo(cx - w * 0.30, cy - h * 0.33, cx - w * 0.26, cy - h * 0.33);
      ctx.quadraticCurveTo(cx - w * 0.20, cy - h * 0.25, cx - w * 0.14, cy - h * 0.18);
      ctx.closePath();
      ctx.fill();

      // Right ear inner
      ctx.beginPath();
      ctx.moveTo(cx + w * 0.26, cy - h * 0.18);
      ctx.quadraticCurveTo(cx + w * 0.30, cy - h * 0.33, cx + w * 0.26, cy - h * 0.33);
      ctx.quadraticCurveTo(cx + w * 0.20, cy - h * 0.25, cx + w * 0.14, cy - h * 0.18);
      ctx.closePath();
      ctx.fill();

      // Cute round blushing cheeks
      ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
      ctx.beginPath();
      ctx.arc(cx - w * 0.22, cy + h * 0.08, w * 0.08, 0, Math.PI * 2);
      ctx.arc(cx + w * 0.22, cy + h * 0.08, w * 0.08, 0, Math.PI * 2);
      ctx.fill();

      // Cute happy curved closed sleeping eyes
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx - w * 0.18, cy - h * 0.04, w * 0.06, 0, Math.PI, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + w * 0.18, cy - h * 0.04, w * 0.06, 0, Math.PI, true);
      ctx.stroke();

      // Tiny nose
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.025, cy + h * 0.04);
      ctx.lineTo(cx + w * 0.025, cy + h * 0.04);
      ctx.lineTo(cx, cy + h * 0.07);
      ctx.closePath();
      ctx.fill();

      // Cute cuddly kitty mouth :3
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx - w * 0.03, cy + h * 0.07, w * 0.035, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + w * 0.03, cy + h * 0.07, w * 0.035, 0, Math.PI);
      ctx.stroke();

      // Soft cute whiskers slightly curved
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.24, cy + h * 0.06); ctx.lineTo(cx - w * 0.46, cy + h * 0.03);
      ctx.moveTo(cx - w * 0.24, cy + h * 0.12); ctx.lineTo(cx - w * 0.50, cy + h * 0.12);
      ctx.moveTo(cx - w * 0.24, cy + h * 0.18); ctx.lineTo(cx - w * 0.44, cy + h * 0.21);
      
      ctx.moveTo(cx + w * 0.24, cy + h * 0.06); ctx.lineTo(cx + w * 0.46, cy + h * 0.03);
      ctx.moveTo(cx + w * 0.24, cy + h * 0.12); ctx.lineTo(cx + w * 0.50, cy + h * 0.12);
      ctx.moveTo(cx + w * 0.24, cy + h * 0.18); ctx.lineTo(cx + w * 0.44, cy + h * 0.21);
      ctx.stroke();

      ctx.restore();
    };

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas || !active) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, w, h);

      // Base grid drawing
      drawGrid(ctx, w, h);

      // 0.5. Update and Draw Background Cat Animations
      const bgCats = bgCatsRef.current;
      for (let i = bgCats.length - 1; i >= 0; i--) {
        const cat = bgCats[i];
        cat.scale += 0.065;
        cat.opacity -= 0.022;

        if (cat.opacity <= 0 || cat.scale >= 3.5) {
          bgCats.splice(i, 1);
          continue;
        }

        drawBackgroundCat(ctx, cat.x, cat.y, 140 * cat.scale, cat.opacity, cat.color);
      }

      const gridMarginX = 12;
      const gridMarginY = 14;
      const boardW = w - gridMarginX * 2;
      const boardH = h - gridMarginY * 2;
      const cellW = boardW / 10;
      const cellH = boardH / (board?.length || 13);

      // 1. Draw static grid blocks
      const rowsCount = board?.length || 13;
      for (let r = 0; r < rowsCount; r++) {
        for (let c = 0; c < 10; c++) {
          const cellType = board[r]?.[c] || '';
          if (cellType !== '') {
            const isHead = cellType.endsWith('-head');
            const baseType = cellType.split('-')[0] as TetriminoType;
            const color = pieceColors[baseType] || '#ccc';
            drawCell(ctx, r, c, color, cellW, cellH, activeThemeId, false, isHead, baseType);
          }
        }
      }

      // 2. Draw ghost drop prediction
      if (currentPiece && gameStarted && !gameOver && !isPaused) {
        // Find head of the active falling piece
        let headR = -1;
        let headC = -1;
        for (let r = 0; r < currentPiece.matrix.length; r++) {
          for (let c = 0; c < currentPiece.matrix[r].length; c++) {
            if (currentPiece.matrix[r][c] !== 0) {
              headR = r;
              headC = c;
              break;
            }
          }
          if (headR !== -1) break;
        }

        let ghostY = currentPiece.y;
        while (true) {
          let testY = ghostY + 1;
          let collided = false;

          for (let r = 0; r < currentPiece.matrix.length; r++) {
            for (let c = 0; c < currentPiece.matrix[r].length; c++) {
              if (currentPiece.matrix[r][c] !== 0) {
                const nextX = currentPiece.x + c;
                const nextY = testY + r;
                const rowsCount = board?.length || 13;
                if (nextX < 0 || nextX >= 10 || nextY >= rowsCount || (nextY >= 0 && board[nextY][nextX] !== '')) {
                  collided = true;
                  break;
                }
              }
            }
            if (collided) break;
          }

          if (collided) break;
          ghostY = testY;
        }

        // Draw ghost container
        for (let r = 0; r < currentPiece.matrix.length; r++) {
          for (let c = 0; c < currentPiece.matrix[r].length; c++) {
            if (currentPiece.matrix[r][c] !== 0 && ghostY + r >= 0) {
              const isHead = (r === headR && c === headC);
              drawCell(ctx, ghostY + r, currentPiece.x + c, ghostColor, cellW, cellH, activeThemeId, true, isHead, currentPiece.type);
            }
          }
        }

        // 3. Draw active playing block
        for (let r = 0; r < currentPiece.matrix.length; r++) {
          for (let c = 0; c < currentPiece.matrix[r].length; c++) {
            if (currentPiece.matrix[r][c] !== 0) {
              const activeY = currentPiece.y + r;
              if (activeY >= 0) {
                const color = pieceColors[currentPiece.type];
                const isHead = (r === headR && c === headC);
                drawCell(ctx, activeY, currentPiece.x + c, color, cellW, cellH, activeThemeId, false, isHead, currentPiece.type);
              }
            }
          }
        }
      }

      // 4. Update and Draw Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // subtle mock gravity
        p.life -= p.decay;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        if (activeThemeId === 'neon') {
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [board, currentPiece, gameStarted, gameOver, isPaused, pieceColors, gridBackground, gridLine, ghostColor, activeThemeId]);

  // Mini queues drawer helper
  const drawNextPiecePreview = (type: TetriminoType) => {
    const mat = SHAPES[type];
    const color = pieceColors[type];
    const cols = mat[0]?.length || 4;
    const gridColsClass = cols === 4 ? 'grid-cols-4' : cols === 3 ? 'grid-cols-3' : 'grid-cols-2';
    const sizeClass = cols === 4 ? 'w-12 h-12' : cols === 3 ? 'w-9 h-9' : 'w-6 h-6';

    // Find the head cell coordinate
    let headR = -1;
    let headC = -1;
    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (mat[r][c] !== 0) {
          headR = r;
          headC = c;
          break;
        }
      }
      if (headR !== -1) break;
    }

    return (
      <div className={`grid ${gridColsClass} gap-[1px] ${sizeClass} relative overflow-visible`}>
        {mat.map((rowArr, rIdx) =>
          rowArr.map((val, cIdx) => {
            const isFilled = val !== 0;
            const isHead = isFilled && rIdx === headR && cIdx === headC;
            return (
              <div
                key={`${rIdx}-${cIdx}`}
                className={`w-2.5 h-2.5 transition-all duration-300 relative ${
                  isHead ? 'rounded-t-[3px]' : 'rounded-[1.5px]'
                } ${isFilled ? 'border border-white/50' : ''}`}
                style={{
                  backgroundColor: isFilled ? color : 'transparent'
                }}
              >
                {/* Tiny Ears on the preview Head */}
                {isHead && (
                  <>
                    <div className="absolute -top-[2px] left-[1px] w-0 h-0 border-l-[1px] border-l-transparent border-r-[1px] border-r-transparent border-b-[2px]" style={{ borderBottomColor: type === 'Z' ? '#5c3d2e' : color }} />
                    <div className="absolute -top-[2px] right-[1px] w-0 h-0 border-l-[1px] border-l-transparent border-r-[1px] border-r-transparent border-b-[2px]" style={{ borderBottomColor: type === 'Z' ? '#5c3d2e' : color }} />
                    {/* Cute tiny eyes dots */}
                    <div className={`absolute top-[2.5px] left-[1.5px] w-[1px] h-[1px] rounded-full ${type === 'T' ? 'bg-[#bef264]' : (type === 'Z' ? 'bg-[#38bdf8]' : 'bg-slate-900')}`} />
                    <div className={`absolute top-[2.5px] right-[1.5px] w-[1px] h-[1px] rounded-full ${type === 'T' ? 'bg-[#bef264]' : (type === 'Z' ? 'bg-[#38bdf8]' : 'bg-slate-900')}`} />
                  </>
                )}
                {/* Paw print representation inside body block */}
                {isFilled && !isHead && (
                  <div className="absolute inset-[3px] bg-white/25 rounded-full" />
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen py-3 px-3 sm:py-6 sm:px-4 md:px-8 transition-colors duration-500 flex flex-col items-center justify-center font-sans ${themeConfig.colors.background} ${themeTextColor}`}>
      <div className="w-full max-w-5xl flex flex-col gap-3 sm:gap-6">
        {/* Header bar / Title Panel */}
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5 sm:pb-5">
          <div className="flex items-center gap-3">
            <span className="p-1 w-11 h-11 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <svg viewBox="0 0 100 100" className="w-8 h-8">
                {/* Ears - Slate Grey */}
                <polygon points="12,34 26,4 42,24" fill="#78716c" />
                <polygon points="88,34 74,4 58,24" fill="#78716c" />
                {/* Inner Ears */}
                <polygon points="18,31 26,12 36,24" fill="#fda4af" />
                <polygon points="82,31 74,12 64,24" fill="#fda4af" />
                {/* Head base - Blocky Slate Grey */}
                <rect x="12" y="24" width="76" height="66" rx="10" fill="#78716c" />
                {/* Tabby Forehead Marks 'M' - Darker slate grey */}
                <path d="M44,32 L46,42 L50,37 L54,42 L56,32 L50,35 Z" fill="#44403c" />
                {/* Tabby Cheeks Stripes */}
                <path d="M12,55 L22,57 L12,61 Z" fill="#44403c" />
                <path d="M86,55 L78,57 L88,61 Z" fill="#44403c" />
                {/* Cheeks blush */}
                <ellipse cx="26" cy="62" rx="6" ry="4" fill="#f43f5e" opacity="0.6" />
                <ellipse cx="74" cy="62" rx="6" ry="4" fill="#f43f5e" opacity="0.6" />
                {/* Eye dots */}
                <circle cx="34" cy="48" r="4.5" fill="#0f172a" />
                <circle cx="66" cy="48" r="4.5" fill="#0f172a" />
                <circle cx="32" cy="46" r="1.5" fill="#ffffff" />
                <circle cx="64" cy="46" r="1.5" fill="#ffffff" />
                {/* Pink Nose */}
                <polygon points="47,60 53,60 50,63" fill="#fda4af" />
                {/* Cute mouth :3 */}
                <path d="M 44,63 A 2.5,2.5 0 0,0 50,63 A 2.5,2.5 0 0,0 56,63" fill="none" stroke="#0f172a" strokeWidth="2.1" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-widest uppercase bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
                Catris Blast
              </h1>
              <p className="text-xs opacity-70 font-mono text-cyan-300">Cute Kitty Blocks</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-help-toggle"
              onClick={() => setShowHelp((prev) => !prev)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5 text-xs text-inherit"
              title="How to play"
            >
              <HelpCircle className="w-4 h-4 cursor-pointer" />
              <span className="hidden sm:inline">도움말</span>
            </button>

            <button
              id="btn-mute-toggle"
              onClick={() => setMuted((prev) => !prev)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer text-inherit"
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Info overlay modal */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-xl border bg-slate-900/90 border-cyan-500/20 shadow-xl backdrop-blur-md"
              id="controls-keyboard-guide"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                <span className="font-bold text-sm tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  키보드 조작 가이드 (PC)
                </span>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-xs font-mono hover:text-cyan-400 px-1.5 py-0.5 rounded border border-white/10"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono whitespace-pre-wrap break-all sm:break-keep">
                <p className="leading-relaxed [word-break:keep-all]">
                  <span className="bg-white/10 px-1 rounded text-cyan-400">←</span> /{' '}
                  <span className="bg-white/10 px-1 rounded text-cyan-400">A</span> : 왼쪽 이동
                </p>
                <p className="leading-relaxed [word-break:keep-all]">
                  <span className="bg-white/10 px-1 rounded text-cyan-400">→</span> /{' '}
                  <span className="bg-white/10 px-1 rounded text-cyan-400">D</span> : 오른쪽 이동
                </p>
                <p className="leading-relaxed [word-break:keep-all]">
                  <span className="bg-white/10 px-1 rounded text-cyan-400">↑</span> /{' '}
                  <span className="bg-white/10 px-1 rounded text-cyan-400">W</span> : 순방향 회전
                </p>
                <p className="leading-relaxed [word-break:keep-all]">
                  <span className="bg-white/10 px-1 rounded text-cyan-400">Z</span> : 역방향 회전
                </p>
                <p className="leading-relaxed [word-break:keep-all]">
                  <span className="bg-white/10 px-1 rounded text-cyan-400">↓</span> /{' '}
                  <span className="bg-white/10 px-1 rounded text-cyan-400">S</span> : 빠른 하강
                </p>
                <p className="leading-relaxed [word-break:keep-all]">
                  <span className="bg-white/10 px-1 rounded text-cyan-400">Space</span> : 즉시 하강 (Hard Drop)
                </p>
                <p className="leading-relaxed [word-break:keep-all]">
                  <span className="bg-white/10 px-1 rounded text-cyan-400">Shift</span> /{' '}
                  <span className="bg-white/10 px-1 rounded text-cyan-400">C</span> : 홀드 (보관)
                </p>
                <p className="leading-relaxed [word-break:keep-all]">
                  <span className="bg-white/10 px-1 rounded text-cyan-400">P</span> : 일시 정지
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Grid Playground layout */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-3 sm:gap-5 lg:gap-6 items-start mx-auto w-full">
          {/* Left Column: Stats (top) & Keyboard Shortcuts (bottom) */}
          <div className="contents lg:flex lg:flex-col lg:gap-4 lg:col-span-3 lg:order-1">
            {/* Stats board */}
            <div id="card-stats" className={`p-4 rounded-xl border ${themeConfig.colors.cardBg} flex flex-col gap-4 relative overflow-hidden backdrop-blur-md order-1 lg:order-1`}>
              <div className="absolute top-0 left-0 h-1 w-full bg-cyan-400/20" />
              <div className="text-xs font-mono font-bold tracking-widest uppercase opacity-75">GAMEPLAY STATS</div>

              <div className="grid grid-cols-3 lg:grid-cols-1 gap-2.5">
                <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                  <div className="text-[10px] font-mono uppercase tracking-wider opacity-50 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-cyan-400" /> Score
                  </div>
                  <div className="text-lg font-black tracking-wider text-cyan-400 font-mono mt-0.5">
                    {score}
                  </div>
                </div>

                <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                  <div className="text-[10px] font-mono uppercase tracking-wider opacity-50 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-pink-400" /> Lines
                  </div>
                  <div className="text-lg font-black tracking-wider text-pink-400 font-mono mt-0.5">
                    {lines}
                  </div>
                </div>

                <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                  <div className="text-[10px] font-mono uppercase tracking-wider opacity-50 flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-400" /> Level
                  </div>
                  <div className="text-lg font-black tracking-wider text-amber-400 font-mono mt-0.5">
                    {level}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick help button block */}
            <div className={`p-4 rounded-xl border ${themeConfig.colors.cardBg} hidden lg:flex flex-col gap-2.5 text-xs font-mono backdrop-blur-md order-7 lg:order-2`}>
              <div className="font-bold border-b border-white/5 pb-1 flex items-center gap-1.5 text-cyan-300">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>키보드 퀵 단축키</span>
              </div>
              <ul className="space-y-1.5 opacity-80 text-[11px] whitespace-pre-wrap break-all sm:break-keep">
                <li className="leading-relaxed">• <kbd className="bg-white/10 px-1 rounded text-cyan-300 font-bold">Space</kbd> : 즉시 하강 (Hard Drop)</li>
                <li className="leading-relaxed">• <kbd className="bg-white/10 px-1 rounded text-cyan-300 font-bold">Shift</kbd> / <kbd className="bg-white/10 px-1 rounded text-cyan-300 font-bold">C</kbd> : 홀드 (블럭 보관)</li>
                <li className="leading-relaxed">• <kbd className="bg-white/10 px-1 rounded text-pink-400 font-bold">W</kbd> / <kbd className="bg-white/10 px-1 rounded text-pink-400 font-bold">↑</kbd> : 시계 회전 (CW - Clockwise)</li>
                <li className="leading-relaxed">• <kbd className="bg-white/10 px-1 rounded text-purple-400 font-bold">Z</kbd> : 반시계 회전 (CCW - Counter-Clockwise)</li>
              </ul>
            </div>
          </div>

          {/* Center Column: Game Board (top) & Virtual Keypad / Button Box (bottom) */}
          <div className="contents lg:flex lg:flex-col lg:items-center lg:gap-4 lg:col-span-4 lg:order-2">
            <div className="w-full lg:max-w-sm mx-auto relative aspect-[10/16] rounded-2xl overflow-hidden border-4 border-slate-750 bg-black shadow-2xl flex items-center justify-center order-4 lg:order-none">
              <canvas
                id="tetris-canvas"
                ref={canvasRef}
                className="w-full h-full block"
              />

              {/* Game state screen overlays */}
              <AnimatePresence>
                {!gameStarted && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                    id="overlay-start-screen"
                  >
                    <motion.div
                      initial={{ scale: 0.9, y: 10 }}
                      animate={{ scale: 1, y: 0 }}
                      className="flex flex-col items-center gap-6"
                    >
                      <div className="p-1 w-24 h-24 rounded-xl bg-slate-900 border border-cyan-500/35 flex items-center justify-center relative shadow-lg shadow-cyan-500/10 mb-2">
                        <svg viewBox="0 0 100 100" className="w-16 h-16 animate-bounce">
                          {/* Ears - Soft Warm White */}
                          <polygon points="12,34 26,4 42,24" fill="#fcfaf8" />
                          <polygon points="88,34 74,4 58,24" fill="#fcfaf8" />
                          {/* Inner Ear Pink */}
                          <polygon points="18,31 26,12 36,24" fill="#fda4af" />
                          <polygon points="82,31 74,12 64,24" fill="#fda4af" />
                          {/* Head base - Soft Warm White Blocky */}
                          <rect x="12" y="24" width="76" height="66" rx="10" fill="#fcfaf8" />
                          {/* Cheeks blush */}
                          <ellipse cx="26" cy="62" rx="7" ry="5" fill="#f43f5e" opacity="0.6" />
                          <ellipse cx="74" cy="62" rx="7" ry="5" fill="#f43f5e" opacity="0.6" />
                          {/* Happy awake eyes */}
                          <circle cx="34" cy="48" r="6" fill="#0f172a" />
                          <circle cx="66" cy="48" r="6" fill="#0f172a" />
                          <circle cx="32" cy="46" r="2.5" fill="#ffffff" />
                          <circle cx="64" cy="46" r="2.5" fill="#ffffff" />
                          {/* Cat nose */}
                          <polygon points="47,60 53,60 50,63" fill="#fda4af" />
                          {/* Mouth :3 */}
                          <path d="M 44,63 A 3,3 0 0,0 50,63 A 3,3 0 0,0 56,63" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-3xl font-black tracking-widest uppercase">TETRIS</h2>
                        <p className="text-xs opacity-60 mt-1 font-mono">가장 멋진 테트리스를 즐겨보세요</p>
                      </div>
                      <button
                        id="btn-play-start"
                        onClick={startGame}
                        className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold hover:scale-105 transition-all shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer border border-cyan-400/20"
                      >
                        <Play className="w-5 h-5 fill-white" />
                        시작하기 (PLAY)
                      </button>
                    </motion.div>
                  </motion.div>
                )}

                {gameOver && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                    id="overlay-game-over"
                  >
                    <div className="flex flex-col items-center gap-5">
                      <div className="p-1 w-24 h-24 rounded-xl bg-slate-900 border border-red-500/35 flex items-center justify-center relative shadow-lg shadow-red-500/10 mb-2">
                        <svg viewBox="0 0 100 100" className="w-16 h-16 animate-bounce">
                          {/* Ears - Cocoa Chocolate Brown */}
                          <polygon points="12,34 26,4 42,24" fill="#5c3d2e" />
                          <polygon points="88,34 74,4 58,24" fill="#5c3d2e" />
                          {/* Inner Ear Pink */}
                          <polygon points="18,31 26,12 36,24" fill="#fda4af" />
                          <polygon points="82,31 74,12 64,24" fill="#fda4af" />
                          {/* Head base - Siamese Light Beige Blocky */}
                          <rect x="12" y="24" width="76" height="66" rx="10" fill="#ebdcb9" />
                          {/* Siamese dark cocoa mask on face */}
                          <rect x="22" y="40" width="56" height="38" rx="8" fill="#5c3d2e" opacity="0.95" />
                          {/* Cheeks blush */}
                          <ellipse cx="26" cy="62" rx="7" ry="5" fill="#f43f5e" opacity="0.6" />
                          <ellipse cx="74" cy="62" rx="7" ry="5" fill="#f43f5e" opacity="0.6" />
                          {/* Gorgeous Sky Blue Awake/Sad-looking eyes */}
                          <circle cx="34" cy="48" r="6" fill="#38bdf8" />
                          <circle cx="66" cy="48" r="6" fill="#38bdf8" />
                          {/* Dark pupil slit/circle */}
                          <ellipse cx="34" cy="48" rx="2" ry="4" fill="#0f172a" />
                          <ellipse cx="66" cy="48" rx="2" ry="4" fill="#0f172a" />
                          {/* Sparkling white highlight */}
                          <circle cx="32.5" cy="46" r="1.5" fill="#ffffff" />
                          <circle cx="64.5" cy="46" r="1.5" fill="#ffffff" />
                          {/* Cat nose - Pink Nose */}
                          <polygon points="47,60 53,60 50,63" fill="#fda4af" />
                          {/* Mouth :3 */}
                          <path d="M 44,63 A 3,3 0 0,0 50,63 A 3,3 0 0,0 56,63" fill="none" stroke="#ebdcb9" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-red-500 tracking-wide">GAME OVER</h2>
                        <p className="text-xs opacity-70 mt-1 font-mono">최종 점수: {score} ({level} 레벨)</p>
                      </div>
                      <button
                        id="btn-restart-game"
                        onClick={startGame}
                        className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        다시 도전
                      </button>
                    </div>
                  </motion.div>
                )}

                {isPaused && gameStarted && !gameOver && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                    id="overlay-paused"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-1 w-20 h-20 rounded-xl bg-slate-900 border border-yellow-400/35 flex items-center justify-center relative shadow-lg shadow-yellow-400/10 mb-2">
                        <svg viewBox="0 0 100 100" className="w-14 h-14 animate-bounce">
                          {/* Ears - Slate Grey */}
                          <polygon points="12,34 26,4 42,24" fill="#78716c" />
                          <polygon points="88,34 74,4 58,24" fill="#78716c" />
                          {/* Inner Ear Pink */}
                          <polygon points="18,31 26,12 36,24" fill="#fda4af" />
                          <polygon points="82,31 74,12 64,24" fill="#fda4af" />
                          {/* Head base - Slate Grey Blocky */}
                          <rect x="12" y="24" width="76" height="66" rx="10" fill="#78716c" />
                          {/* Tabby Forehead Marks 'M' - Darker slate grey */}
                          <path d="M44,32 L46,42 L50,37 L54,42 L56,32 L50,35 Z" fill="#44403c" />
                          {/* Tabby Cheeks Stripes */}
                          <path d="M12,55 L22,57 L12,61 Z" fill="#44403c" />
                          <path d="M86,55 L76,57 L86,61 Z" fill="#44403c" />
                          {/* Cheeks blush */}
                          <ellipse cx="26" cy="62" rx="7" ry="5" fill="#f43f5e" opacity="0.6" />
                          <ellipse cx="74" cy="62" rx="7" ry="5" fill="#f43f5e" opacity="0.6" />
                          {/* Sleeping curved eyes (ideal for RESTTIME pause) */}
                          <path d="M26,51 Q34,57 40,51" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                          <path d="M60,51 Q66,57 74,51" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                          {/* Cat nose */}
                          <polygon points="47,60 53,60 50,63" fill="#fda4af" />
                          {/* Mouth :3 */}
                          <path d="M 44,63 A 3,3 0 0,0 50,63 A 3,3 0 0,0 56,63" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-2xl font-black tracking-widest text-yellow-400 animate-pulse">RESTTIME</h2>
                        <p className="text-xs opacity-80 font-mono text-yellow-400/80">일시 정지 상태입니다</p>
                      </div>
                      <button
                        id="btn-resume-overlay"
                        onClick={pauseGame}
                        className="px-6 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold tracking-wider transition-all text-xs shadow-md shadow-yellow-400/20 active:scale-95 cursor-pointer"
                      >
                        계속하기
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Middle bottom Touch/Mobile Virtual Controller Keypad & Buttons */}
            {gameStarted && !gameOver && (
              <div className="order-5 lg:order-none w-full lg:max-w-sm mx-auto flex flex-col gap-3">
                <div id="vkey-pad" className="w-full p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2 sm:gap-3 shadow-xl backdrop-blur-md">
                  {/* D-Pad controls and CW roll */}
                  <div className="grid grid-cols-4 gap-2 h-14 sm:h-24 md:h-28 items-center">
                    {/* Left Key */}
                    <button
                      id="vkey-left"
                      onPointerDown={(e) => { e.preventDefault(); movePiece(-1); }}
                      className="h-full rounded-xl bg-slate-800/80 border border-white/10 active:bg-cyan-500/20 active:border-cyan-500/55 flex items-center justify-center transition-all shadow-lg active:scale-95 touch-none"
                    >
                      <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                    </button>

                    {/* soft Down Key */}
                    <button
                      id="vkey-drop"
                      onPointerDown={(e) => { e.preventDefault(); dropPiece(); }}
                      className="h-full rounded-xl bg-slate-800/80 border border-white/10 active:bg-cyan-500/20 active:border-cyan-500/55 flex items-center justify-center transition-all shadow-lg active:scale-95 touch-none"
                    >
                      <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                    </button>

                    {/* Right Key */}
                    <button
                      id="vkey-right"
                      onPointerDown={(e) => { e.preventDefault(); movePiece(1); }}
                      className="h-full rounded-xl bg-slate-800/80 border border-white/10 active:bg-cyan-500/20 active:border-cyan-500/55 flex items-center justify-center transition-all shadow-lg active:scale-95 touch-none"
                    >
                      <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                    </button>

                    {/* CW Rotate Main */}
                    <button
                      id="vkey-rotate-cw"
                      onPointerDown={(e) => { e.preventDefault(); rotatePiece(true); }}
                      className="h-full rounded-xl bg-slate-800/80 border border-white/10 active:bg-purple-500/25 active:border-purple-400/55 flex flex-col items-center justify-center gap-0.5 transition-all shadow-lg active:scale-95 touch-none"
                    >
                      <RotateCw className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 animate-spin-slow" />
                      <span className="text-xs font-bold uppercase font-mono tracking-wider text-purple-300">CW</span>
                      <span className="text-[7px] sm:text-[9px] opacity-70 font-sans text-purple-200 hidden sm:block">시계 회전</span>
                    </button>
                  </div>

                  {/* Top row of utility/special drop */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      id="vkey-hold"
                      onPointerDown={(e) => { e.preventDefault(); triggerHold(); }}
                      className="py-2 sm:py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono tracking-wider active:scale-95 transition-all text-inherit touch-none"
                    >
                      HOLD (보관)
                    </button>
                    <button
                      id="vkey-rotate-ccw"
                      onPointerDown={(e) => { e.preventDefault(); rotatePiece(false); }}
                      className="py-2 sm:py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono tracking-wider active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5 text-inherit touch-none"
                    >
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400" />
                        <span className="font-bold">CCW</span>
                      </div>
                      <span className="text-[7px] sm:text-[9px] opacity-70 font-sans text-pink-300 hidden sm:block">반시계 회전</span>
                    </button>
                    <button
                      id="vkey-hard"
                      onPointerDown={(e) => { e.preventDefault(); hardDrop(); }}
                      className="py-2 sm:py-3 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-black font-mono tracking-wider active:scale-95 transition-all shadow-md shadow-pink-500/10 touch-none"
                    >
                      HARD DROP
                    </button>
                  </div>
                </div>

                {/* Pause, Restart Action Buttons - Placed BELOW the button container */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-panel-pause"
                    onClick={pauseGame}
                    className="py-2 sm:py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all text-inherit cursor-pointer"
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5 text-yellow-400" /> : <Pause className="w-3.5 h-3.5 text-yellow-400" />}
                    <span>{isPaused ? 'Resume' : 'Pause'}</span>
                  </button>
                  <button
                    id="btn-panel-restart"
                    onClick={startGame}
                    className="py-2 sm:py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all text-inherit cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Restart</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Hold, Next queue panel, and High scores */}
          <div className="contents lg:flex lg:flex-col lg:gap-4 lg:col-span-3 lg:order-3">
            {/* Hold and next piece preview queue - combined side-by-side on mobile, stacked on lg */}
            <div className="order-2 lg:order-none flex flex-row-reverse lg:flex-col gap-2.5 sm:gap-5 w-full">
              {/* Holdpiece block */}
              <div id="card-hold" className={`p-2.5 sm:p-4 rounded-xl border ${themeConfig.colors.cardBg} flex flex-col items-center justify-center gap-1.5 sm:gap-3 relative overflow-hidden backdrop-blur-md w-[28%] lg:w-full`}>
                <div className="absolute top-0 left-0 h-1 w-full bg-cyan-400/20" />
                <div className="text-xs font-mono font-bold tracking-widest uppercase opacity-75">HOLD</div>
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg bg-black/20 flex items-center justify-center relative border border-white/5">
                  {holdPiece ? (
                    <div className="scale-90 sm:scale-125">{drawNextPiecePreview(holdPiece)}</div>
                  ) : (
                    <span className="text-xs opacity-25 font-mono">Empty</span>
                  )}
                </div>
                {hasHeld && (
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-red-400 font-bold text-center">Already Swapped</span>
                )}
              </div>

              {/* Next queue panel */}
              <div id="card-next-queue" className={`p-2.5 sm:p-4 rounded-xl border ${themeConfig.colors.cardBg} flex flex-col items-center justify-center gap-1.5 sm:gap-3.5 relative overflow-hidden backdrop-blur-md w-[72%] lg:w-full`}>
                <div className="absolute top-0 left-0 h-1 w-full bg-cyan-400/20" />
                <div className="text-xs font-mono font-bold tracking-widest uppercase opacity-75">NEXT BLOCKS</div>

                <div className="flex flex-row lg:flex-col gap-0.5 xs:gap-1 lg:gap-4 items-center justify-around w-full">
                  {/* Next 1 */}
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] uppercase tracking-widest opacity-50 font-mono">1st</span>
                    <div className="w-[68px] h-[68px] sm:w-[88px] sm:h-[88px] rounded-md bg-black/25 border border-white/5 flex items-center justify-center">
                      <div className="scale-130 xs:scale-140 sm:scale-[1.55]">{queue.length > 0 ? drawNextPiecePreview(queue[0]) : null}</div>
                    </div>
                  </div>

                  {/* Next 2 */}
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] uppercase tracking-widest opacity-50 font-mono">2nd</span>
                    <div className="w-[68px] h-[68px] sm:w-[88px] sm:h-[88px] rounded-md bg-black/25 border border-white/5 flex items-center justify-center">
                      <div className="scale-130 xs:scale-140 sm:scale-[1.55]">{queue.length > 1 ? drawNextPiecePreview(queue[1]) : null}</div>
                    </div>
                  </div>

                  {/* Next 3 */}
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] uppercase tracking-widest opacity-50 font-mono">3rd</span>
                    <div className="w-[68px] h-[68px] sm:w-[88px] sm:h-[88px] rounded-md bg-black/25 border border-white/5 flex items-center justify-center">
                      <div className="scale-130 xs:scale-140 sm:scale-[1.55]">{queue.length > 2 ? drawNextPiecePreview(queue[2]) : null}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Local High Scores Container - placed at the very bottom of the grid */}
            <div id="card-high-scores" className={`p-4 rounded-xl border ${themeConfig.colors.cardBg} flex flex-col gap-3 relative overflow-hidden backdrop-blur-md order-6 w-full mt-4 lg:mt-0`}>
              <div className="absolute top-0 left-0 h-1 w-full bg-cyan-400/20" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold tracking-widest uppercase opacity-75">HIGH SCORES</span>
                {highScores.length > 0 && (
                  <button
                    onClick={clearHighScores}
                    className="p-1 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                    title="Clear scores"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {highScores.length === 0 ? (
                <div className="text-xs font-mono opacity-40 py-2 text-center">No scores yet !</div>
              ) : (
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {highScores.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs font-mono p-1.5 rounded bg-black/10 border border-white/5"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-cyan-400 font-bold">{i + 1}.</span>
                        <span>Level {h.level}</span>
                      </span>
                      <span className="font-bold text-yellow-400">{h.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
