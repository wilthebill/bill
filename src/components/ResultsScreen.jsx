import { RotateCcw } from 'lucide-react';

export default function ResultsScreen({ players, scores, winner, selectedMapName, onPlayAgain, onChangeMap }) {
  const winnerName = winner === 'tie' ? 'Tie game' : `${players[winner].name || winner.toUpperCase()} wins!`;

  return (
    <main className="results-screen">
      <section className="results-panel">
        <p className="eyebrow">Round over</p>
        <h1>{winnerName}</h1>
        <p className="result-map">{selectedMapName}</p>
        <div className="final-scores">
          <div style={{ '--player-color': players.p1.color }}>
            <span>{players.p1.name || 'Player 1'}</span>
            <strong>{scores.p1}</strong>
          </div>
          <div style={{ '--player-color': players.p2.color }}>
            <span>{players.p2.name || 'Player 2'}</span>
            <strong>{scores.p2}</strong>
          </div>
        </div>
        <button className="primary-button" onClick={onPlayAgain} type="button">
          <RotateCcw size={20} />
          Play Again
        </button>
        <button className="secondary-button" onClick={onChangeMap} type="button">
          Change Map
        </button>
        <button className="secondary-button" onClick={onChangeMap} type="button">
          Return to Menu
        </button>
      </section>
    </main>
  );
}
