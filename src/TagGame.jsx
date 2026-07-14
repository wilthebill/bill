import { useCallback, useEffect, useRef, useState } from 'react';
import Countdown from './components/Countdown';
import GameArena from './components/GameArena';
import GameHUD from './components/GameHUD';
import ResultsScreen from './components/ResultsScreen';
import StartScreen from './components/StartScreen';
import { GAME_CONFIG, OBSTACLES, PLAYER_DEFAULTS } from './config/gameConfig';
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

const ARENA_BOUNDS = {
  x: 0,
  y: 0,
  width: GAME_CONFIG.arena.width,
  height: GAME_CONFIG.arena.height,
};

const SPAWN_SIDES = {
  p1: {
    minX: 0,
    maxX: GAME_CONFIG.arena.width / 2 - GAME_CONFIG.player.size,
  },
  p2: {
    minX: GAME_CONFIG.arena.width / 2,
    maxX: GAME_CONFIG.arena.width - GAME_CONFIG.player.size,
  },
};

const FALLBACK_SPAWNS = {
  p1: { x: 80, y: GAME_CONFIG.arena.height / 2 - GAME_CONFIG.player.size / 2 },
  p2: {
    x: GAME_CONFIG.arena.width - 80 - GAME_CONFIG.player.size,
    y: GAME_CONFIG.arena.height / 2 - GAME_CONFIG.player.size / 2,
  },
};

const makeInitialPlayers = () => ({
  p1: {
    ...PLAYER_DEFAULTS.p1,
    ...PLAYER_DEFAULTS.p1.start,
  },
  p2: {
    ...PLAYER_DEFAULTS.p2,
    ...PLAYER_DEFAULTS.p2.start,
  },
});

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
      obstacles: OBSTACLES,
      arenaBounds: ARENA_BOUNDS,
      otherPlayers,
      clearance,
    });

  const preferred = clampToSpawnSide(preferredPosition, playerId);
  if (isValid(preferred)) {
    return preferred;
  }

  const step = playerSize + clearance;
  const searchRadius = 7;

  for (let radius = 1; radius <= searchRadius; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
          continue;
        }

        const candidate = clampToSpawnSide(
          {
            x: preferred.x + dx * step,
            y: preferred.y + dy * step,
          },
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
  const p1Position = findSafeSpawnPosition('p1', PLAYER_DEFAULTS.p1.start);
  const p2Position = findSafeSpawnPosition('p2', PLAYER_DEFAULTS.p2.start, [p1Position]);

  return {
    p1: { ...players.p1, ...p1Position },
    p2: { ...players.p2, ...p2Position },
  };
}

function resolveMovement(player, vector, deltaSeconds) {
  const size = GAME_CONFIG.player.size;
  const speed = GAME_CONFIG.player.speed;
  const next = { ...player };

  const tryMove = (axis, amount) => {
    next[axis] = clamp(
      next[axis] + amount,
      0,
      axis === 'x'
        ? GAME_CONFIG.arena.width - size
        : GAME_CONFIG.arena.height - size,
    );

    const hitObstacle = OBSTACLES.some((obstacle) =>
      rectsOverlap(playerRect(next, size), obstacleRect(obstacle)),
    );

    if (hitObstacle) {
      next[axis] -= amount;
    }
  };

  tryMove('x', vector.x * speed * deltaSeconds);
  tryMove('y', vector.y * speed * deltaSeconds);
  return next;
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

export default function TagGame() {
  const [screen, setScreen] = useState('start');
  const [players, setPlayers] = useState(makeInitialPlayers);
  const [positions, setPositions] = useState(makeInitialPlayers);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [itPlayer, setItPlayer] = useState('p1');
  const [countdown, setCountdown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(GAME_CONFIG.roundDurationMs);
  const [tagMessage, setTagMessage] = useState('');
  const [tagFlash, setTagFlash] = useState(false);
  const [winner, setWinner] = useState('tie');
  const keysRef = useKeyboardControls(screen === 'playing' && countdown <= 0);
  const { muted, toggleMuted, playTagSound } = useTagSound();
  const animationFrameRef = useRef(null);
  const lastFrameRef = useRef(null);
  const cooldownUntilRef = useRef(0);
  const countdownTimerRef = useRef(null);
  const playersRef = useRef(positions);
  const itPlayerRef = useRef(itPlayer);
  const scoresRef = useRef(scores);
  const timeRemainingRef = useRef(timeRemaining);

  useEffect(() => {
    playersRef.current = positions;
  }, [positions]);

  useEffect(() => {
    itPlayerRef.current = itPlayer;
  }, [itPlayer]);

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  const triggerTag = useCallback((newItPlayer, now) => {
    cooldownUntilRef.current = now + GAME_CONFIG.tagCooldownMs;
    setItPlayer(newItPlayer);
    setTagMessage(`${playersRef.current[newItPlayer].name || newItPlayer.toUpperCase()} is now IT!`);
    setTagFlash(true);
    playTagSound();

    window.setTimeout(() => setTagFlash(false), 220);
    window.setTimeout(() => setTagMessage(''), 1200);
  }, [playTagSound]);

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

      // Main game loop: read the current key set, move both players using delta
      // time, award survival points, then process a possible tag transfer.
      const keys = keysRef.current;
      const current = playersRef.current;
      const nextPositions = {
        p1: resolveMovement(current.p1, getMoveVector(keys, 'p1'), deltaSeconds),
        p2: resolveMovement(current.p2, getMoveVector(keys, 'p2'), deltaSeconds),
      };

      setPositions(nextPositions);

      const safePlayer = itPlayerRef.current === 'p1' ? 'p2' : 'p1';
      setScores((currentScores) => ({
        ...currentScores,
        [safePlayer]:
          currentScores[safePlayer] + GAME_CONFIG.scorePerSecond * deltaSeconds,
      }));

      const remaining = Math.max(0, timeRemainingRef.current - deltaSeconds * 1000);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        finishRound();
        return;
      }

      const it = itPlayerRef.current;
      const other = it === 'p1' ? 'p2' : 'p1';
      if (
        timestamp >= cooldownUntilRef.current &&
        centersTouch(
          nextPositions[it],
          nextPositions[other],
          GAME_CONFIG.player.size,
          GAME_CONFIG.tagDistance,
        )
      ) {
        triggerTag(other, timestamp);
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameRef.current);
      lastFrameRef.current = null;
    };
  }, [countdown, finishRound, keysRef, screen, triggerTag]);

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
    const freshPositions = makeSafePlayerPositions(players);
    const randomIt = Math.random() < 0.5 ? 'p1' : 'p2';
    setPositions(freshPositions);
    setScores({ p1: 0, p2: 0 });
    setItPlayer(randomIt);
    setCountdown(GAME_CONFIG.countdownSeconds);
    setTimeRemaining(GAME_CONFIG.roundDurationMs);
    setTagMessage(`${freshPositions[randomIt].name || randomIt.toUpperCase()} starts as IT!`);
    setScreen('playing');
    cooldownUntilRef.current = performance.now() + GAME_CONFIG.tagCooldownMs;
  };

  const playAgain = () => {
    setScreen('start');
    setTagMessage('');
  };

  if (screen === 'start') {
    return <StartScreen onStart={startMatch} players={players} setPlayers={setPlayers} />;
  }

  if (screen === 'results') {
    return (
      <ResultsScreen
        onPlayAgain={playAgain}
        players={players}
        scores={scores}
        winner={winner}
      />
    );
  }

  return (
    <main className="game-shell">
      <GameHUD
        itPlayer={itPlayer}
        muted={muted}
        onToggleMuted={toggleMuted}
        players={positions}
        scores={scores}
        timeRemaining={timeRemaining}
      />
      <GameArena
        itPlayer={itPlayer}
        message={tagMessage}
        players={positions}
        tagFlash={tagFlash}
      />
      <Countdown value={countdown} />
    </main>
  );
}
