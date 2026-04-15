import { GRID_ROWS, GRID_COLS, COLORS, PIECES_PER_COLOR } from './constants.js';

/** Seeded PRNG (mulberry32). */
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROWS  = GRID_ROWS;
const COLS  = GRID_COLS;
const TOTAL = ROWS * COLS;
const N     = COLORS.length;

const toIdx      = (r, c) => r * COLS + c;
const neighbors4 = (i) => {
  const r = Math.floor(i / COLS), c = i % COLS;
  const out = [];
  if (r > 0)      out.push(i - COLS);
  if (r < ROWS-1) out.push(i + COLS);
  if (c > 0)      out.push(i - 1);
  if (c < COLS-1) out.push(i + 1);
  return out;
};

/**
 * Generates a blob color map (flat Int8Array of color indices).
 * Each color gets exactly PIECES_PER_COLOR cells.
 *
 * Two blobs of the same color are never allowed to touch, so connected
 * components are guaranteed to stay <= maxBlob cells.
 *
 * @param {Function}   rng       - PRNG
 * @param {Int8Array}  forbidMap - if set, forbids placing color ci on cell i
 *                                 when forbidMap[i] === ci
 * @param {number}     maxBlob   - maximum cells per connected blob
 */
function generateBlobMap(rng, forbidMap = null, maxBlob = PIECES_PER_COLOR) {
  const seedsPerColor = Math.ceil(PIECES_PER_COLOR / maxBlob);

  // colorMap[i]  = color index for assigned cell (-1 = unassigned)
  // blobMap[i]   = blob index for assigned cell  (-1 = unassigned)
  const colorMap = new Int8Array(TOTAL).fill(-1);
  const blobMap  = new Int16Array(TOTAL).fill(-1);

  const colorCounts = new Int32Array(N);

  // Blob objects: { ci, count, frontier[] }
  const blobs = [];

  // ── Helpers ────────────────────────────────────────────────────────────
  const canExpand = (ni, blobIdx) => {
    const ci = blobs[blobIdx].ci;
    for (const nb of neighbors4(ni)) {
      const nbBlob = blobMap[nb];
      if (nbBlob !== -1 && colorMap[nb] === ci && nbBlob !== blobIdx) {
        return false; // would merge two blobs of same color
      }
    }
    return true;
  };

  // ── Place seeds ─────────────────────────────────────────────────────────
  const totalSeeds = N * seedsPerColor;
  const zCols      = Math.ceil(Math.sqrt(totalSeeds));
  const zRows      = Math.ceil(totalSeeds / zCols);
  const zH         = Math.floor(ROWS / zRows);
  const zW         = Math.floor(COLS / zCols);

  // Build shuffled list of color indices (seedsPerColor copies each)
  const seedList = [];
  for (let ci = 0; ci < N; ci++)
    for (let si = 0; si < seedsPerColor; si++)
      seedList.push(ci);
  for (let i = seedList.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [seedList[i], seedList[j]] = [seedList[j], seedList[i]];
  }

  seedList.forEach((ci, zoneIdx) => {
    const zr   = Math.floor(zoneIdx / zCols);
    const zc   = zoneIdx % zCols;
    const rMin = zr * zH;
    const rMax = Math.min((zr + 1) * zH, ROWS - 1) - 1;
    const cMin = zc * zW;
    const cMax = Math.min((zc + 1) * zW, COLS - 1) - 1;

    const tryPlace = (sr, sc) => {
      if (sr > rMax - 1 || sc > cMax - 1) return false;
      const cells = [toIdx(sr,sc), toIdx(sr,sc+1), toIdx(sr+1,sc), toIdx(sr+1,sc+1)];
      if (cells.some(i => colorMap[i] !== -1)) return false;
      if (forbidMap && cells.some(i => forbidMap[i] === ci)) return false;
      // No same-color neighbor outside this block
      if (cells.some(i =>
        neighbors4(i).some(nb => !cells.includes(nb) && colorMap[nb] === ci)
      )) return false;

      const bi = blobs.length;
      blobs.push({ ci, count: 4, frontier: [...cells] });
      for (const i of cells) { colorMap[i] = ci; blobMap[i] = bi; colorCounts[ci]++; }
      return true;
    };

    let placed = false;
    for (let att = 0; att < 400 && !placed; att++) {
      placed = tryPlace(
        rMin + Math.floor(rng() * Math.max(1, rMax - rMin - 1)),
        cMin + Math.floor(rng() * Math.max(1, cMax - cMin - 1)),
      );
    }
    for (let att = 0; att < 2000 && !placed; att++) {
      placed = tryPlace(
        Math.floor(rng() * (ROWS - 1)),
        Math.floor(rng() * (COLS - 1)),
      );
    }
  });

  // ── Grow blobs ───────────────────────────────────────────────────────────
  let unassigned = TOTAL - colorCounts.reduce((a, b) => a + b, 0);

  while (unassigned > 0) {
    // Pick the blob with the largest remaining capacity
    let bestBlobIdx = -1, bestCap = 0;
    for (let bi = 0; bi < blobs.length; bi++) {
      const blob = blobs[bi];
      if (blob.frontier.length === 0) continue;
      const blobCap  = maxBlob - blob.count;
      const colorCap = PIECES_PER_COLOR - colorCounts[blob.ci];
      const cap      = Math.min(blobCap, colorCap);
      if (cap > bestCap) { bestCap = cap; bestBlobIdx = bi; }
    }

    if (bestBlobIdx === -1) {
      // Spawn new blob for any color still under quota
      let spawned = false;
      for (let ci = 0; ci < N && !spawned; ci++) {
        if (colorCounts[ci] >= PIECES_PER_COLOR) continue;
        for (let i = 0; i < TOTAL && !spawned; i++) {
          if (colorMap[i] !== -1) continue;
          if (forbidMap && forbidMap[i] === ci) continue;
          // Must not be adjacent to an existing blob of same color
          if (neighbors4(i).some(nb => colorMap[nb] === ci)) continue;
          const bi = blobs.length;
          blobs.push({ ci, count: 1, frontier: [i] });
          colorMap[i] = ci; blobMap[i] = bi; colorCounts[ci]++;
          unassigned--;
          spawned = true;
        }
      }
      if (!spawned) break;
      continue;
    }

    const blob     = blobs[bestBlobIdx];
    const frontier = blob.frontier;
    const fi       = Math.floor(rng() * frontier.length);
    const cell     = frontier[fi];

    const available = neighbors4(cell).filter(n =>
      colorMap[n] === -1 &&
      !(forbidMap && forbidMap[n] === blob.ci) &&
      canExpand(n, bestBlobIdx)
    );

    if (available.length === 0) {
      frontier.splice(fi, 1);
      continue;
    }

    const ni = available[Math.floor(rng() * available.length)];
    colorMap[ni] = blob.ci;
    blobMap[ni]  = bestBlobIdx;
    colorCounts[blob.ci]++;
    blob.count++;
    frontier.push(ni);
    unassigned--;
  }

  // ── Fallback: fill remaining unassigned cells ────────────────────────────
  const leastFull = (pool) => pool.reduce((a, b) => colorCounts[a] <= colorCounts[b] ? a : b);

  for (let i = 0; i < TOTAL; i++) {
    if (colorMap[i] !== -1) continue;

    const underQuota = Array.from({ length: N }, (_, ci) => ci)
      .filter(ci => colorCounts[ci] < PIECES_PER_COLOR);
    if (underQuota.length === 0) continue;

    // Prefer adjacent color (ignoring same-color merge check in fallback — edge case)
    const adjacent = neighbors4(i).map(n => colorMap[n])
      .filter(ci => ci !== -1 && colorCounts[ci] < PIECES_PER_COLOR
                 && !(forbidMap && forbidMap[i] === ci));
    let ci;
    if (adjacent.length > 0) {
      ci = leastFull(adjacent);
    } else {
      const valid = underQuota.filter(ci => !(forbidMap && forbidMap[i] === ci));
      ci = leastFull(valid.length > 0 ? valid : underQuota);
    }
    colorMap[i] = ci;
    colorCounts[ci]++;
  }

  return colorMap;
}

const MAX_GROUP_SIZE = 6; // one click fills exactly one box

export function generatePuzzle(seed = Date.now()) {
  const rng = makeRng(seed);

  const targetFlat = generateBlobMap(rng, null, PIECES_PER_COLOR);
  const pieceFlat  = generateBlobMap(rng, targetFlat, MAX_GROUP_SIZE);

  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => {
      const i = toIdx(r, c);
      return {
        targetColor: COLORS[targetFlat[i]],
        piece:       COLORS[pieceFlat[i]],
      };
    })
  );
}
