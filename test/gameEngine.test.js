/**
 * Distribution tests for gameEngine.js
 * Run with:  node test/gameEngine.test.js
 */

import { createBoxes, handleClick } from '../src/game/gameEngine.js';
import { GRID_ROWS, GRID_COLS, BOX_CAPACITY, COLORS } from '../src/game/constants.js';
import { generatePuzzle } from '../src/game/puzzleGen.js';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓  ${msg}`);
    passed++;
  } else {
    console.error(`  ✗  ${msg}`);
    failed++;
  }
}

// ── Helper: build a minimal state manually ───────────────────────────────────

function makeGrid(targetColor, pieceColor) {
  // Fills the entire grid with one targetColor and one pieceColor (for simplicity)
  return Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => ({
      targetColor,
      piece: pieceColor,
    }))
  );
}

function freshState(grid, boxes) {
  return { grid, boxes, status: 'playing' };
}

// ── Test 1: Consolidation — same-color box filled before a new box opens ─────
console.log('\nTest 1 – Consolidation');
{
  // grid: top-left 2×2 block is all red, rest are blue (different color = irrelevant)
  const grid = Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: GRID_COLS }, (_, c) => ({
      targetColor: r < 2 && c < 2 ? 'blue' : 'green',   // target doesn't matter here
      piece:       r < 2 && c < 2 ? 'red'  : 'blue',    // 4 connected red pieces at (0,0)
    }))
  );

  const boxes = createBoxes();
  // Pre-fill box[3] with 5 red pieces; box[0] is empty
  boxes[3].assignedColor = 'red';
  boxes[3].count = 5;

  const state = freshState(grid, boxes);
  const next  = handleClick(state, 0, 0);   // click the red 2×2 block (4 pieces)

  // box[3] should now have 5+4=9, box[0] must remain empty
  assert(next.boxes[3].count === 9,       'box[3] (existing red) absorbs all 4 pieces → count=9');
  assert(next.boxes[0].assignedColor === null, 'box[0] (empty) not claimed when same-color box has space');
}

// ── Test 2: Overflow — spills into empty box after same-color box fills ───────
console.log('\nTest 2 – Overflow into empty box after same-color box fills');
{
  // 6×2 = 12 connected red pieces starting at row 0
  const grid = Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: GRID_COLS }, (_, c) => ({
      targetColor: r < 2 ? 'red' : 'green',
      piece:       r < 2 ? 'red' : 'blue',    // row 0-1 are all red (40 pieces connected!)
    }))
  );

  const boxes = createBoxes();
  // box[2] has 10 red pieces already; box[0] is empty
  boxes[2].assignedColor = 'red';
  boxes[2].count = 10;

  const state = freshState(grid, boxes);
  // Click any red cell — entire connected row-0-1 blob (40 pieces, but let's use a
  // small isolated group so we control the size. Build a 2×3 red block.)
  const smallGrid = Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: GRID_COLS }, (_, c) => ({
      targetColor: 'green',
      piece: (r < 2 && c < 3) ? 'red' : 'blue',   // 2×3 = 6 red pieces at top-left
    }))
  );

  const boxes2 = createBoxes();
  boxes2[4].assignedColor = 'red';
  boxes2[4].count = 10;   // 2 spaces left

  const state2 = freshState(smallGrid, boxes2);
  const next2  = handleClick(state2, 0, 0);  // click the 6-piece red block

  assert(next2.boxes[4].count === BOX_CAPACITY, 'box[4] fills to capacity (10+2=12)');
  // remaining 4 pieces must go to a new empty box, not box[4]
  const newBox = next2.boxes.find((b, i) => i !== 4 && b.assignedColor === 'red');
  assert(newBox !== undefined, 'overflow goes into a new empty box');
  assert(newBox?.count === 4,  'overflow box holds exactly 4 remaining pieces');
}

// ── Test 3: Auto-deposit correctness — piece color matches target color ────────
console.log('\nTest 3 – Auto-deposit: piece === targetColor for every deposited cell');
{
  // Grid where every target is 'red' but piece is 'blue' (nothing correct yet)
  // except a 2×2 top-left patch: target='red', piece='red' (already correct, won't move)
  // We'll construct a state where a box is already full of red and can deposit.
  const grid = Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: GRID_COLS }, (_, c) => ({
      targetColor: 'red',
      piece: null,              // all slots empty so deposit has targets
    }))
  );

  // Manufacture a state with one full red box by placing a 12-piece group
  // then clicking it. To do this we need 12 connected red pieces.
  const setupGrid = Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: GRID_COLS }, (_, c) => ({
      targetColor: 'red',
      piece: (r === 0 && c < 12) ? 'red' : null,   // row-0 cols 0-11: 12 red pieces
    }))
  );

  // Pre-load a box to capacity manually and run auto-deposit logic indirectly:
  const setupBoxes = createBoxes();
  setupBoxes[0].assignedColor = 'red';
  setupBoxes[0].count = BOX_CAPACITY;   // already full

  // Trigger a click that causes NO new transfer but DOES run auto-deposit.
  // Actually handleClick only runs auto-deposit after a transfer. Let's trigger
  // it by clicking 1 red piece that fills another box which then deposits.
  // Simpler: just verify the invariant on an actual game run.

  // Use generatePuzzle + simulate several turns, then check every deposit
  let violations = 0;
  for (const seed of [42, 123, 999, 777, 1234]) {
    const puzzle = generatePuzzle(seed);
    let gameState = { grid: puzzle, boxes: createBoxes(), status: 'playing' };

    // Walk every cell; click any cell with a piece up to 80 times
    let clicks = 0;
    outer: for (let r = 0; r < GRID_ROWS && clicks < 80; r++) {
      for (let c = 0; c < GRID_COLS && clicks < 80; c++) {
        if (gameState.grid[r][c].piece === null) continue;
        const prev = gameState;
        gameState = handleClick(gameState, r, c);
        clicks++;

        // After each click: check every cell where piece is NOT null
        // that was null before (i.e., got deposited) → piece must === targetColor
        for (let dr = 0; dr < GRID_ROWS; dr++) {
          for (let dc = 0; dc < GRID_COLS; dc++) {
            const prevPiece = prev.grid[dr][dc].piece;
            const cell = gameState.grid[dr][dc];
            if (prevPiece === null && cell.piece !== null) {
              // This cell was empty and just received a piece via auto-deposit
              if (cell.piece !== cell.targetColor) {
                violations++;
                console.error(`    deposit mismatch at (${dr},${dc}): piece=${cell.piece} targetColor=${cell.targetColor}`);
              }
            }
          }
        }
      }
    }
  }
  assert(violations === 0, `auto-deposit always places piece===targetColor (checked 5 seeds × 80 clicks)`);
}

// ── Test 5: Partial deposit — box keeps leftover pieces and stays distributing ─
console.log('\nTest 5 – Partial deposit: leftover pieces stay in box, distributing=true');
{
  const grid = Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: GRID_COLS }, (_, c) => {
      if (r === 0 && c === 0) return { targetColor: 'red', piece: null };  // 1 empty red target
      if (r === 0 && c >= 1 && c <= 12) return { targetColor: 'green', piece: 'red' };
      return { targetColor: 'blue', piece: 'blue' };
    })
  );

  const boxes = createBoxes();
  boxes[0].assignedColor = 'red';
  boxes[0].count = 11;

  let gs = freshState(grid, boxes);
  gs = handleClick(gs, 0, 1); // 1 red piece → box[0] hits 12 → deposits 1

  assert(gs.grid[0][0].piece === 'red',        'the one available red slot got its piece');
  assert(gs.boxes[0].count === 11,             'box[0] retains the 11 undeposited pieces');
  assert(gs.boxes[0].assignedColor === 'red',  'box[0] stays assigned to red');
  assert(gs.boxes[0].distributing === true,    'box[0] is locked as distributing');
}

// ── Test 6: Distributing box is skipped during piece assignment ────────────────
console.log('\nTest 6 – Distributing box not used for new incoming pieces');
{
  const grid = Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: GRID_COLS }, (_, c) => {
      // Two separate connected red groups
      if (r === 0 && c >= 0 && c <= 3) return { targetColor: 'green', piece: 'red' }; // 4 red
      if (r === 1 && c >= 0 && c <= 3) return { targetColor: 'green', piece: 'orange' }; // 4 orange (different)
      return { targetColor: 'blue', piece: 'blue' };
    })
  );

  const boxes = createBoxes();
  // box[0] is red and distributing (mid-drain)
  boxes[0].assignedColor = 'red';
  boxes[0].count = 8;
  boxes[0].distributing = true;

  let gs = freshState(grid, boxes);
  gs = handleClick(gs, 0, 0); // click 4 red pieces

  // box[0] is distributing — must NOT receive the new red pieces
  assert(gs.boxes[0].count === 8, 'distributing box[0] count unchanged by new click');
  // New red pieces should land in a different (empty) box
  const newRedBox = gs.boxes.find((b, i) => i !== 0 && b.assignedColor === 'red');
  assert(newRedBox !== undefined,  'new red pieces went to a fresh empty box');
  assert(newRedBox?.count === 4,   'fresh box holds the 4 new red pieces');
}

// ── Test 4: No orphan pieces remain after a full box deposits ─────────────────
console.log('\nTest 4 – Box clears itself after depositing');
{
  let orphans = 0;
  for (const seed of [42, 123, 999]) {
    const puzzle = generatePuzzle(seed);
    let gs = { grid: puzzle, boxes: createBoxes(), status: 'playing' };
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (gs.grid[r][c].piece === null) continue;
        const prev = gs;
        gs = handleClick(gs, r, c);
        // Any box that was full before and has eligible empty targets must now be cleared
        for (let bi = 0; bi < prev.boxes.length; bi++) {
          if (prev.boxes[bi].count !== BOX_CAPACITY) continue;
          const color = prev.boxes[bi].assignedColor;
          const hadEmptyTarget = prev.grid.some(row =>
            row.some(cell => cell.piece === null && cell.targetColor === color)
          );
          if (hadEmptyTarget && gs.boxes[bi].count === BOX_CAPACITY) {
            orphans++;
          }
        }
      }
    }
  }
  assert(orphans === 0, 'full boxes with eligible targets always deposit and clear');
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
