import { RotateCcw } from 'lucide-react';

export default function ResultsScreen({ players, scores, winner, onPlayAgain }) {
  const winnerName = winner === 'tie' ? 'Tie game' : `${players[winner].name || winner.toUpperCase()} wins!`;

  return (
    <main className="results-screen">
      <section className="results-panel">
        <p className="eyebrow">Round over</p>
        <h1>{winnerName}</h1>
        <div className="final-scores">
          <div>
            <span>{players.p1.name || 'Player 1'}</span>
            <strong>{Math.floor(scores.p1)}</strong>
          </div>
          <div>
            <span>{players.p2.name || 'Player 2'}</span>
            <strong>{Math.floor(scores.p2)}</strong>
          </div>
        </div>
        <button className="primary-button" onClick={onPlayAgain} type="button">
          <RotateCcw size={20} />
          Play Again
        </button>
      </section>
    </main>
  );
}
