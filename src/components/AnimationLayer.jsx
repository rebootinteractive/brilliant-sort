import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { COLOR_HEX } from '../game/constants.js';

const SIZE = 22;          // px — slightly larger so they're easy to see
export const DURATION = 550; // ms — CSS transition duration (exported so useGameEngine can match it)

/**
 * A single flying piece.
 *
 * Why useLayoutEffect + forced reflow instead of double-rAF:
 *   double-rAF can collapse into one frame under load, meaning the browser
 *   never sees a distinct "start" position and the transition is skipped.
 *   useLayoutEffect runs synchronously after the DOM node is inserted,
 *   before the first paint. Setting the position there, then forcing a reflow
 *   with getBoundingClientRect(), guarantees the browser registers the start
 *   position. The transition is then reliably triggered on the same frame.
 */
function FlyingPiece({ color, fromX, fromY, toX, toY }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 1. Plant the piece at its source — no transition yet
    el.style.transition = 'none';
    el.style.left = `${fromX - SIZE / 2}px`;
    el.style.top  = `${fromY - SIZE / 2}px`;

    // 2. Force the browser to flush layout so it records the start position
    void el.getBoundingClientRect();

    // 3. Enable transition and set destination — animation fires every time
    el.style.transition = `left ${DURATION}ms cubic-bezier(.4,0,.2,1), top ${DURATION}ms cubic-bezier(.4,0,.2,1)`;
    el.style.left = `${toX - SIZE / 2}px`;
    el.style.top  = `${toY - SIZE / 2}px`;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        width:  SIZE,
        height: SIZE,
        borderRadius: '50%',
        background: COLOR_HEX[color] ?? '#888',
        pointerEvents: 'none',
        zIndex: 999,
        boxShadow: '0 3px 14px #0009',
      }}
    />
  );
}

export default function AnimationLayer({ pieces }) {
  if (!pieces.length) return null;
  return createPortal(
    <>
      {pieces.map(p => (
        <FlyingPiece
          key={p.id}
          color={p.color}
          fromX={p.fromX} fromY={p.fromY}
          toX={p.toX}     toY={p.toY}
        />
      ))}
    </>,
    document.body
  );
}
