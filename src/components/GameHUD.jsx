import { Volume2, VolumeX } from 'lucide-react';
import { POWER_TYPES } from '../config/gameConfig';

function ActiveEffects({ effects, timeNow }) {
  const active = [];

  if (effects.burstUntil > timeNow) active.push('Burst');
  if (effects.slowedUntil > timeNow) active.push('Slowed');
  if (effects.invisibleUntil > timeNow) active.push('Invisible');
  if (effects.slidingUntil > timeNow) active.push('Sliding');
  if (effects.trackingUntil > timeNow) active.push('Tracked');
  if (effects.protectedUntil > timeNow) active.push('Safe');
  if (effects.stunnedUntil > timeNow) active.push(`Stunned ${Math.ceil((effects.stunnedUntil - timeNow) / 1000)}s`);
  if (effects.stunImmuneUntil > timeNow && effects.stunnedUntil <= timeNow) active.push('Stun immune');
  if (effects.shield) active.push('Shield');

  return <span className="effect-readout">{active.length ? active.join(' / ') : 'No effect'}</span>;
}

function PowerReadout({ playerId, powers, powerNames, cooldownRemaining, stunRangeStatus }) {
  const held = powers[playerId].held;
  const cooldown = Math.ceil(cooldownRemaining[playerId] / 1000);

  return (
    <span className="power-readout">
      {held ? (
        <span className="power-dot" style={{ '--power-color': POWER_TYPES[held].color }}>
          {POWER_TYPES[held].icon}
        </span>
      ) : (
        <span className="power-dot empty">--</span>
      )}
      <span>{powerNames[playerId]}</span>
      {stunRangeStatus[playerId] !== null && (
        <em className={stunRangeStatus[playerId] ? 'in-range' : 'out-range'}>
          {stunRangeStatus[playerId] ? 'In range' : 'Out of range'}
        </em>
      )}
      {cooldown > 0 && <em>{cooldown}s</em>}
    </span>
  );
}

export default function GameHUD({
  players,
  scores,
  timeRemaining,
  itPlayer,
  mapName,
  powers,
  powerNames,
  cooldownRemaining,
  effects,
  timeNow,
  stunRangeStatus,
  muted,
  onToggleMuted,
}) {
  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.ceil((timeRemaining % 60000) / 1000).toString().padStart(2, '0');

  return (
    <header className="game-hud">
      <div className="score-block" style={{ '--player-color': players.p1.color }}>
        <span>{players.p1.name || 'Player 1'}</span>
        <strong>{scores.p1}</strong>
        <PowerReadout
          cooldownRemaining={cooldownRemaining}
          playerId="p1"
          powerNames={powerNames}
          powers={powers}
          stunRangeStatus={stunRangeStatus}
        />
        <ActiveEffects effects={effects.p1} timeNow={timeNow} />
      </div>
      <div className="hud-center">
        <span className="map-name">{mapName}</span>
        <span className="timer">{minutes}:{seconds}</span>
        <span className="it-status">{players[itPlayer].name || itPlayer.toUpperCase()} is the monster</span>
      </div>
      <div className="score-block right" style={{ '--player-color': players.p2.color }}>
        <span>{players.p2.name || 'Player 2'}</span>
        <strong>{scores.p2}</strong>
        <PowerReadout
          cooldownRemaining={cooldownRemaining}
          playerId="p2"
          powerNames={powerNames}
          powers={powers}
          stunRangeStatus={stunRangeStatus}
        />
        <ActiveEffects effects={effects.p2} timeNow={timeNow} />
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
