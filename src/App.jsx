import { useState } from 'react';
import { useGameEngine } from './hooks/useGameEngine.js';
import TopGrid from './components/TopGrid.jsx';
import BottomBoxes from './components/BottomBoxes.jsx';
import StatusOverlay from './components/StatusOverlay.jsx';
import AnimationLayer from './components/AnimationLayer.jsx';
import './App.css';

export default function App() {
  const [freeDistribute, setFreeDistribute] = useState(false);
  const { state, flyingPieces, handleCellClick, restart } = useGameEngine({ freeDistribute });

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Brilliant Sort</span>
        <label className="exp-label">
          <input
            type="checkbox"
            checked={freeDistribute}
            onChange={e => setFreeDistribute(e.target.checked)}
          />
          free distribute
        </label>
        <button className="restart-btn" onClick={restart}>New Game</button>
      </header>

      <main className="game-area">
        <TopGrid grid={state.grid} onCellClick={handleCellClick} />
        <BottomBoxes boxes={state.boxes} />
      </main>

      <AnimationLayer pieces={flyingPieces} />
      <StatusOverlay status={state.status} onRestart={restart} />
    </div>
  );
}
