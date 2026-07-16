import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { COLOR_CHOICES, PLAYER_DEFAULTS } from '../config/gameConfig';

function cleanName(value) {
  return value.replace(/[^a-zA-Z0-9 ._-]/g, '').replace(/\s+/g, ' ').slice(0, 12);
}

function displayName(id, name) {
  return name.trim() || PLAYER_DEFAULTS[id].name;
}

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

export default function StartScreen({
  players,
  setPlayers,
  maps,
  mapError,
  selectedMapId,
  onSelectMap,
  onStart,
  isStarting,
}) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [colorWarning, setColorWarning] = useState('');
  const selectedMapRef = useRef(null);
  const selectedMap = maps.find((map) => map.id === selectedMapId) ?? null;

  useEffect(() => {
    selectedMapRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedMapId]);

  const updatePlayer = (id, patch) => {
    setPlayers((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  };

  const updateName = (id, value) => {
    updatePlayer(id, { name: cleanName(value) });
  };

  const trimName = (id) => {
    updatePlayer(id, { name: displayName(id, players[id].name) });
  };

  const updateColor = (id, color) => {
    const other = id === 'p1' ? 'p2' : 'p1';
    if (players[other].color === color) {
      setColorWarning(`${PLAYER_DEFAULTS[id].name} cannot use the same colour as ${PLAYER_DEFAULTS[other].name}.`);
      return;
    }

    setColorWarning('');
    updatePlayer(id, { color });
  };

  const canStart = Boolean(selectedMap) && !isStarting;

  return (
    <main className="start-screen">
      <section className="start-panel">
        <div className="start-copy">
          <h1>Monster Tag!</h1>
        </div>

        <p className="intro">
          Choose an arena, collect powers, and tag the runner before the two-minute round ends.
        </p>

        <div
          aria-label="Choose a map"
          className="map-card-grid"
          tabIndex={0}
        >
          {maps.map((map) => (
            <button
              className={`map-card ${selectedMapId === map.id ? 'selected' : ''}`}
              key={map.id}
              onClick={() => onSelectMap(map.id)}
              ref={selectedMapId === map.id ? selectedMapRef : null}
              type="button"
            >
              <span className={`map-thumb ${map.theme}`}>{map.preview}</span>
              <span className="map-card-title">
                <strong>{map.name}</strong>
                {selectedMapId === map.id ? <b>Selected</b> : null}
              </span>
              <small>{map.difficulty}</small>
              <em>{map.description}</em>
            </button>
          ))}
        </div>

        {selectedMap ? (
          <div className="selected-map-card">
            <div className={`selected-map-preview ${selectedMap.theme}`}>
              <span>{selectedMap.preview}</span>
              <strong>Selected</strong>
            </div>
            <div>
              <p className="eyebrow">Selected Map</p>
              <h2>{selectedMap.name}</h2>
              <p>{selectedMap.description}</p>
              <strong>{selectedMap.difficulty}</strong>
            </div>
          </div>
        ) : (
          <div className="selected-map-card empty">
            <p>Choose a map to start.</p>
          </div>
        )}

        <div className="start-action-row">
          <button
            className="primary-button start-button"
            disabled={!canStart}
            onClick={onStart}
            type="button"
          >
            <Play size={24} />
            {selectedMap ? (isStarting ? 'Loading...' : 'Start Game') : 'Choose a map to start.'}
          </button>
        </div>

        {mapError ? (
          <p className="map-error" role="alert">
            {mapError}
          </p>
        ) : null}

        <div className="setup-grid">
          {Object.entries(players).map(([id, player], index) => (
            <div className="setup-card" key={id}>
              <div className="setup-player-preview" style={{ '--player-color': player.color }}>
                <span>{index + 1}</span>
              </div>
              <label>
                {PLAYER_DEFAULTS[id].name} name
                <input
                  maxLength={12}
                  onBlur={() => trimName(id)}
                  onChange={(event) => updateName(id, event.target.value)}
                  placeholder={PLAYER_DEFAULTS[id].name}
                  value={player.name}
                />
              </label>
              <ColorPicker
                label={`${PLAYER_DEFAULTS[id].name} color`}
                onChange={(color) => updateColor(id, color)}
                value={player.color}
              />
            </div>
          ))}
        </div>

        {colorWarning ? (
          <p className="map-error color-warning" role="alert">
            {colorWarning}
          </p>
        ) : null}

        <div className="controls-panel">
          <div>
            <strong>{displayName('p1', players.p1.name)}</strong>
            <span>WASD to move, F to use a power</span>
          </div>
          <div>
            <strong>{displayName('p2', players.p2.name)}</strong>
            <span>Arrow keys to move, Enter to use a power</span>
          </div>
        </div>

        <button
          aria-expanded={showInstructions}
          className="secondary-button instructions-button"
          onClick={() => setShowInstructions((visible) => !visible)}
          type="button"
        >
          Instructions
        </button>
        {showInstructions ? (
          <div className="instructions-panel">
            <p>
              One player is the monster. Tag the runner to score, switch roles, and use powers like
              Dash, Shield, Stun Blast, Ice Trap, Corner Teleport, and Moving Clone.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
