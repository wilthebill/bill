export const GAME_CONFIG = {
  arena: {
    width: 1040,
    height: 640,
  },
  player: {
    size: 38,
    speed: 245,
    spawnClearance: 12,
  },
  tagDistance: 36,
  tagCooldownMs: 1000,
  roundDurationMs: 90000,
  countdownSeconds: 3,
  scorePerSecond: 10,
};

export const PLAYER_DEFAULTS = {
  p1: {
    name: 'Player 1',
    color: '#2f80ed',
    start: { x: 124, y: 112 },
    keys: ['w', 'a', 's', 'd'],
  },
  p2: {
    name: 'Player 2',
    color: '#f2994a',
    start: { x: 876, y: 492 },
    keys: ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'],
  },
};

export const COLOR_CHOICES = [
  '#2f80ed',
  '#eb5757',
  '#27ae60',
  '#f2994a',
  '#9b51e0',
  '#00a6a6',
];

export const OBSTACLES = [
  { id: 'wall-top-left', type: 'wall', x: 238, y: 82, width: 170, height: 30 },
  { id: 'wall-bottom-right', type: 'wall', x: 632, y: 528, width: 180, height: 30 },
  { id: 'bench-left', type: 'bench', x: 118, y: 390, width: 150, height: 40 },
  { id: 'bench-right', type: 'bench', x: 778, y: 172, width: 144, height: 40 },
  { id: 'sandbox', type: 'sand', x: 435, y: 242, width: 170, height: 112 },
  { id: 'tree-a', type: 'tree', x: 332, y: 440, width: 72, height: 72, collisionInset: 8 },
  { id: 'tree-b', type: 'tree', x: 675, y: 86, width: 76, height: 76, collisionInset: 8 },
  { id: 'tree-c', type: 'tree', x: 842, y: 424, width: 78, height: 78, collisionInset: 8 },
];
