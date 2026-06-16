import { useState, useEffect, useRef, useCallback } from 'react';
import { TetriminoType, Piece, SHAPES, THEMES, ThemeId } from '../types';
import { sounds } from '../utils/audio';

const COLS = 10;
const ROWS = 16;

const KICKS = [
  { x: 0, y: 0 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -2, y: 0 },
  { x: 2, y: 0 }
];

function generateBag(): TetriminoType[] {
  const pieces: TetriminoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  const shuffled = [...pieces];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

export function useTetris() {
  const [board, setBoard] = useState<string[][]>(() =>
    Array.from({ length: ROWS }, () => Array(COLS).fill(''))
  );
  
  // High scores representation
  const [highScores, setHighScores] = useState<{ score: number; level: number; date: string }[]>(() => {
    try {
      const stored = localStorage.getItem('tetris_high_scores');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [queue, setQueue] = useState<TetriminoType[]>(() => [
    ...generateBag(),
    ...generateBag()
  ]);

  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [holdPiece, setHoldPiece] = useState<TetriminoType | null>(null);
  const [hasHeld, setHasHeld] = useState(false);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Use refs in simulation loop to prevent closures over active states
  const boardRef = useRef(board);
  boardRef.current = board;
  
  const currentPieceRef = useRef(currentPiece);
  currentPieceRef.current = currentPiece;

  const queueRef = useRef(queue);
  queueRef.current = queue;

  const holdPieceRef = useRef(holdPiece);
  holdPieceRef.current = holdPiece;

  const hasHeldRef = useRef(hasHeld);
  hasHeldRef.current = hasHeld;

  // Particle emission collector (communicates with visual layer)
  const [clearedLineRows, setClearedLineRows] = useState<number[]>([]);

  const checkCollision = useCallback((matrix: number[][], offset: { x: number; y: number }, testBoard: string[][]) => {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const nextX = offset.x + c;
          const nextY = offset.y + r;

          if (nextX < 0 || nextX >= COLS || nextY >= ROWS) {
            return true;
          }

          if (nextY >= 0 && testBoard[nextY][nextX] !== '') {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  const spawnPiece = useCallback((pieceQueue: TetriminoType[], currentBoard: string[][]) => {
    const nextType = pieceQueue[0];
    const remainingQueue = pieceQueue.slice(1);
    
    // Auto-fill queue if running low
    const updatedQueue = remainingQueue.length < 7 
      ? [...remainingQueue, ...generateBag()]
      : remainingQueue;

    setQueue(updatedQueue);

    const matrix = SHAPES[nextType];
    const width = matrix[0].length;
    // Position centered at top
    const startX = Math.floor((COLS - width) / 2);
    const startY = 0;

    const newPiece: Piece = {
      type: nextType,
      matrix,
      x: startX,
      y: startY
    };

    if (checkCollision(matrix, { x: startX, y: startY }, currentBoard)) {
      setGameOver(true);
      sounds.playGameOver();
      
      // Save highscore
      setHighScores((prev) => {
        const timestamp = new Date().toLocaleDateString();
        const updated = [...prev, { score: score, level: level, date: timestamp }]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        localStorage.setItem('tetris_high_scores', JSON.stringify(updated));
        return updated;
      });
      return;
    }

    setCurrentPiece(newPiece);
    setHasHeld(false);
  }, [checkCollision, level, score]);

  const startGame = useCallback(() => {
    const initialBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(''));
    const initialQueue = [...generateBag(), ...generateBag()];
    
    setBoard(initialBoard);
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setHoldPiece(null);
    setHasHeld(false);
    setIsPaused(false);
    setGameStarted(true);
    setClearedLineRows([]);
    
    spawnPiece(initialQueue, initialBoard);
  }, [spawnPiece]);

  const pauseGame = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const rotatePiece = useCallback((clockwise: boolean = true) => {
    if (!currentPieceRef.current || gameOver || isPaused || !gameStarted) return;

    const p = currentPieceRef.current;
    const n = p.matrix.length;
    
    // Rotate matrix
    const rotated = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (clockwise) {
          rotated[c][n - 1 - r] = p.matrix[r][c];
        } else {
          rotated[n - 1 - c][r] = p.matrix[r][c];
        }
      }
    }

    // Attempt kicks
    for (const kick of KICKS) {
      const nextX = p.x + kick.x;
      const nextY = p.y + kick.y;

      if (!checkCollision(rotated, { x: nextX, y: nextY }, boardRef.current)) {
        setCurrentPiece({
          ...p,
          matrix: rotated,
          x: nextX,
          y: nextY
        });
        sounds.playRotate();
        return;
      }
    }
  }, [checkCollision, gameOver, isPaused, gameStarted]);

  const movePiece = useCallback((dir: number) => {
    if (!currentPieceRef.current || gameOver || isPaused || !gameStarted) return false;

    const p = currentPieceRef.current;
    const nextX = p.x + dir;

    if (!checkCollision(p.matrix, { x: nextX, y: p.y }, boardRef.current)) {
      setCurrentPiece({ ...p, x: nextX });
      sounds.playMove();
      return true;
    }
    return false;
  }, [checkCollision, gameOver, isPaused, gameStarted]);

  const mergePieceToBoard = useCallback((piece: Piece, activeBoard: string[][]) => {
    const updatedBoard = activeBoard.map(row => [...row]);
    
    // Find the coordinate of the head (top-left active block of the piece)
    let headR = -1;
    let headC = -1;
    for (let r = 0; r < piece.matrix.length; r++) {
      for (let c = 0; c < piece.matrix[r].length; c++) {
        if (piece.matrix[r][c] !== 0) {
          headR = r;
          headC = c;
          break;
        }
      }
      if (headR !== -1) break;
    }

    for (let r = 0; r < piece.matrix.length; r++) {
      for (let c = 0; c < piece.matrix[r].length; c++) {
        if (piece.matrix[r][c] !== 0) {
          const boardY = piece.y + r;
          const boardX = piece.x + c;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            const isHead = (r === headR && c === headC);
            updatedBoard[boardY][boardX] = `${piece.type}${isHead ? '-head' : '-body'}`;
          }
        }
      }
    }

    // Check line clears
    const clearedRows: number[] = [];
    const filteredBoard = updatedBoard.filter((row, index) => {
      const isFull = row.every(cell => cell !== '');
      if (isFull) {
        clearedRows.push(index);
      }
      return !isFull;
    });

    const linesCleared = clearedRows.length;
    let newBoard = filteredBoard;
    
    if (linesCleared > 0) {
      // Create empty rows at the top
      const emptyRows = Array.from({ length: linesCleared }, () => Array(COLS).fill(''));
      newBoard = [...emptyRows, ...filteredBoard];

      // Update metrics
      setLines((prevLines) => {
        const nextLines = prevLines + linesCleared;
        const nextLevel = Math.floor(nextLines / 10) + 1;
        setLevel((prevLevel) => {
          if (nextLevel > prevLevel) {
            sounds.playLevelUp();
          }
          return nextLevel;
        });
        return nextLines;
      });

      // Tetris standard scoring
      const lineScoreTable = [0, 100, 300, 500, 800];
      const points = lineScoreTable[Math.min(linesCleared, 4)] * level;
      setScore((prev) => prev + points);

      sounds.playLineClear(linesCleared);

      // Trigger line burst effect by sharing the absolute coordinates
      setClearedLineRows(clearedRows);
      setTimeout(() => {
        setClearedLineRows([]);
      }, 400);
    }

    setBoard(newBoard);
    spawnPiece(queueRef.current, newBoard);
  }, [level, spawnPiece]);

  const dropPiece = useCallback(() => {
    if (!currentPieceRef.current || gameOver || isPaused || !gameStarted) return;

    const p = currentPieceRef.current;
    const nextY = p.y + 1;

    if (!checkCollision(p.matrix, { x: p.x, y: nextY }, boardRef.current)) {
      setCurrentPiece({ ...p, y: nextY });
    } else {
      // Lock piece in place
      sounds.playDrop();
      mergePieceToBoard(p, boardRef.current);
    }
  }, [checkCollision, gameOver, isPaused, gameStarted, mergePieceToBoard]);

  const hardDrop = useCallback(() => {
    if (!currentPieceRef.current || gameOver || isPaused || !gameStarted) return;

    const p = currentPieceRef.current;
    let finalY = p.y;

    while (!checkCollision(p.matrix, { x: p.x, y: finalY + 1 }, boardRef.current)) {
      finalY++;
    }

    const dropDistance = finalY - p.y;
    const pointsGained = dropDistance * 2;
    setScore(prev => prev + pointsGained);

    sounds.playDrop();
    mergePieceToBoard({ ...p, y: finalY }, boardRef.current);
  }, [checkCollision, gameOver, isPaused, gameStarted, mergePieceToBoard]);

  const triggerHold = useCallback(() => {
    if (!currentPieceRef.current || gameOver || isPaused || !gameStarted || hasHeldRef.current) return;

    sounds.playHold();
    const current = currentPieceRef.current;
    const held = holdPieceRef.current;

    setHoldPiece(current.type);
    setHasHeld(true);

    if (held) {
      // Spawn formerly held piece
      const matrix = SHAPES[held];
      const width = matrix[0].length;
      const startX = Math.floor((COLS - width) / 2);
      setCurrentPiece({
        type: held,
        matrix,
        x: startX,
        y: 0
      });
    } else {
      // Spawn next in line
      spawnPiece(queueRef.current, boardRef.current);
    }
  }, [gameOver, isPaused, gameStarted, spawnPiece]);

  // Drop Interval handling loop
  useEffect(() => {
    if (gameOver || isPaused || !gameStarted) return;

    // Fast speed scale level formula
    const dropRate = Math.max(80, 1000 - (level - 1) * 90);
    const intervalId = setInterval(dropPiece, dropRate);

    return () => clearInterval(intervalId);
  }, [gameOver, isPaused, gameStarted, level, dropPiece]);

  const clearHighScores = useCallback(() => {
    localStorage.removeItem('tetris_high_scores');
    setHighScores([]);
  }, []);

  return {
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
  };
}
