import { Play } from 'lucide-react';
import { COLOR_CHOICES, PLAYER_DEFAULTS } from '../config/gameConfig';

function ColorPicker({ value, onChange, label }) {
  return (
    <div className="color-picker" aria-label={label}>
      {COLOR_CHOICES.map((color) => (
        <button
          aria-label={`${label} ${color}`}
          className={`swatch ${value === color ? 'selected' : ''}`}
          key={color}
          onClick={() => onChange(color)}
          style={{ '--swatch': color }}
          type="button"
        />
      ))}
    </div>
  );
}

export default function StartScreen({ players, setPlayers, onStart }) {
  const updatePlayer = (id, patch) => {
    setPlayers((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  };

  return (
    <main className="start-screen">
      <section className="start-panel">
        <p className="eyebrow">Local keyboard game</p>
        <h1>Tag!</h1>
        <p className="intro">
          Two players, one playground, ninety seconds of frantic dodging.
        </p>

        <div className="setup-grid">
          {Object.entries(players).map(([id, player], index) => (
            <div className="setup-card" key={id}>
              <div className="setup-player-preview" style={{ '--player-color': player.color }}>
                <span>{index + 1}</span>
              </div>
              <label>
                Name
                <input
                  maxLength={16}
                  onChange={(event) => updatePlayer(id, { name: event.target.value })}
                  placeholder={PLAYER_DEFAULTS[id].name}
                  value={player.name}
                />
              </label>
              <ColorPicker
                label={`${PLAYER_DEFAULTS[id].name} color`}
                onChange={(color) => updatePlayer(id, { color })}
                value={player.color}
              />
              <p className="controls-hint">
                {id === 'p1' ? 'WASD' : 'Arrow keys'}
              </p>
            </div>
          ))}
        </div>

        <button className="primary-button" onClick={onStart} type="button">
          <Play size={20} />
          Start Match
        </button>
      </section>
    </main>
  );
}
