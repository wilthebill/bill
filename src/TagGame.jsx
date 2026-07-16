import { useCallback, useEffect, useRef, useState } from 'react';
import Countdown from './components/Countdown';
import GameArena from './components/GameArena';
import GameHUD from './components/GameHUD';
import ResultsScreen from './components/ResultsScreen';
import StartScreen from './components/StartScreen';
import {
  GAME_CONFIG,
  COLOR_CHOICES,
  MAPS,
  PLAYER_DEFAULTS,
  POWER_RULES,
  POWER_TYPES,
} from './config/gameConfig';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { useTagSound } from './hooks/useTagSound';
import {
  centersTouch,
  clamp,
  isPositionValidForPlayer,
  obstacleRect,
  playerRect,
  rectsOverlap,
} from './utils/collision';
import { validateMapLayout } from './utils/mapValidation';

const PLAYER_IDS = ['p1', 'p2'];
let activeMapConfig = MAPS[0];
const ARENA_BOUNDS = {
  x: 0,
  y: 0,
  width: GAME_CONFIG.arena.width,
  height: GAME_CONFIG.arena.height,
};
const SPAWN_SIDES = {
  p1: { minX: 0, maxX: GAME_CONFIG.arena.width / 2 - GAME_CONFIG.player.size },
  p2: {
    minX: GAME_CONFIG.arena.width / 2,
    maxX: GAME_CONFIG.arena.width - GAME_CONFIG.player.size,
  },
};
const FALLBACK_SPAWNS = {
  p1: { x: 82, y: GAME_CONFIG.arena.height / 2 - GAME_CONFIG.player.size / 2 },
  p2: {
    x: GAME_CONFIG.arena.width - 82 - GAME_CONFIG.player.size,
    y: GAME_CONFIG.arena.height / 2 - GAME_CONFIG.player.size / 2,
  },
};

function sanitizePlayerName(id, value) {
  const clean = `${value ?? ''}`
    .replace(/[^a-zA-Z0-9 ._-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12);
  return clean || PLAYER_DEFAULTS[id].name;
}

function sanitizePlayers(players) {
  const p1Color = players.p1.color || PLAYER_DEFAULTS.p1.color;
  const p2Fallback =
    COLOR_CHOICES.find((color) => color !== p1Color) || PLAYER_DEFAULTS.p2.color;
  const p2Color =
    players.p2.color && players.p2.color !== p1Color ? players.p2.color : p2Fallback;

  return {
    p1: {
      ...players.p1,
      name: sanitizePlayerName('p1', players.p1.name),
      color: p1Color,
    },
    p2: {
      ...players.p2,
      name: sanitizePlayerName('p2', players.p2.name),
      color: p2Color,
    },
  };
}

function loadSavedPlayers() {
  try {
    const saved = JSON.parse(window.localStorage.getItem('tag-players') || 'null');
    if (!saved?.p1 || !saved?.p2) {
      return makeInitialPlayers();
    }

    return sanitizePlayers({
      p1: { ...PLAYER_DEFAULTS.p1, ...saved.p1, ...mapConfig().spawns.p1 },
      p2: { ...PLAYER_DEFAULTS.p2, ...saved.p2, ...mapConfig().spawns.p2 },
    });
  } catch {
    return makeInitialPlayers();
  }
}

function mapConfig() {
  return activeMapConfig;
}

const makeInitialPlayers = () => ({
  p1: { ...PLAYER_DEFAULTS.p1, ...mapConfig().spawns.p1 },
  p2: { ...PLAYER_DEFAULTS.p2, ...mapConfig().spawns.p2 },
});

const makePowerState = () => ({
  p1: { held: 'surge', cooldownUntil: 0 },
  p2: { held: 'shadow', cooldownUntil: 0 },
});

const makeEffectState = () => ({
  p1: {
    burstUntil: 0,
    invisibleUntil: 0,
    protectedUntil: 0,
    shield: false,
    slowedUntil: 0,
    slidingUntil: 0,
    slideVector: { x: 0, y: 0 },
    stunnedUntil: 0,
    stunImmuneUntil: 0,
    trackingUntil: 0,
  },
  p2: {
    burstUntil: 0,
    invisibleUntil: 0,
    protectedUntil: 0,
    shield: false,
    slowedUntil: 0,
    slidingUntil: 0,
    slideVector: { x: 0, y: 0 },
    stunnedUntil: 0,
    stunImmuneUntil: 0,
    trackingUntil: 0,
  },
});

const makeTeleportState = () => ({ p1: null, p2: null });

const makeIceTraps = () => [];

const makeClones = () => [];

const makePowerUps = () =>
  mapConfig().powerUps.map((spawn) => ({ ...spawn, availableAt: 0 }));

function nowMs() {
  return performance.now();
}

function otherPlayer(id) {
  return id === 'p1' ? 'p2' : 'p1';
}

function roleForPlayer(id, itPlayer) {
  return id === itPlayer ? 'monster' : 'runner';
}

function powerNameFor(id, itPlayer, powers) {
  const held = powers[id].held;
  if (!held) {
    return 'No power';
  }

  if (held === 'portal' || held === 'stun' || held === 'ice' || held === 'clone') {
    return POWER_TYPES[held].monsterName;
  }

  return roleForPlayer(id, itPlayer) === 'monster'
    ? POWER_TYPES[held].monsterName
    : POWER_TYPES[held].runnerName;
}

function clampToSpawnSide(position, playerId) {
  const side = SPAWN_SIDES[playerId];
  return {
    x: clamp(position.x, side.minX, side.maxX),
    y: clamp(position.y, 0, GAME_CONFIG.arena.height - GAME_CONFIG.player.size),
  };
}

function findSafeSpawnPosition(playerId, preferredPosition, otherPlayers = []) {
  const playerSize = GAME_CONFIG.player.size;
  const clearance = GAME_CONFIG.player.spawnClearance;
  const side = SPAWN_SIDES[playerId];
  const isValid = (position) =>
    position.x >= side.minX &&
    position.x <= side.maxX &&
    isPositionValidForPlayer({
      position,
      playerSize,
      obstacles: mapConfig().obstacles,
      arenaBounds: ARENA_BOUNDS,
      otherPlayers,
      clearance,
    });

  const preferred = clampToSpawnSide(preferredPosition, playerId);
  if (isValid(preferred)) {
    return preferred;
  }

  const step = playerSize + clearance;
  for (let radius = 1; radius <= 7; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
          continue;
        }

        const candidate = clampToSpawnSide(
          { x: preferred.x + dx * step, y: preferred.y + dy * step },
          playerId,
        );
        if (isValid(candidate)) {
          return candidate;
        }
      }
    }
  }

  const fallback = clampToSpawnSide(FALLBACK_SPAWNS[playerId], playerId);
  if (isValid(fallback)) {
    return fallback;
  }

  for (let y = 0; y <= GAME_CONFIG.arena.height - playerSize; y += step) {
    for (let x = side.minX; x <= side.maxX; x += step) {
      const candidate = { x, y };
      if (isValid(candidate)) {
        return candidate;
      }
    }
  }

  return fallback;
}

function makeSafePlayerPositions(players) {
  const p1Position = findSafeSpawnPosition('p1', mapConfig().spawns.p1);
  const p2Position = findSafeSpawnPosition('p2', mapConfig().spawns.p2, [p1Position]);

  return {
    p1: { ...players.p1, ...p1Position, facing: { x: 1, y: 0 } },
    p2: { ...players.p2, ...p2Position, facing: { x: -1, y: 0 } },
  };
}

function positionHitsObstacle(position) {
  return mapConfig().obstacles.some((obstacle) =>
    rectsOverlap(playerRect(position, GAME_CONFIG.player.size), obstacleRect(obstacle)),
  );
}

function isSafePlayerPosition(position, otherPlayers = [], clearance = 0) {
  return isPositionValidForPlayer({
    position,
    playerSize: GAME_CONFIG.player.size,
    obstacles: mapConfig().obstacles,
    arenaBounds: ARENA_BOUNDS,
    otherPlayers,
    clearance,
  });
}

function findNearestSafePlayerPosition(position, otherPlayers = [], activeTraps = []) {
  const step = GAME_CONFIG.player.size / 2;
  const maxX = GAME_CONFIG.arena.width - GAME_CONFIG.player.size;
  const maxY = GAME_CONFIG.arena.height - GAME_CONFIG.player.size;
  const isSafe = (candidate) =>
    isSafePlayerPosition(candidate, otherPlayers, 0) &&
    !activeTraps.some((trap) => rectsOverlap(playerRect(candidate, GAME_CONFIG.player.size), trapRect(trap)));

  const first = { x: clamp(position.x, 0, maxX), y: clamp(position.y, 0, maxY) };
  if (isSafe(first)) {
    return first;
  }

  for (let radius = 1; radius <= 10; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
          continue;
        }

        const candidate = {
          x: clamp(first.x + dx * step, 0, maxX),
          y: clamp(first.y + dy * step, 0, maxY),
        };
        if (isSafe(candidate)) {
          return candidate;
        }
      }
    }
  }

  return null;
}

function tryStep(player, axis, amount) {
  const size = GAME_CONFIG.player.size;
  const next = { ...player };
  next[axis] = clamp(
    next[axis] + amount,
    0,
    axis === 'x' ? GAME_CONFIG.arena.width - size : GAME_CONFIG.arena.height - size,
  );

  return positionHitsObstacle(next) ? player : next;
}

function resolveMovement(player, vector, deltaSeconds, speed) {
  let next = { ...player };
  next = tryStep(next, 'x', vector.x * speed * deltaSeconds);
  next = tryStep(next, 'y', vector.y * speed * deltaSeconds);
  if (vector.x || vector.y) {
    next.facing = vector;
  }
  return next;
}

function resolveDash(player, vector) {
  const direction = vector.x || vector.y ? vector : player.facing ?? { x: 1, y: 0 };
  const dashDistance = POWER_RULES.runner.surge.distance;
  const steps = 12;
  let next = { ...player };

  for (let index = 0; index < steps; index += 1) {
    const movedX = tryStep(next, 'x', (direction.x * dashDistance) / steps);
    const movedY = tryStep(movedX, 'y', (direction.y * dashDistance) / steps);
    if (movedY.x === next.x && movedY.y === next.y) {
      break;
    }
    next = movedY;
  }

  return { ...next, facing: direction };
}

function getMoveVector(keys, id) {
  const vector = { x: 0, y: 0 };

  if (id === 'p1') {
    if (keys.has('a')) vector.x -= 1;
    if (keys.has('d')) vector.x += 1;
    if (keys.has('w')) vector.y -= 1;
    if (keys.has('s')) vector.y += 1;
  } else {
    if (keys.has('ArrowLeft')) vector.x -= 1;
    if (keys.has('ArrowRight')) vector.x += 1;
    if (keys.has('ArrowUp')) vector.y -= 1;
    if (keys.has('ArrowDown')) vector.y += 1;
  }

  const length = Math.hypot(vector.x, vector.y);
  return length ? { x: vector.x / length, y: vector.y / length } : vector;
}

function distanceBetweenPlayers(a, b) {
  const ax = a.x + GAME_CONFIG.player.size / 2;
  const ay = a.y + GAME_CONFIG.player.size / 2;
  const bx = b.x + GAME_CONFIG.player.size / 2;
  const by = b.y + GAME_CONFIG.player.size / 2;
  return Math.hypot(ax - bx, ay - by);
}

function centerOf(player) {
  return {
    x: player.x + GAME_CONFIG.player.size / 2,
    y: player.y + GAME_CONFIG.player.size / 2,
  };
}

function automaticStunResult(source, target) {
  const start = centerOf(source);
  const end = centerOf(target);
  const distance = Math.hypot(end.x - start.x, end.y - start.y);

  return {
    distance,
    end,
    hit: distance <= POWER_RULES.shared.stun.range,
    start,
  };
}

function getTeleportChoice(keys, id) {
  if (id === 'p1') {
    if (keys.has('w')) return 'topLeft';
    if (keys.has('d')) return 'topRight';
    if (keys.has('a')) return 'bottomLeft';
    if (keys.has('s')) return 'bottomRight';
    return null;
  }

  if (keys.has('ArrowUp')) return 'topLeft';
  if (keys.has('ArrowRight')) return 'topRight';
  if (keys.has('ArrowLeft')) return 'bottomLeft';
  if (keys.has('ArrowDown')) return 'bottomRight';
  return null;
}

function findSafeTeleportPosition(corner, playerId, allPlayers, activeTraps = [], activePowerUps = []) {
  const preferred = mapConfig().teleports[corner];
  const other = otherPlayer(playerId);
  const otherPlayers = allPlayers?.[other] ? [allPlayers[other]] : [];
  const step = GAME_CONFIG.player.size + GAME_CONFIG.player.spawnClearance;
  const maxX = GAME_CONFIG.arena.width - GAME_CONFIG.player.size;
  const maxY = GAME_CONFIG.arena.height - GAME_CONFIG.player.size;

  const makeCandidate = (dx, dy) => ({
    x: clamp(preferred.x + dx * step, 0, maxX),
    y: clamp(preferred.y + dy * step, 0, maxY),
  });
  const isDestinationSafe = (candidate) => {
    const bounds = playerRect(candidate, GAME_CONFIG.player.size);
    return (
      isSafePlayerPosition(candidate, otherPlayers, GAME_CONFIG.player.spawnClearance) &&
      !activeTraps.some((trap) => rectsOverlap(bounds, trapRect(trap))) &&
      !activePowerUps.some(
        (powerUp) => powerUp.availableAt <= nowMs() && rectsOverlap(bounds, powerUpRect(powerUp)),
      )
    );
  };

  const first = makeCandidate(0, 0);
  if (isDestinationSafe(first)) {
    return first;
  }

  for (let radius = 1; radius <= 5; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
          continue;
        }

        const candidate = makeCandidate(dx, dy);
        if (isDestinationSafe(candidate)) {
          return candidate;
        }
      }
    }
  }

  return null;
}

function trapRect(trap) {
  return {
    x: trap.x,
    y: trap.y,
    width: POWER_RULES.shared.ice.size,
    height: POWER_RULES.shared.ice.size,
  };
}

function isTrapPositionSafe(position, allPlayers, activeTraps) {
  const rect = trapRect(position);
  const spawnRects = Object.values(mapConfig().spawns).map((spawn) =>
    playerRect(spawn, GAME_CONFIG.player.size),
  );
  const teleportRects = Object.values(mapConfig().teleports).map((destination) =>
    playerRect(destination, GAME_CONFIG.player.size),
  );
  const playerRects = PLAYER_IDS.map((id) => playerRect(allPlayers[id], GAME_CONFIG.player.size));

  return (
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x + rect.width <= GAME_CONFIG.arena.width &&
    rect.y + rect.height <= GAME_CONFIG.arena.height &&
    !mapConfig().obstacles.some((obstacle) => rectsOverlap(rect, obstacleRect(obstacle))) &&
    !playerRects.some((otherRect) => rectsOverlap(rect, otherRect)) &&
    !spawnRects.some((spawnRect) => rectsOverlap(rect, spawnRect)) &&
    !teleportRects.some((teleportRect) => rectsOverlap(rect, teleportRect)) &&
    !activeTraps.some((trap) => rectsOverlap(rect, trapRect(trap)))
  );
}

function findSafeIceTrapPosition(player, allPlayers, activeTraps) {
  const size = POWER_RULES.shared.ice.size;
  const facing = player.facing ?? { x: 1, y: 0 };
  const base = {
    x: player.x - facing.x * (size + 8),
    y: player.y - facing.y * (size + 8),
  };
  const step = size;

  const makeCandidate = (dx, dy) => ({
    x: clamp(base.x + dx * step, 0, GAME_CONFIG.arena.width - size),
    y: clamp(base.y + dy * step, 0, GAME_CONFIG.arena.height - size),
  });

  const preferred = makeCandidate(0, 0);
  if (isTrapPositionSafe(preferred, allPlayers, activeTraps)) {
    return preferred;
  }

  for (let radius = 1; radius <= 4; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
          continue;
        }

        const candidate = makeCandidate(dx, dy);
        if (isTrapPositionSafe(candidate, allPlayers, activeTraps)) {
          return candidate;
        }
      }
    }
  }

  return null;
}

function cloneRect(clone) {
  return playerRect(clone, GAME_CONFIG.player.size);
}

function isClonePositionSafe(position, activeTraps = []) {
  return (
    isSafePlayerPosition(position, [], 0) &&
    !activeTraps.some((trap) => rectsOverlap(cloneRect(position), trapRect(trap)))
  );
}

function findSafeClonePosition(player, activeTraps = []) {
  const facing = player.facing ?? { x: 1, y: 0 };
  const side = { x: -facing.y, y: facing.x };
  const offsets = [
    side,
    { x: -side.x, y: -side.y },
    { x: -facing.x, y: -facing.y },
    facing,
    { x: side.x + facing.x, y: side.y + facing.y },
    { x: -side.x + facing.x, y: -side.y + facing.y },
  ];

  for (const offset of offsets) {
    const candidate = {
      x: clamp(player.x + offset.x * (GAME_CONFIG.player.size + 10), 0, GAME_CONFIG.arena.width - GAME_CONFIG.player.size),
      y: clamp(player.y + offset.y * (GAME_CONFIG.player.size + 10), 0, GAME_CONFIG.arena.height - GAME_CONFIG.player.size),
    };

    if (isClonePositionSafe(candidate, activeTraps)) {
      return candidate;
    }
  }

  return null;
}

function randomCloneDirection(seed) {
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 0.7, y: 0.7 },
    { x: -0.7, y: 0.7 },
    { x: 0.7, y: -0.7 },
    { x: -0.7, y: -0.7 },
  ];
  return directions[Math.abs(Math.floor(seed)) % directions.length];
}

function wantsPower(keys, id) {
  return id === 'p1' ? keys.has('f') : keys.has('Enter');
}

function powerUpRect(powerUp) {
  return { x: powerUp.x, y: powerUp.y, width: 28, height: 28 };
}

function pushMonsterBack(monster, runner) {
  const mx = monster.x + GAME_CONFIG.player.size / 2;
  const my = monster.y + GAME_CONFIG.player.size / 2;
  const rx = runner.x + GAME_CONFIG.player.size / 2;
  const ry = runner.y + GAME_CONFIG.player.size / 2;
  const dx = mx - rx;
  const dy = my - ry;
  const length = Math.hypot(dx, dy) || 1;
  const vector = { x: dx / length, y: dy / length };
  return resolveDash({ ...monster, facing: vector }, vector);
}

export default function TagGame() {
  const savedMapId = window.localStorage.getItem('tag-selected-map') || MAPS[0].id;
  const [selectedMapId, setSelectedMapId] = useState(
    MAPS.some((map) => map.id === savedMapId) ? savedMapId : MAPS[0].id,
  );
  const [currentMapId, setCurrentMapId] = useState(selectedMapId);
  const [screen, setScreen] = useState('start');
  const [players, setPlayers] = useState(loadSavedPlayers);
  const [positions, setPositions] = useState(() => makeSafePlayerPositions(loadSavedPlayers()));
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [powers, setPowers] = useState(makePowerState);
  const [effects, setEffects] = useState(makeEffectState);
  const [powerUps, setPowerUps] = useState(makePowerUps);
  const [teleports, setTeleports] = useState(makeTeleportState);
  const [iceTraps, setIceTraps] = useState(makeIceTraps);
  const [clones, setClones] = useState(makeClones);
  const [itPlayer, setItPlayer] = useState('p1');
  const [countdown, setCountdown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(GAME_CONFIG.roundDurationMs);
  const [tagMessage, setTagMessage] = useState('');
  const [tagFlash, setTagFlash] = useState(false);
  const [roarEffect, setRoarEffect] = useState(null);
  const [blastEffect, setBlastEffect] = useState(null);
  const [winner, setWinner] = useState('tie');
  const [displayTime, setDisplayTime] = useState(0);
  const [mapError, setMapError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const selectedMap = MAPS.find((map) => map.id === selectedMapId) ?? MAPS[0];
  const currentMap = MAPS.find((map) => map.id === currentMapId) ?? selectedMap;
  const keysRef = useKeyboardControls(screen === 'playing' && countdown <= 0);
  const { muted, toggleMuted, playTagSound } = useTagSound();
  const animationFrameRef = useRef(null);
  const lastFrameRef = useRef(null);
  const cooldownUntilRef = useRef(0);
  const countdownTimerRef = useRef(null);
  const powerPressedRef = useRef({ p1: false, p2: false });
  const startLockRef = useRef(false);
  const playersRef = useRef(positions);
  const powersRef = useRef(powers);
  const effectsRef = useRef(effects);
  const powerUpsRef = useRef(powerUps);
  const teleportsRef = useRef(teleports);
  const iceTrapsRef = useRef(iceTraps);
  const clonesRef = useRef(clones);
  const itPlayerRef = useRef(itPlayer);
  const scoresRef = useRef(scores);
  const timeRemainingRef = useRef(timeRemaining);

  useEffect(() => {
    playersRef.current = positions;
  }, [positions]);

  useEffect(() => {
    powersRef.current = powers;
  }, [powers]);

  useEffect(() => {
    effectsRef.current = effects;
  }, [effects]);

  useEffect(() => {
    powerUpsRef.current = powerUps;
  }, [powerUps]);

  useEffect(() => {
    teleportsRef.current = teleports;
  }, [teleports]);

  useEffect(() => {
    iceTrapsRef.current = iceTraps;
  }, [iceTraps]);

  useEffect(() => {
    clonesRef.current = clones;
  }, [clones]);

  useEffect(() => {
    itPlayerRef.current = itPlayer;
  }, [itPlayer]);

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  useEffect(() => {
    const cleanPlayers = sanitizePlayers(players);
    window.localStorage.setItem(
      'tag-players',
      JSON.stringify({
        p1: { name: cleanPlayers.p1.name, color: cleanPlayers.p1.color },
        p2: { name: cleanPlayers.p2.name, color: cleanPlayers.p2.color },
      }),
    );
  }, [players]);

  const finishRound = useCallback(() => {
    const finalScores = scoresRef.current;
    const finalWinner =
      finalScores.p1 === finalScores.p2
        ? 'tie'
        : finalScores.p1 > finalScores.p2
          ? 'p1'
          : 'p2';
    setWinner(finalWinner);
    setScreen('results');
  }, []);

  const showMessage = useCallback((message) => {
    setTagMessage(message);
    window.setTimeout(() => setTagMessage(''), 1300);
  }, []);

  const triggerRoleSwitch = useCallback((tagger, now) => {
    cooldownUntilRef.current = now + GAME_CONFIG.tagCooldownMs;
    setScores((currentScores) => ({
      ...currentScores,
      [tagger]: currentScores[tagger] + 1,
    }));
    setItPlayer(otherPlayer(tagger));
    setTagFlash(true);
    playTagSound();
    showMessage(`${playersRef.current[tagger].name || tagger.toUpperCase()} scored a tag!`);
    window.setTimeout(() => setTagFlash(false), 220);
  }, [playTagSound, showMessage]);

  useEffect(() => {
    if (screen !== 'playing' || countdown > 0) {
      return undefined;
    }

    const tick = (timestamp) => {
      if (!lastFrameRef.current) {
        lastFrameRef.current = timestamp;
      }

      const deltaSeconds = Math.min((timestamp - lastFrameRef.current) / 1000, 0.05);
      lastFrameRef.current = timestamp;

      const keys = keysRef.current;
      setDisplayTime(timestamp);
      let nextPositions = { ...playersRef.current };
      let nextPowers = { ...powersRef.current };
      let nextEffects = { ...effectsRef.current };
      let nextPowerUps = powerUpsRef.current.map((powerUp) => ({ ...powerUp }));
      let nextTeleports = { ...teleportsRef.current };
      let nextIceTraps = iceTrapsRef.current
        .filter((trap) => {
          const alive = trap.expiresAt > timestamp;
          if (!alive) {
            showMessage('An Ice Trap melted!');
          }
          return alive;
        })
        .map((trap) => ({ ...trap }));
      let nextClones = clonesRef.current
        .filter((clone) => {
          const alive = clone.expiresAt > timestamp;
          if (!alive) {
            showMessage('A clone vanished!');
          }
          return alive;
        })
        .map((clone) => ({ ...clone }));
      const currentIt = itPlayerRef.current;
      const runner = otherPlayer(currentIt);

      PLAYER_IDS.forEach((id) => {
        const teleport = nextTeleports[id];
        if (!teleport || teleport.mode !== 'pending' || timestamp < teleport.arriveAt) {
          return;
        }

        nextPositions = {
          ...nextPositions,
          [id]: { ...nextPositions[id], ...teleport.target },
        };
        nextEffects = {
          ...nextEffects,
          [id]: {
            ...nextEffects[id],
            protectedUntil: timestamp + POWER_RULES.shared.portal.protectionMs,
          },
        };
        nextTeleports = { ...nextTeleports, [id]: null };
        showMessage(`${nextPositions[id].name || id.toUpperCase()} teleported!`);
      });

      PLAYER_IDS.forEach((id) => {
        if (nextTeleports[id] || nextEffects[id].stunnedUntil > timestamp) {
          return;
        }

        const role = roleForPlayer(id, currentIt);
        const playerEffects = nextEffects[id];
        const baseSpeed =
          role === 'monster' ? GAME_CONFIG.player.monsterSpeed : GAME_CONFIG.player.speed;
        const burstBonus = playerEffects.burstUntil > timestamp ? 92 : 0;
        const slowPenalty = playerEffects.slowedUntil > timestamp ? 82 : 0;
        const speed = Math.max(118, baseSpeed + burstBonus - slowPenalty);
        const inputVector = getMoveVector(keys, id);
        const sliding = playerEffects.slidingUntil > timestamp;
        const moveVector = sliding
          ? {
              x: playerEffects.slideVector.x * 0.9 + inputVector.x * 0.24,
              y: playerEffects.slideVector.y * 0.9 + inputVector.y * 0.24,
            }
          : inputVector;
        const moveLength = Math.hypot(moveVector.x, moveVector.y);
        nextPositions[id] = resolveMovement(
          nextPositions[id],
          moveLength ? { x: moveVector.x / moveLength, y: moveVector.y / moveLength } : moveVector,
          deltaSeconds,
          sliding ? speed + 32 : speed,
        );
      });

      nextClones = nextClones.map((clone) => {
        let nextClone = { ...clone };
        let direction = clone.direction;

        if (timestamp >= clone.changeDirectionAt || !direction) {
          direction = randomCloneDirection(timestamp + clone.x * 7 + clone.y * 13);
          nextClone.changeDirectionAt = timestamp + 650 + ((timestamp + clone.x + clone.y) % 900);
        }

        const moved = resolveMovement(nextClone, direction, deltaSeconds, POWER_RULES.shared.clone.speed);
        const hitTrap = nextIceTraps.some((trap) => rectsOverlap(cloneRect(moved), trapRect(trap)));

        if ((moved.x === nextClone.x && moved.y === nextClone.y) || hitTrap) {
          direction = randomCloneDirection(timestamp + clone.y * 11);
          nextClone.changeDirectionAt = timestamp + 450;
        } else {
          nextClone = moved;
        }

        const drift = Math.hypot(nextClone.x - (clone.lastX ?? clone.x), nextClone.y - (clone.lastY ?? clone.y));
        if (drift > 4) {
          nextClone.lastX = nextClone.x;
          nextClone.lastY = nextClone.y;
          nextClone.stuckSince = 0;
        } else if (!nextClone.stuckSince) {
          nextClone.stuckSince = timestamp;
        } else if (timestamp - nextClone.stuckSince > 1000) {
          const safe = findSafeClonePosition(clone, nextIceTraps);
          if (safe) {
            nextClone = { ...nextClone, ...safe, lastX: safe.x, lastY: safe.y, stuckSince: 0 };
          }
          direction = randomCloneDirection(timestamp + clone.x * 17);
          nextClone.changeDirectionAt = timestamp + 500;
        }

        if (!isClonePositionSafe(nextClone, nextIceTraps)) {
          const safe = findSafeClonePosition(clone, nextIceTraps);
          if (safe) {
            nextClone = { ...nextClone, ...safe, lastX: safe.x, lastY: safe.y, stuckSince: 0 };
          }
        }

        return { ...nextClone, direction };
      });

      PLAYER_IDS.forEach((id) => {
        const pressed = wantsPower(keys, id);
        const wasPressed = powerPressedRef.current[id];
        const teleport = nextTeleports[id];
        powerPressedRef.current[id] = pressed;

        if (nextEffects[id].stunnedUntil > timestamp) {
          return;
        }

        if (teleport?.mode === 'selecting') {
          if ((pressed && !wasPressed) || keys.has('Escape')) {
            nextTeleports = { ...nextTeleports, [id]: null };
            showMessage('Teleport canceled');
            return;
          }

          const corner = getTeleportChoice(keys, id);
          if (corner) {
            const target = findSafeTeleportPosition(corner, id, nextPositions, nextIceTraps, nextPowerUps);
            if (!target) {
              nextTeleports = { ...nextTeleports, [id]: null };
              showMessage('No safe teleport location available.');
              return;
            }
            nextTeleports = {
              ...nextTeleports,
              [id]: {
                mode: 'pending',
                corner,
                from: { x: nextPositions[id].x, y: nextPositions[id].y },
                target,
                arriveAt: timestamp + POWER_RULES.shared.portal.delayMs,
              },
            };
            nextPowers = {
              ...nextPowers,
              [id]: { held: null, cooldownUntil: 0 },
            };
            showMessage(`${nextPositions[id].name || id.toUpperCase()} opened a corner portal!`);
          }
          return;
        }

        if (teleport?.mode === 'pending') {
          return;
        }

        if (!pressed || wasPressed || !nextPowers[id].held || nextPowers[id].cooldownUntil > timestamp) {
          return;
        }

        const held = nextPowers[id].held;
        if (held === 'portal') {
          nextTeleports = {
            ...nextTeleports,
            [id]: { mode: 'selecting', startedAt: timestamp },
          };
          showMessage(`${nextPositions[id].name || id.toUpperCase()} is choosing a corner`);
          return;
        }

        if (held === 'stun') {
          const target = otherPlayer(id);
          const blast = automaticStunResult(nextPositions[id], nextPositions[target]);
          setBlastEffect({
            id: `${timestamp}`,
            end: blast.end,
            start: centerOf(nextPositions[id]),
          });
          window.setTimeout(() => setBlastEffect(null), 420);

          if (nextEffects[target].protectedUntil > timestamp) {
            showMessage('Opponent has teleport protection.');
          } else if (nextEffects[target].stunImmuneUntil > timestamp) {
            showMessage('Opponent has stun immunity.');
          } else if (nextEffects[target].stunnedUntil > timestamp) {
            showMessage('Opponent is already stunned.');
          } else if (!blast.hit) {
            showMessage('Opponent is out of range.');
          } else if (nextEffects[target].shield) {
            nextEffects = {
              ...nextEffects,
              [target]: { ...nextEffects[target], shield: false },
            };
            nextPowers = {
              ...nextPowers,
              [id]: { held: null, cooldownUntil: timestamp + POWER_RULES.shared.stun.cooldownMs },
            };
            showMessage('Shield blocked Stun Blast!');
          } else {
            nextPowers = {
              ...nextPowers,
              [id]: { held: null, cooldownUntil: timestamp + POWER_RULES.shared.stun.cooldownMs },
            };
            nextEffects = {
              ...nextEffects,
              [target]: {
                ...nextEffects[target],
                stunnedUntil: timestamp + POWER_RULES.shared.stun.durationMs,
                stunImmuneUntil:
                  timestamp + POWER_RULES.shared.stun.durationMs + POWER_RULES.shared.stun.immunityMs,
              },
            };
            nextTeleports = { ...nextTeleports, [target]: null };
            showMessage(`${nextPositions[target].name || target.toUpperCase()} is stunned!`);
          }
          return;
        }

        if (held === 'ice') {
          const existingTrap = nextIceTraps.find((trap) => trap.owner === id);
          if (existingTrap) {
            showMessage('You already have an Ice Trap active.');
            return;
          }

          const trapPosition = findSafeIceTrapPosition(nextPositions[id], nextPositions, nextIceTraps);
          if (!trapPosition) {
            showMessage('No room to place Ice Trap.');
            return;
          }

          nextIceTraps = [
            ...nextIceTraps,
            {
              id: `${id}-${timestamp}`,
              owner: id,
              x: trapPosition.x,
              y: trapPosition.y,
              expiresAt: timestamp + POWER_RULES.shared.ice.durationMs,
            },
          ];
          nextPowers = {
            ...nextPowers,
            [id]: { held: null, cooldownUntil: 0 },
          };
          showMessage(`${nextPositions[id].name || id.toUpperCase()} placed an Ice Trap!`);
          return;
        }

        if (held === 'clone') {
          if (nextClones.some((clone) => clone.owner === id)) {
            showMessage('You already have a clone active.');
            return;
          }

          const clonePosition = findSafeClonePosition(nextPositions[id], nextIceTraps);
          if (!clonePosition) {
            showMessage('No safe spot for a clone.');
            return;
          }

          nextClones = [
            ...nextClones,
            {
              id: `${id}-${timestamp}`,
              owner: id,
              role: roleForPlayer(id, currentIt),
              color: nextPositions[id].color,
              name: nextPositions[id].name,
              x: clonePosition.x,
              y: clonePosition.y,
              facing: nextPositions[id].facing,
              direction: randomCloneDirection(timestamp),
              changeDirectionAt: timestamp + 700,
              expiresAt: timestamp + POWER_RULES.shared.clone.durationMs,
              lastX: clonePosition.x,
              lastY: clonePosition.y,
              stuckSince: 0,
            },
          ];
          nextPowers = {
            ...nextPowers,
            [id]: { held: null, cooldownUntil: 0 },
          };
          showMessage(`${nextPositions[id].name || id.toUpperCase()} created a clone!`);
          return;
        }

        const role = roleForPlayer(id, currentIt);
        const rule = POWER_RULES[role][held];
        nextPowers = {
          ...nextPowers,
          [id]: { ...nextPowers[id], cooldownUntil: timestamp + rule.cooldownMs },
        };

        if (role === 'monster') {
          if (held === 'surge') {
            nextEffects = {
              ...nextEffects,
              [id]: { ...nextEffects[id], burstUntil: timestamp + rule.activeMs },
            };
            showMessage(`${nextPositions[id].name || id.toUpperCase()} used Speed Burst!`);
          } else if (held === 'echo') {
            const target = otherPlayer(id);
            setRoarEffect({ id: `${timestamp}`, x: nextPositions[id].x, y: nextPositions[id].y });
            window.setTimeout(() => setRoarEffect(null), 520);
            if (distanceBetweenPlayers(nextPositions[id], nextPositions[target]) <= rule.radius) {
              nextEffects = {
                ...nextEffects,
                [target]: { ...nextEffects[target], slowedUntil: timestamp + rule.activeMs },
              };
              showMessage(`${nextPositions[id].name || id.toUpperCase()} roared and slowed the runner!`);
            } else {
              showMessage(`${nextPositions[id].name || id.toUpperCase()} roared, but the runner was too far!`);
            }
          } else if (held === 'shadow') {
            const target = otherPlayer(id);
            nextEffects = {
              ...nextEffects,
              [target]: { ...nextEffects[target], trackingUntil: timestamp + rule.activeMs },
            };
            showMessage('Tracking Vision revealed the runner!');
          }
        } else if (held === 'surge') {
          nextPositions = {
            ...nextPositions,
            [id]: resolveDash(nextPositions[id], getMoveVector(keys, id)),
          };
          showMessage(`${nextPositions[id].name || id.toUpperCase()} dashed!`);
        } else if (held === 'echo') {
          nextEffects = {
            ...nextEffects,
            [id]: { ...nextEffects[id], shield: true },
          };
          showMessage(`${nextPositions[id].name || id.toUpperCase()} raised a shield!`);
        } else if (held === 'shadow') {
          nextEffects = {
            ...nextEffects,
            [id]: { ...nextEffects[id], invisibleUntil: timestamp + rule.activeMs },
          };
          showMessage(`${nextPositions[id].name || id.toUpperCase()} vanished!`);
        }
      });

      PLAYER_IDS.forEach((id) => {
        const other = otherPlayer(id);
        if (!isSafePlayerPosition(nextPositions[id], [nextPositions[other]], 0)) {
          const unstuck = findNearestSafePlayerPosition(nextPositions[id], [nextPositions[other]], nextIceTraps);
          if (unstuck) {
            nextPositions[id] = { ...nextPositions[id], ...unstuck };
          }
        }

        const playerBounds = playerRect(nextPositions[id], GAME_CONFIG.player.size);
        nextPowerUps = nextPowerUps.map((powerUp) => {
          if (powerUp.availableAt > timestamp || !rectsOverlap(playerBounds, powerUpRect(powerUp))) {
            return powerUp;
          }

          nextPowers = {
            ...nextPowers,
            [id]: {
              held: powerUp.type,
              cooldownUntil: Math.min(nextPowers[id].cooldownUntil, timestamp),
            },
          };
          showMessage(`${nextPositions[id].name || id.toUpperCase()} picked up ${POWER_TYPES[powerUp.type].icon}`);
          return {
            ...powerUp,
            availableAt:
              timestamp +
              (powerUp.type === 'stun'
                ? POWER_RULES.shared.stun.respawnMs
                : powerUp.type === 'ice'
                  ? POWER_RULES.shared.ice.respawnMs
                  : powerUp.type === 'clone'
                    ? POWER_RULES.shared.clone.respawnMs
                : GAME_CONFIG.powerRespawnMs),
          };
        });
      });

      PLAYER_IDS.forEach((id) => {
        if (nextEffects[id].stunnedUntil > timestamp || nextEffects[id].slidingUntil > timestamp) {
          return;
        }

        const playerBounds = playerRect(nextPositions[id], GAME_CONFIG.player.size);
        const trap = nextIceTraps.find(
          (activeTrap) => activeTrap.owner !== id && rectsOverlap(playerBounds, trapRect(activeTrap)),
        );

        if (!trap) {
          return;
        }

        const facing = nextPositions[id].facing ?? getMoveVector(keys, id);
        const slideVector = facing.x || facing.y ? facing : { x: trap.owner === 'p1' ? 1 : -1, y: 0 };
        nextEffects = {
          ...nextEffects,
          [id]: {
            ...nextEffects[id],
            slidingUntil: timestamp + POWER_RULES.shared.ice.slipMs,
            slideVector,
          },
        };
        nextIceTraps = nextIceTraps.filter((activeTrap) => activeTrap.id !== trap.id);
        showMessage(`${nextPositions[id].name || id.toUpperCase()} slipped on ice!`);
      });

      PLAYER_IDS.forEach((id) => {
        const playerBounds = playerRect(nextPositions[id], GAME_CONFIG.player.size);
        const touchedClone = nextClones.find(
          (clone) => clone.owner !== id && rectsOverlap(playerBounds, cloneRect(clone)),
        );

        if (!touchedClone) {
          return;
        }

        nextClones = nextClones.filter((clone) => clone.id !== touchedClone.id);
        showMessage('It was a clone!');
      });

      if (
        timestamp >= cooldownUntilRef.current &&
        nextEffects[currentIt].stunnedUntil <= timestamp &&
        nextEffects[runner].stunnedUntil <= timestamp &&
        nextEffects[currentIt].protectedUntil <= timestamp &&
        nextEffects[runner].protectedUntil <= timestamp &&
        centersTouch(
          nextPositions[currentIt],
          nextPositions[runner],
          GAME_CONFIG.player.size,
          GAME_CONFIG.tagDistance,
        )
      ) {
        if (nextEffects[runner].shield) {
          nextEffects = {
            ...nextEffects,
            [runner]: { ...nextEffects[runner], shield: false },
          };
          nextPositions = {
            ...nextPositions,
            [currentIt]: pushMonsterBack(nextPositions[currentIt], nextPositions[runner]),
          };
          cooldownUntilRef.current = timestamp + 700;
          setTagFlash(true);
          showMessage('Shield blocked the tag!');
          window.setTimeout(() => setTagFlash(false), 220);
        } else {
          triggerRoleSwitch(currentIt, timestamp);
        }
      }

      setPositions(nextPositions);
      setPowers(nextPowers);
      setEffects(nextEffects);
      setPowerUps(nextPowerUps);
      setTeleports(nextTeleports);
      setIceTraps(nextIceTraps);
      setClones(nextClones);

      const remaining = Math.max(0, timeRemainingRef.current - deltaSeconds * 1000);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        finishRound();
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameRef.current);
      lastFrameRef.current = null;
    };
  }, [countdown, finishRound, keysRef, screen, showMessage, triggerRoleSwitch]);

  useEffect(() => {
    if (screen !== 'playing' || countdown <= 0) {
      return undefined;
    }

    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => {
      window.clearInterval(countdownTimerRef.current);
    };
  }, [countdown, screen]);

  const startMatch = () => {
    if (startLockRef.current) {
      return;
    }

    startLockRef.current = true;
    setIsStarting(true);
    const validation = validateMapLayout(selectedMap);
    if (!validation.ok) {
      setMapError(validation.errors.slice(0, 4).join(' '));
      setScreen('start');
      setIsStarting(false);
      startLockRef.current = false;
      return;
    }

    activeMapConfig = selectedMap;
    setMapError('');
    setCurrentMapId(selectedMap.id);
    window.localStorage.setItem('tag-selected-map', selectedMap.id);
    const cleanPlayers = sanitizePlayers(players);
    setPlayers(cleanPlayers);
    const freshPositions = makeSafePlayerPositions(cleanPlayers);
    const randomIt = Math.random() < 0.5 ? 'p1' : 'p2';
    setPositions(freshPositions);
    setScores({ p1: 0, p2: 0 });
    setPowers(makePowerState());
    setEffects(makeEffectState());
    setPowerUps(makePowerUps());
    setTeleports(makeTeleportState());
    setIceTraps(makeIceTraps());
    setClones(makeClones());
    setItPlayer(randomIt);
    setCountdown(GAME_CONFIG.countdownSeconds);
    setTimeRemaining(GAME_CONFIG.roundDurationMs);
    setRoarEffect(null);
    setBlastEffect(null);
    setTagFlash(false);
    setDisplayTime(nowMs());
    setTagMessage(`${freshPositions[randomIt].name || randomIt.toUpperCase()} starts as the monster!`);
    setScreen('playing');
    window.setTimeout(() => {
      setIsStarting(false);
      startLockRef.current = false;
    }, 300);
    cooldownUntilRef.current = nowMs() + GAME_CONFIG.tagCooldownMs;
    powerPressedRef.current = { p1: false, p2: false };
  };

  const playAgain = () => {
    if (startLockRef.current) {
      return;
    }

    startLockRef.current = true;
    setIsStarting(true);
    activeMapConfig = currentMap;
    const validation = validateMapLayout(currentMap);
    if (!validation.ok) {
      setMapError(validation.errors.slice(0, 4).join(' '));
      setScreen('start');
      setIsStarting(false);
      startLockRef.current = false;
      return;
    }

    setMapError('');
    const cleanPlayers = sanitizePlayers(players);
    setPlayers(cleanPlayers);
    const freshPositions = makeSafePlayerPositions(cleanPlayers);
    const randomIt = Math.random() < 0.5 ? 'p1' : 'p2';
    setPositions(freshPositions);
    setScores({ p1: 0, p2: 0 });
    setPowers(makePowerState());
    setEffects(makeEffectState());
    setPowerUps(makePowerUps());
    setTeleports(makeTeleportState());
    setIceTraps(makeIceTraps());
    setClones(makeClones());
    setItPlayer(randomIt);
    setCountdown(GAME_CONFIG.countdownSeconds);
    setTimeRemaining(GAME_CONFIG.roundDurationMs);
    setTagMessage(`${freshPositions[randomIt].name || randomIt.toUpperCase()} starts as the monster!`);
    setRoarEffect(null);
    setBlastEffect(null);
    setTagFlash(false);
    setDisplayTime(nowMs());
    setScreen('playing');
    window.setTimeout(() => {
      setIsStarting(false);
      startLockRef.current = false;
    }, 300);
    cooldownUntilRef.current = nowMs() + GAME_CONFIG.tagCooldownMs;
    powerPressedRef.current = { p1: false, p2: false };
  };

  const changeMap = () => {
    setIsStarting(false);
    startLockRef.current = false;
    setScreen('start');
    setTagMessage('');
    setMapError('');
    setRoarEffect(null);
    setBlastEffect(null);
    setTeleports(makeTeleportState());
    setIceTraps(makeIceTraps());
    setClones(makeClones());
  };

  const cooldownRemaining = {
    p1: Math.max(0, powers.p1.cooldownUntil - displayTime),
    p2: Math.max(0, powers.p2.cooldownUntil - displayTime),
  };
  const stunRangeStatus = {
    p1:
      powers.p1.held === 'stun'
        ? distanceBetweenPlayers(positions.p1, positions.p2) <= POWER_RULES.shared.stun.range
        : null,
    p2:
      powers.p2.held === 'stun'
        ? distanceBetweenPlayers(positions.p2, positions.p1) <= POWER_RULES.shared.stun.range
        : null,
  };

  if (screen === 'start') {
    return (
      <StartScreen
        mapError={mapError}
        maps={MAPS}
        onSelectMap={setSelectedMapId}
        onStart={startMatch}
        isStarting={isStarting}
        players={players}
        selectedMapId={selectedMapId}
        setPlayers={setPlayers}
      />
    );
  }

  if (screen === 'results') {
    return (
      <ResultsScreen
        onChangeMap={changeMap}
        onPlayAgain={playAgain}
        players={players}
        scores={scores}
        selectedMapName={currentMap.name}
        winner={winner}
      />
    );
  }

  return (
    <main className="game-shell">
      <GameHUD
        cooldownRemaining={cooldownRemaining}
        effects={effects}
        itPlayer={itPlayer}
        mapName={currentMap.name}
        muted={muted}
        onToggleMuted={toggleMuted}
        players={positions}
        powerNames={{
          p1: powerNameFor('p1', itPlayer, powers),
          p2: powerNameFor('p2', itPlayer, powers),
        }}
        powers={powers}
        scores={scores}
        stunRangeStatus={stunRangeStatus}
        timeNow={displayTime}
        timeRemaining={timeRemaining}
      />
      <GameArena
        effects={effects}
        itPlayer={itPlayer}
        message={tagMessage}
        blastEffect={blastEffect}
        clones={clones}
        iceTraps={iceTraps}
        map={currentMap}
        powerUps={powerUps}
        players={positions}
        powers={powers}
        roarEffect={roarEffect}
        tagFlash={tagFlash}
        teleports={teleports}
        timeNow={displayTime}
      />
      <Countdown value={countdown} />
    </main>
  );
}
