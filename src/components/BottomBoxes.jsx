import { BOX_CAPACITY, COLOR_HEX, SLOT_HEX } from '../game/constants.js';

const BOX_COLS = 3;
const BOX_ROWS = 2; // 3x2 = 6

export default function BottomBoxes({ boxes }) {
  return (
    <div className="bottom-boxes">
      {boxes.map((box, bi) => (
        <div
          key={bi}
          data-box={bi}
          className={`box${box.assignedColor ? ' assigned' : ''}${box.count === BOX_CAPACITY ? ' full' : ''}${box.distributing ? ' distributing' : ''}`}
          style={box.assignedColor ? { borderColor: COLOR_HEX[box.assignedColor] } : {}}
        >
          <div className="box-label">
            {box.assignedColor
              ? `${box.assignedColor} ${box.count}/${BOX_CAPACITY}`
              : 'empty'}
          </div>
          <div className="box-grid">
            {Array.from({ length: BOX_ROWS * BOX_COLS }, (_, i) => {
              const filled = i < box.count;
              return (
                <div
                  key={i}
                  className={`box-slot${filled ? ' filled' : ''}`}
                  style={{
                    ...(filled && box.assignedColor
                      ? { background: COLOR_HEX[box.assignedColor] }
                      : box.assignedColor
                      ? { background: SLOT_HEX[box.assignedColor] }
                      : {}),
                    ...(box.distributing && filled
                      ? { animationDelay: `${(i % BOX_COLS) * 80}ms` }
                      : {}),
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
