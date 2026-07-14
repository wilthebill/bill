export default function Player({ player, isIt, number }) {
  return (
    <div
      className={`player ${isIt ? 'is-it' : ''}`}
      style={{
        '--player-color': player.color,
        transform: `translate(${player.x}px, ${player.y}px)`,
      }}
    >
      {isIt && <span className="it-badge">IT</span>}
      <span className="player-number">{number}</span>
    </div>
  );
}
