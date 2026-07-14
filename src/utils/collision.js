export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function insetRect(rect, inset = 0) {
  return {
    x: rect.x + inset,
    y: rect.y + inset,
    width: rect.width - inset * 2,
    height: rect.height - inset * 2,
  };
}

export function expandRect(rect, amount = 0) {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}

export function playerRect(player, size) {
  return {
    x: player.x,
    y: player.y,
    width: size,
    height: size,
  };
}

export function obstacleRect(obstacle) {
  return insetRect(obstacle, obstacle.collisionInset ?? 0);
}

export function isRectInside(rect, bounds) {
  return (
    rect.x >= bounds.x &&
    rect.y >= bounds.y &&
    rect.x + rect.width <= bounds.x + bounds.width &&
    rect.y + rect.height <= bounds.y + bounds.height
  );
}

export function isPositionValidForPlayer({
  position,
  playerSize,
  obstacles,
  arenaBounds,
  otherPlayers = [],
  clearance = 0,
}) {
  const bounds = expandRect(playerRect(position, playerSize), clearance);

  if (!isRectInside(bounds, arenaBounds)) {
    return false;
  }

  const hitObstacle = obstacles.some((obstacle) =>
    rectsOverlap(bounds, obstacleRect(obstacle)),
  );

  if (hitObstacle) {
    return false;
  }

  return otherPlayers.every((otherPlayer) => {
    const otherBounds = expandRect(playerRect(otherPlayer, playerSize), clearance);
    return !rectsOverlap(bounds, otherBounds);
  });
}

export function centersTouch(a, b, size, distance) {
  const ax = a.x + size / 2;
  const ay = a.y + size / 2;
  const bx = b.x + size / 2;
  const by = b.y + size / 2;
  return Math.hypot(ax - bx, ay - by) <= distance;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
