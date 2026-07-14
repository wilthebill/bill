import { GAME_CONFIG, OBSTACLES } from '../config/gameConfig';
import Obstacle from './Obstacle';
import Player from './Player';

export default function GameArena({ players, itPlayer, tagFlash, message }) {
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
      {OBSTACLES.map((obstacle) => (
        <Obstacle key={obstacle.id} obstacle={obstacle} />
      ))}
      <Player isIt={itPlayer === 'p1'} number="1" player={players.p1} />
      <Player isIt={itPlayer === 'p2'} number="2" player={players.p2} />
      {message && <div className="tag-message">{message}</div>}
    </section>
  );
}
