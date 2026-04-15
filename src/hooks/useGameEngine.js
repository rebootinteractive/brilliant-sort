import { useState, useCallback, useRef, useEffect } from 'react';
import { generatePuzzle } from '../game/puzzleGen.js';
import { createBoxes, handleClick as engineClick } from '../game/gameEngine.js';
import { GRID_ROWS, GRID_COLS, BOX_CAPACITY } from '../game/constants.js';
import { DURATION } from '../components/AnimationLayer.jsx';

// Wait this much after spawning flying pieces before clearing them.
// Must be > DURATION so pieces finish travelling before they disappear.
const PHASE_TIMEOUT = DURATION + 80;

function freshState(seed) {
  return {
    grid: generatePuzzle(seed),
    boxes: createBoxes(),
    status: 'playing',
  };
}

function elCenter(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

let _idSeq = 0;
const uid = () => `fp${++_idSeq}`;

export function useGameEngine(opts = {}) {
  const [state, setState] = useState(() => freshState(Date.now()));
  const [flyingPieces, setFlyingPieces] = useState([]);

  const animLock    = useRef(false);
  const pendingAnim = useRef(null);
  const optsRef     = useRef(opts);
  optsRef.current   = opts;

  const handleCellClick = useCallback((row, col) => {
    if (animLock.current) return;

    setState(prev => {
      if (prev.status !== 'playing') return prev;
      if (prev.grid[row][col].piece === null) return prev;

      const next = engineClick(prev, row, col, optsRef.current);
      if (next === prev) return prev;

      // Diff: which cells lost / gained pieces
      const picked = [], deposited = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const a = prev.grid[r][c].piece, b = next.grid[r][c].piece;
          if (a !== null && b === null) picked.push({ r, c, color: a });
          if (a === null && b !== null) deposited.push({ r, c, color: b });
        }
      }

      // Which box received the picked-up pieces?
      const pickedColor = prev.grid[row][col].piece;
      let rcvBox = -1;
      for (let bi = 0; bi < next.boxes.length; bi++) {
        if (next.boxes[bi].assignedColor === pickedColor &&
            next.boxes[bi].count > prev.boxes[bi].count) {
          rcvBox = bi; break;
        }
      }

      // Boxes that went from full → partially drained (deposit occurred)
      const depSrcs = prev.boxes.reduce((acc, b, bi) => {
        if (b.count === BOX_CAPACITY && next.boxes[bi].count < BOX_CAPACITY)
          acc.push({ bi, color: b.assignedColor });
        return acc;
      }, []);
      if (rcvBox === -1 && depSrcs.length > 0) rcvBox = depSrcs[0].bi;

      pendingAnim.current = { picked, deposited, rcvBox, depSrcs };
      animLock.current = true;
      return next;
    });
  }, []);

  // Animation orchestrator — runs after every state commit
  useEffect(() => {
    const anim = pendingAnim.current;
    if (!anim) return;
    pendingAnim.current = null;

    const { picked, deposited, rcvBox, depSrcs } = anim;
    const boxPt = rcvBox >= 0 ? elCenter(`[data-box="${rcvBox}"]`) : null;

    // Build phase-A pieces (grid → box)
    const phase1 = (boxPt && picked.length > 0)
      ? picked.slice(0, 25).map(({ r, c, color }) => {
          const src = elCenter(`[data-cell="${r}-${c}"]`);
          return src ? { id: uid(), color, fromX: src.x, fromY: src.y, toX: boxPt.x, toY: boxPt.y } : null;
        }).filter(Boolean)
      : [];

    // Build phase-B pieces (box → grid, deposit)
    const depBoxPt = depSrcs.length > 0 ? (elCenter(`[data-box="${depSrcs[0].bi}"]`) ?? boxPt) : null;
    const phase2 = (depBoxPt && deposited.length > 0)
      ? deposited.slice(0, 25).map(({ r, c, color }) => {
          const dst = elCenter(`[data-cell="${r}-${c}"]`);
          return dst ? { id: uid(), color, fromX: depBoxPt.x, fromY: depBoxPt.y, toX: dst.x, toY: dst.y } : null;
        }).filter(Boolean)
      : [];

    // If there's genuinely nothing to show, unlock immediately
    if (phase1.length === 0 && phase2.length === 0) {
      animLock.current = false;
      return;
    }

    if (phase1.length > 0) setFlyingPieces(phase1);

    setTimeout(() => {
      setFlyingPieces([]);

      if (phase2.length > 0) {
        setFlyingPieces(phase2);
        setTimeout(() => {
          setFlyingPieces([]);
          animLock.current = false;
        }, PHASE_TIMEOUT);
      } else {
        animLock.current = false;
      }
    }, phase1.length > 0 ? PHASE_TIMEOUT : 0);
  }, [state]);

  const restart = useCallback(() => {
    animLock.current = false;
    pendingAnim.current = null;
    setFlyingPieces([]);
    setState(freshState(Date.now()));
  }, []);

  return { state, flyingPieces, handleCellClick, restart };
}
