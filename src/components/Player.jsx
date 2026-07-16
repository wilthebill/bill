export default function Player({ player, isIt, number, effects, timeNow, clone = false }) {
  const classNames = [
    'player',
    isIt ? 'is-it monster' : 'runner',
    clone ? 'is-clone' : '',
    clone && effects?.cloneExpiresAt - timeNow < 2500 ? 'clone-fading' : '',
    effects?.burstUntil > timeNow ? 'is-speeding' : '',
    effects?.shield ? 'has-shield' : '',
    effects?.invisibleUntil > timeNow ? 'is-invisible' : '',
    effects?.protectedUntil > timeNow ? 'is-protected' : '',
    effects?.slidingUntil > timeNow ? 'is-sliding' : '',
    effects?.stunnedUntil > timeNow ? 'is-stunned' : '',
    effects?.stunImmuneUntil > timeNow && effects?.stunnedUntil <= timeNow ? 'is-stun-immune' : '',
    effects?.trackingUntil > timeNow ? 'is-tracked' : '',
  ].filter(Boolean).join(' ');
  const stunSeconds = Math.ceil(Math.max(0, effects?.stunnedUntil - timeNow) / 1000);

  return (
    <div
      className={classNames}
      style={{
        '--player-color': player.color,
        transform: `translate(${player.x}px, ${player.y}px)`,
      }}
    >
      {isIt && <span className="it-badge">MONSTER</span>}
      {stunSeconds > 0 && <span className="stun-countdown">{stunSeconds}</span>}
      <span className="player-number">{number}</span>
    </div>
  );
}
