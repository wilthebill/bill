import { GAME_CONFIG, POWER_TYPES } from '../config/gameConfig.js';
import {
  expandRect,
  isPositionValidForPlayer,
  isRectInside,
  obstacleRect,
  playerRect,
  rectsOverlap,
} from './collision.js';

const ARENA_BOUNDS = {
  x: 0,
  y: 0,
  width: GAME_CONFIG.arena.width,
  height: GAME_CONFIG.arena.height,
};

const PLAYER_SIZE = GAME_CONFIG.player.size;
const CLEARANCE = GAME_CONFIG.player.spawnClearance;
const POWERUP_SIZE = 28;
const MIN_OPEN_DIRECTIONS = 2;

function pointToPlayerPosition(point) {
  return { x: point.x, y: point.y };
}

function namedPointRect(point, size = PLAYER_SIZE) {
  return { x: point.x, y: point.y, width: size, height: size };
}

function isSafePlayerSpot(map, position, otherPlayers = [], clearance = CLEARANCE) {
  return isPositionValidForPlayer({
    position,
    playerSize: PLAYER_SIZE,
    obstacles: map.obstacles,
    arenaBounds: ARENA_BOUNDS,
    otherPlayers,
    clearance,
  });
}

function hasOpenRoom(map, position) {
  const step = PLAYER_SIZE + CLEARANCE;
  const directions = [
    { x: step, y: 0 },
    { x: -step, y: 0 },
    { x: 0, y: step },
    { x: 0, y: -step },
  ];

  return (
    directions.filter((direction) =>
      isSafePlayerSpot(map, { x: position.x + direction.x, y: position.y + direction.y }, [], 2),
    ).length >= MIN_OPEN_DIRECTIONS
  );
}

function isPowerUpSafe(map, powerUp, otherPowerUps) {
  const rect = expandRect({ x: powerUp.x, y: powerUp.y, width: POWERUP_SIZE, height: POWERUP_SIZE }, 8);
  const spawnRects = Object.values(map.spawns).map((spawn) => namedPointRect(spawn));
  const teleportRects = Object.values(map.teleports).map((teleport) => namedPointRect(teleport));

  return (
    POWER_TYPES[powerUp.type] &&
    isRectInside(rect, ARENA_BOUNDS) &&
    !map.obstacles.some((obstacle) => rectsOverlap(rect, obstacleRect(obstacle))) &&
    !spawnRects.some((spawnRect) => rectsOverlap(rect, spawnRect)) &&
    !teleportRects.some((teleportRect) => rectsOverlap(rect, teleportRect)) &&
    !otherPowerUps.some((other) => {
      if (other.id === powerUp.id) {
        return false;
      }
      return rectsOverlap(rect, expandRect({ x: other.x, y: other.y, width: POWERUP_SIZE, height: POWERUP_SIZE }, 4));
    })
  );
}

function canReach(map, start, destination) {
  const cell = 32;
  const maxX = GAME_CONFIG.arena.width - PLAYER_SIZE;
  const maxY = GAME_CONFIG.arena.height - PLAYER_SIZE;
  const keyFor = (position) => `${Math.round(position.x / cell)}:${Math.round(position.y / cell)}`;
  const snap = (position) => ({
    x: Math.min(maxX, Math.max(0, Math.round(position.x / cell) * cell)),
    y: Math.min(maxY, Math.max(0, Math.round(position.y / cell) * cell)),
  });
  const targetRect = expandRect(playerRect(destination, PLAYER_SIZE), cell);
  const startCell = snap(start);
  const queue = [startCell];
  const seen = new Set([keyFor(startCell)]);
  const directions = [
    { x: cell, y: 0 },
    { x: -cell, y: 0 },
    { x: 0, y: cell },
    { x: 0, y: -cell },
  ];

  while (queue.length) {
    const current = queue.shift();
    if (rectsOverlap(playerRect(current, PLAYER_SIZE), targetRect)) {
      return true;
    }

    for (const direction of directions) {
      const next = {
        x: Math.min(maxX, Math.max(0, current.x + direction.x)),
        y: Math.min(maxY, Math.max(0, current.y + direction.y)),
      };
      const key = keyFor(next);
      if (seen.has(key) || !isSafePlayerSpot(map, next, [], 0)) {
        continue;
      }
      seen.add(key);
      queue.push(next);
    }
  }

  return false;
}

export function validateMapLayout(map) {
  const errors = [];
  const obstacles = map.obstacles ?? [];
  const powerUps = map.powerUps ?? [];
  const spawns = map.spawns ?? {};
  const teleports = map.teleports ?? {};

  obstacles.forEach((obstacle, index) => {
    const rect = obstacleRect(obstacle);
    if (!isRectInside(rect, ARENA_BOUNDS)) {
      errors.push(`${map.name}: ${obstacle.id} is outside the playable area.`);
    }

    obstacles.slice(index + 1).forEach((other) => {
      if (rectsOverlap(rect, obstacleRect(other))) {
        errors.push(`${map.name}: ${obstacle.id} overlaps ${other.id}.`);
      }
    });
  });

  if (!spawns.p1 || !spawns.p2) {
    errors.push(`${map.name}: both player spawns are required.`);
  } else {
    const p1Safe = isSafePlayerSpot(map, spawns.p1, [], CLEARANCE);
    const p2Safe = isSafePlayerSpot(map, spawns.p2, [spawns.p1], CLEARANCE);
    if (!p1Safe) errors.push(`${map.name}: Player 1 spawn is blocked.`);
    if (!p2Safe) errors.push(`${map.name}: Player 2 spawn is blocked or overlaps Player 1.`);
    if (spawns.p1.x > GAME_CONFIG.arena.width / 2 - PLAYER_SIZE) {
      errors.push(`${map.name}: Player 1 spawn is not on the left side.`);
    }
    if (spawns.p2.x < GAME_CONFIG.arena.width / 2) {
      errors.push(`${map.name}: Player 2 spawn is not on the right side.`);
    }
    if (p1Safe && !hasOpenRoom(map, spawns.p1)) {
      errors.push(`${map.name}: Player 1 spawn does not have enough open exits.`);
    }
    if (p2Safe && !hasOpenRoom(map, spawns.p2)) {
      errors.push(`${map.name}: Player 2 spawn does not have enough open exits.`);
    }
  }

  Object.entries(teleports).forEach(([corner, destination]) => {
    if (!isSafePlayerSpot(map, destination, [], CLEARANCE)) {
      errors.push(`${map.name}: ${corner} teleport destination is blocked.`);
    } else if (!hasOpenRoom(map, destination)) {
      errors.push(`${map.name}: ${corner} teleport destination lacks open space.`);
    }
  });

  powerUps.forEach((powerUp) => {
    if (!isPowerUpSafe(map, powerUp, powerUps)) {
      errors.push(`${map.name}: ${powerUp.id} is not in a safe approved location.`);
    }
  });

  if (spawns.p1 && spawns.p2 && isSafePlayerSpot(map, spawns.p1, [], 0)) {
    const importantPoints = [
      pointToPlayerPosition(spawns.p2),
      ...Object.values(teleports).map(pointToPlayerPosition),
      ...powerUps.map((powerUp) => ({ x: powerUp.x, y: powerUp.y })),
    ];
    importantPoints.forEach((point) => {
      if (!canReach(map, spawns.p1, point)) {
        errors.push(`${map.name}: an important point at ${Math.round(point.x)},${Math.round(point.y)} is unreachable.`);
      }
    });
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
