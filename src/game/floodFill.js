/**
 * 4-directional flood fill.
 * Returns array of {row, col} for all connected cells with the same piece color
 * as the cell at (startRow, startCol).
 */
export function getConnectedPieces(grid, startRow, startCol) {
  const color = grid[startRow][startCol].piece;
  if (color === null) return [];

  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const result = [];
  const queue = [{ row: startRow, col: startCol }];
  visited[startRow][startCol] = true;

  while (queue.length > 0) {
    const { row, col } = queue.shift();
    result.push({ row, col });

    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = row + dr;
      const nc = col + dc;
      if (
        nr >= 0 && nr < rows &&
        nc >= 0 && nc < cols &&
        !visited[nr][nc] &&
        grid[nr][nc].piece === color
      ) {
        visited[nr][nc] = true;
        queue.push({ row: nr, col: nc });
      }
    }
  }

  return result;
}
