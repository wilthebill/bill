import { Volume2, VolumeX } from 'lucide-react';

export default function GameHUD({ players, scores, timeRemaining, itPlayer, muted, onToggleMuted }) {
  return (
    <header className="game-hud">
      <div className="score-block">
        <span>{players.p1.name || 'Player 1'}</span>
        <strong>{Math.floor(scores.p1)}</strong>
      </div>
      <div className="hud-center">
        <span className="timer">{Math.ceil(timeRemaining / 1000)}s</span>
        <span className="it-status">{players[itPlayer].name || itPlayer.toUpperCase()} is IT</span>
      </div>
      <div className="score-block right">
        <span>{players.p2.name || 'Player 2'}</span>
        <strong>{Math.floor(scores.p2)}</strong>
      </div>
      <button
        aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
        className="icon-button"
        onClick={onToggleMuted}
        title={muted ? 'Unmute' : 'Mute'}
        type="button"
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
    </header>
  );
}
