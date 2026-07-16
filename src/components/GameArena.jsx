import { GAME_CONFIG, POWER_TYPES } from '../config/gameConfig';
import Obstacle from './Obstacle';
import Player from './Player';

export default function GameArena({
  players,
  itPlayer,
  effects,
  blastEffect,
  clones,
  iceTraps,
  map,
  powerUps,
  roarEffect,
  tagFlash,
  teleports,
  timeNow,
  message,
}) {
  return (
    <section
      className={`arena ${tagFlash ? 'tag-flash' : ''}`}
      style={{
        width: GAME_CONFIG.arena.width,
        height: GAME_CONFIG.arena.height,
      }}
    >
      <div className="path horizontal" />
      <div className="path vertical" />
      <div className="pond" />
      <div className="hopscotch">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className={`map-skin ${map.theme}`} />
      {map.obstacles.map((obstacle) => (
        <Obstacle key={obstacle.id} obstacle={obstacle} />
      ))}
      {powerUps.map((powerUp) => (
        powerUp.availableAt <= timeNow && (
          <div
            className="power-up"
            key={powerUp.id}
            style={{
              '--power-color': POWER_TYPES[powerUp.type].color,
              left: powerUp.x,
              top: powerUp.y,
            }}
            title={`${POWER_TYPES[powerUp.type].monsterName} / ${POWER_TYPES[powerUp.type].runnerName}`}
          >
            {POWER_TYPES[powerUp.type].icon}
          </div>
        )
      ))}
      {iceTraps.map((trap) => {
        const remaining = Math.max(0, Math.ceil((trap.expiresAt - timeNow) / 1000));
        return (
          <div
            className="ice-trap"
            key={trap.id}
            style={{ left: trap.x, top: trap.y }}
          >
            <span>{remaining}</span>
          </div>
        );
      })}
      {roarEffect && (
        <div
          className="roar-effect"
          style={{
            left: roarEffect.x + GAME_CONFIG.player.size / 2,
            top: roarEffect.y + GAME_CONFIG.player.size / 2,
          }}
        />
      )}
      {blastEffect && (
        <div
          className={`stun-beam ${blastEffect.blocked ? 'blocked' : ''}`}
          style={{
            '--beam-angle': `${Math.atan2(
              blastEffect.end.y - blastEffect.start.y,
              blastEffect.end.x - blastEffect.start.x,
            )}rad`,
            '--beam-length': `${Math.hypot(
              blastEffect.end.x - blastEffect.start.x,
              blastEffect.end.y - blastEffect.start.y,
            )}px`,
            left: blastEffect.start.x,
            top: blastEffect.start.y,
          }}
        />
      )}
      {Object.entries(map.teleports).map(([id, destination]) => (
        <div
          className="teleport-pad"
          key={id}
          style={{ left: destination.x, top: destination.y }}
        />
      ))}
      {Object.entries(teleports).map(([playerId, teleport]) => {
        if (!teleport) {
          return null;
        }

        if (teleport.mode === 'selecting') {
          return (
            <div className="teleport-choice" key={playerId}>
              <div>Choose a corner</div>
              <span className="choice top-left">{playerId === 'p1' ? 'W' : 'UP'}</span>
              <span className="choice top-right">{playerId === 'p1' ? 'D' : 'RIGHT'}</span>
              <span className="choice bottom-left">{playerId === 'p1' ? 'A' : 'LEFT'}</span>
              <span className="choice bottom-right">{playerId === 'p1' ? 'S' : 'DOWN'}</span>
              <em>Power key or Esc cancels</em>
            </div>
          );
        }

        return (
          <div key={playerId}>
            <div
              className="portal-effect from"
              style={{
                left: teleport.from.x + GAME_CONFIG.player.size / 2,
                top: teleport.from.y + GAME_CONFIG.player.size / 2,
              }}
            />
            <div
              className="portal-effect to"
              style={{
                left: teleport.target.x + GAME_CONFIG.player.size / 2,
                top: teleport.target.y + GAME_CONFIG.player.size / 2,
              }}
            />
          </div>
        );
      })}
      {clones.map((clone) => (
        <Player
          clone
          effects={{
            trackingUntil: effects[clone.owner].trackingUntil,
            cloneExpiresAt: clone.expiresAt,
          }}
          isIt={clone.role === 'monster'}
          key={clone.id}
          number={clone.owner === 'p1' ? '1' : '2'}
          player={clone}
          timeNow={timeNow}
        />
      ))}
      <Player
        effects={effects.p1}
        isIt={itPlayer === 'p1'}
        number="1"
        player={players.p1}
        timeNow={timeNow}
      />
      <Player
        effects={effects.p2}
        isIt={itPlayer === 'p2'}
        number="2"
        player={players.p2}
        timeNow={timeNow}
      />
      {message && <div className="tag-message">{message}</div>}
    </section>
  );
}
