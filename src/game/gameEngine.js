import { BOX_COUNT, BOX_CAPACITY } from './constants.js';
import { getConnectedPieces } from './floodFill.js';

export function createBoxes() {
  return Array.from({ length: BOX_COUNT }, () => ({
    assignedColor: null,
    count: 0,
    distributing: false, // true once box hits capacity; locked to new pieces until empty
  }));
}

function cloneState(state) {
  return {
    grid: state.grid.map(row => row.map(cell => ({ ...cell }))),
    boxes: state.boxes.map(b => ({ ...b })),
    status: state.status,
  };
}

/**
 * Deposits from every box that is currently distributing (or just turned full).
 * A distributing box keeps depositing on each call until it empties;
 * new pieces are never routed to it in that state.
 * Mutates state in-place.
 *
 * @param {object} opts
 * @param {boolean} [opts.freeDistribute=false]  When true, any non-empty box distributes
 *                                                immediately without waiting to fill.
 */
function runAutoDeposits(state, opts = {}) {
  const threshold = opts.freeDistribute ? 1 : BOX_CAPACITY;

  // Mark any newly-eligible box as distributing
  for (const box of state.boxes) {
    if (box.count >= threshold && !box.distributing) {
      box.distributing = true;
    }
  }

  // Drain all distributing boxes as far as possible this tick
  let any = true;
  while (any) {
    any = false;
    for (let bi = 0; bi < state.boxes.length; bi++) {
      const box = state.boxes[bi];
      if (!box.distributing) continue;
      if (box.count === 0) {
        // Fully drained — release the box
        box.distributing = false;
        box.assignedColor = null;
        continue;
      }

      // Collect empty slots whose target matches
      const emptySlots = [];
      for (let r = 0; r < state.grid.length; r++) {
        for (let c = 0; c < state.grid[0].length; c++) {
          const cell = state.grid[r][c];
          if (cell.piece === null && cell.targetColor === box.assignedColor) {
            emptySlots.push({ r, c });
          }
        }
      }

      if (emptySlots.length === 0) continue; // no targets yet — wait

      const toFill = emptySlots.slice(0, box.count);
      for (const { r, c } of toFill) {
        state.grid[r][c].piece = box.assignedColor;
      }
      box.count -= toFill.length;
      if (box.count === 0) {
        box.distributing = false;
        box.assignedColor = null;
      }
      any = true;
    }
  }
}

function checkWin(state) {
  for (const row of state.grid) {
    for (const cell of row) {
      if (cell.piece !== cell.targetColor) return false;
    }
  }
  return true;
}

/**
 * Lose = nowhere to put new pieces AND no box can make progress.
 * Distributing boxes with remaining pieces that have no matching empty slots
 * count as permanently stuck.
 */
function checkLoss(state, opts = {}) {
  // Is there any box with free space? In freeDistribute mode distributing boxes still accept.
  const hasFreeBox = state.boxes.some(
    b => b.count < BOX_CAPACITY && (!b.distributing || opts.freeDistribute)
  );
  if (hasFreeBox) return false;

  // Can any box (distributing or full) still deposit?
  for (const box of state.boxes) {
    if (box.count === 0) continue;
    const canDeposit = state.grid.some(row =>
      row.some(cell => cell.piece === null && cell.targetColor === box.assignedColor)
    );
    if (canDeposit) return false;
  }
  return true;
}

export function handleClick(state, row, col, opts = {}) {
  if (state.status !== 'playing') return state;
  const cell = state.grid[row][col];
  if (cell.piece === null) return state;

  const connected = getConnectedPieces(state.grid, row, col);
  const color = cell.piece;

  const next = cloneState(state);

  // Remove pieces from grid
  for (const { row: r, col: c } of connected) {
    next.grid[r][c].piece = null;
  }

  // Distribute pieces into boxes.
  // Pass 1 – consolidate into same-color, non-distributing boxes.
  // Pass 2 – overflow into leftmost empty, non-distributing box.
  let remaining = connected.length;

  for (let bi = 0; bi < next.boxes.length && remaining > 0; bi++) {
    const box = next.boxes[bi];
    if (box.distributing && !opts.freeDistribute) continue; // locked while draining
    if (box.assignedColor !== color) continue;
    const space = BOX_CAPACITY - box.count;
    if (space <= 0) continue;
    const taking = Math.min(space, remaining);
    box.count += taking;
    remaining -= taking;
  }

  for (let bi = 0; bi < next.boxes.length && remaining > 0; bi++) {
    const box = next.boxes[bi];
    if (box.distributing && !opts.freeDistribute) continue; // locked while draining
    if (box.assignedColor !== null) continue;
    const taking = Math.min(BOX_CAPACITY, remaining);
    box.assignedColor = color;
    box.count = taking;
    remaining -= taking;
  }

  if (remaining > 0) return state; // no room — invalid move

  runAutoDeposits(next, opts);

  if (checkWin(next))             next.status = 'won';
  else if (checkLoss(next, opts)) next.status = 'lost';

  return next;
}
