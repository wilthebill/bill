export default function Obstacle({ obstacle }) {
  return (
    <div
      className={`obstacle ${obstacle.type}`}
      style={{
        left: obstacle.x,
        top: obstacle.y,
        width: obstacle.width,
        height: obstacle.height,
      }}
    >
      {obstacle.type === 'bench' && <span />}
    </div>
  );
}
