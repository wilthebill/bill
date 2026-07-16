export const GAME_CONFIG = {
  arena: {
    width: 1040,
    height: 640,
  },
  player: {
    size: 38,
    speed: 220,
    monsterSpeed: 236,
    spawnClearance: 14,
  },
  tagDistance: 35,
  tagCooldownMs: 2000,
  roundDurationMs: 120000,
  countdownSeconds: 3,
  powerRespawnMs: 9000,
};

export const POWER_TYPES = {
  surge: {
    id: 'surge',
    icon: '>>',
    color: '#ff5c5c',
    monsterName: 'Speed Burst',
    runnerName: 'Dash',
  },
  echo: {
    id: 'echo',
    icon: '!!',
    color: '#9b51e0',
    monsterName: 'Monster Roar',
    runnerName: 'Shield',
  },
  shadow: {
    id: 'shadow',
    icon: '..',
    color: '#00a6a6',
    monsterName: 'Tracking Vision',
    runnerName: 'Invisibility',
  },
  portal: {
    id: 'portal',
    icon: '[]',
    color: '#ffd166',
    monsterName: 'Corner Teleport',
    runnerName: 'Corner Teleport',
  },
  stun: {
    id: 'stun',
    icon: '*',
    color: '#3d5afe',
    monsterName: 'Stun Blast',
    runnerName: 'Stun Blast',
  },
  ice: {
    id: 'ice',
    icon: 'ICE',
    color: '#7dd3fc',
    monsterName: 'Ice Trap',
    runnerName: 'Ice Trap',
  },
  clone: {
    id: 'clone',
    icon: '2X',
    color: '#f472b6',
    monsterName: 'Moving Clone',
    runnerName: 'Moving Clone',
  },
};

export const POWER_RULES = {
  monster: {
    surge: { activeMs: 3000, cooldownMs: 8000 },
    echo: { activeMs: 2000, cooldownMs: 10000, radius: 150 },
    shadow: { activeMs: 3500, cooldownMs: 9000 },
  },
  runner: {
    surge: { cooldownMs: 6500, distance: 132 },
    echo: { cooldownMs: 9000 },
    shadow: { activeMs: 3000, cooldownMs: 9000 },
  },
  shared: {
    portal: { delayMs: 650, protectionMs: 1000 },
    stun: { cooldownMs: 12000, durationMs: 5000, immunityMs: 2000, range: 230, respawnMs: 14000 },
    ice: { durationMs: 10000, slipMs: 2000, respawnMs: 12000, size: 38 },
    clone: { durationMs: 10000, respawnMs: 13000, speed: 190 },
  },
};

export const TELEPORT_DESTINATIONS = {
  topLeft: { label: 'Top-left', x: 88, y: 82 },
  topRight: { label: 'Top-right', x: 914, y: 82 },
  bottomLeft: { label: 'Bottom-left', x: 88, y: 520 },
  bottomRight: { label: 'Bottom-right', x: 914, y: 520 },
};

export const PLAYER_DEFAULTS = {
  p1: {
    name: 'Player 1',
    color: '#2f80ed',
    start: { x: 104, y: 292 },
    keys: ['w', 'a', 's', 'd'],
    powerKey: 'F',
  },
  p2: {
    name: 'Player 2',
    color: '#f2994a',
    start: { x: 898, y: 292 },
    keys: ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'],
    powerKey: 'Enter',
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
  { id: 'log-north', type: 'wall', x: 230, y: 78, width: 168, height: 28 },
  { id: 'log-south', type: 'wall', x: 638, y: 534, width: 178, height: 28 },
  { id: 'rock-west', type: 'rock', x: 126, y: 398, width: 92, height: 62, collisionInset: 6 },
  { id: 'rock-east', type: 'rock', x: 818, y: 166, width: 96, height: 66, collisionInset: 6 },
  { id: 'bush-center', type: 'bush', x: 444, y: 256, width: 152, height: 96, collisionInset: 10 },
  { id: 'tree-a', type: 'tree', x: 318, y: 438, width: 72, height: 72, collisionInset: 8 },
  { id: 'tree-b', type: 'tree', x: 664, y: 88, width: 76, height: 76, collisionInset: 8 },
  { id: 'tree-c', type: 'tree', x: 852, y: 428, width: 78, height: 78, collisionInset: 8 },
  { id: 'tree-d', type: 'tree', x: 278, y: 218, width: 68, height: 68, collisionInset: 8 },
  { id: 'tree-e', type: 'tree', x: 640, y: 382, width: 70, height: 70, collisionInset: 8 },
];

export const POWERUP_SPAWNS = [
  { id: 'power-1', type: 'surge', x: 188, y: 186 },
  { id: 'power-2', type: 'echo', x: 482, y: 122 },
  { id: 'power-3', type: 'shadow', x: 780, y: 306 },
  { id: 'power-4', type: 'surge', x: 486, y: 476 },
  { id: 'power-5', type: 'echo', x: 296, y: 548 },
  { id: 'power-6', type: 'shadow', x: 760, y: 480 },
  { id: 'power-7', type: 'portal', x: 518, y: 72 },
  { id: 'power-8', type: 'portal', x: 518, y: 548 },
  { id: 'power-9', type: 'stun', x: 376, y: 174 },
  { id: 'power-10', type: 'stun', x: 570, y: 380 },
  { id: 'power-11', type: 'ice', x: 154, y: 510 },
  { id: 'power-12', type: 'ice', x: 850, y: 108 },
  { id: 'power-13', type: 'clone', x: 154, y: 108 },
  { id: 'power-14', type: 'clone', x: 850, y: 510 },
];

const BASE_TELEPORTS = TELEPORT_DESTINATIONS;
const BASE_POWERUPS = POWERUP_SPAWNS;
const BASE_SPAWNS = {
  p1: PLAYER_DEFAULTS.p1.start,
  p2: PLAYER_DEFAULTS.p2.start,
};

function shiftPowerUps(dx, dy) {
  return BASE_POWERUPS.map((power, index) => ({
    ...power,
    id: `${power.id}-${dx}-${dy}`,
    x: Math.min(940, Math.max(82, power.x + (index % 2 ? dx : -dx))),
    y: Math.min(560, Math.max(72, power.y + (index % 3 === 0 ? dy : -dy))),
  }));
}

export const MAPS = [
  {
    id: 'enchanted-forest',
    name: 'Enchanted Forest',
    difficulty: 'Balanced routes',
    description: 'Green forest clearings, winding dirt paths, trees, bushes, and rocks.',
    theme: 'forest',
    preview: 'TREE',
    spawns: BASE_SPAWNS,
    teleports: BASE_TELEPORTS,
    obstacles: OBSTACLES,
    powerUps: BASE_POWERUPS,
  },
  {
    id: 'frozen-lake',
    name: 'Frozen Lake',
    difficulty: 'Slippery center',
    description: 'Snowbanks, frozen trees, cabins, and icy open lanes.',
    theme: 'frozen',
    preview: 'ICE',
    spawns: { p1: { x: 104, y: 306 }, p2: { x: 898, y: 306 } },
    teleports: BASE_TELEPORTS,
    obstacles: [
      { id: 'snowbank-north', type: 'snow', x: 238, y: 86, width: 170, height: 34 },
      { id: 'cabin-east', type: 'cabin', x: 790, y: 156, width: 124, height: 82 },
      { id: 'cabin-west', type: 'cabin', x: 126, y: 412, width: 116, height: 76 },
      { id: 'ice-tree-a', type: 'tree', x: 324, y: 448, width: 70, height: 70, collisionInset: 8 },
      { id: 'ice-tree-b', type: 'tree', x: 664, y: 92, width: 74, height: 74, collisionInset: 8 },
      { id: 'snow-rock', type: 'rock', x: 622, y: 418, width: 96, height: 58, collisionInset: 7 },
      { id: 'frozen-island', type: 'bush', x: 450, y: 258, width: 144, height: 86, collisionInset: 12 },
    ],
    powerUps: shiftPowerUps(18, 8).map((powerUp) => ({
      ...powerUp,
      ...({ 'power-7-18-8': { y: 62 } }[powerUp.id] ?? {}),
    })),
  },
  {
    id: 'space-station',
    name: 'Space Station',
    difficulty: 'Corridor rooms',
    description: 'Metal corridors, control rooms, crates, doors, and glowing panels.',
    theme: 'space',
    preview: 'STAR',
    spawns: { p1: { x: 104, y: 304 }, p2: { x: 898, y: 304 } },
    teleports: BASE_TELEPORTS,
    obstacles: [
      { id: 'crate-a', type: 'crate', x: 238, y: 88, width: 168, height: 34 },
      { id: 'crate-b', type: 'crate', x: 638, y: 530, width: 178, height: 34 },
      { id: 'control-room', type: 'control', x: 444, y: 252, width: 154, height: 100, collisionInset: 6 },
      { id: 'vent-a', type: 'crate', x: 126, y: 402, width: 92, height: 62 },
      { id: 'vent-b', type: 'crate', x: 818, y: 166, width: 96, height: 66 },
      { id: 'door-a', type: 'wall', x: 318, y: 438, width: 74, height: 34 },
      { id: 'door-b', type: 'wall', x: 652, y: 96, width: 88, height: 34 },
    ],
    powerUps: shiftPowerUps(-18, -8),
  },
];
