import { COLOR_HEX, SLOT_HEX } from '../game/constants.js';

export default function TopGrid({ grid, onCellClick }) {
  return (
    <div className="top-grid">
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const hasPiece = cell.piece !== null;
          const isCorrect = hasPiece && cell.piece === cell.targetColor;

          const tooltipLines = [
            hasPiece ? `piece: ${cell.piece}` : 'piece: —',
            `slot:  ${cell.targetColor}`,
          ].join('\n');

          return (
            <div
              key={`${r}-${c}`}
              data-cell={`${r}-${c}`}
              data-tooltip={tooltipLines}
              className={`grid-slot${hasPiece ? ' has-piece' : ''}${isCorrect ? ' correct' : ''}`}
              style={{ background: SLOT_HEX[cell.targetColor] }}
              onClick={() => hasPiece && onCellClick(r, c)}
            >
              {hasPiece && (
                <div
                  className="piece"
                  style={{ background: COLOR_HEX[cell.piece] }}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
