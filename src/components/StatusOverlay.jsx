export default function StatusOverlay({ status, onRestart }) {
  if (status === 'playing') return null;

  return (
    <div className="overlay">
      <div className="overlay-box">
        <h2>{status === 'won' ? 'You Win!' : 'Game Over'}</h2>
        <p>
          {status === 'won'
            ? 'All pieces sorted correctly!'
            : 'All boxes are full with no moves left.'}
        </p>
        <button onClick={onRestart}>Play Again</button>
      </div>
    </div>
  );
}
