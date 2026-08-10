// Game data: biomes, decorations, enemies, skills.
// Tile frames are [col, row] indices into terrain-short.png on its native 32px grid.

const WORLD_SIZE = 32;

// Elevation bands, ordered low to high; first match on percentile wins.
// Index in this array is the band's rank for edge layering. Note stone sits
// ABOVE snow: bare rock peaks past the snowline (and we have no snow-on-stone
// transition tiles the other way around).
const BIOMES = [
	{ name: 'deep-water', max: 8, walkable: false, tiles: [{ frame: [12, 60] }, { frame: [13, 60] }] },
	{ name: 'water', max: 19, walkable: false, tiles: [{ frame: [9, 60] }, { frame: [10, 60] }] },
	{ name: 'shallows', max: 24, walkable: false, tiles: [{ frame: [9, 61] }, { frame: [10, 61] }, { frame: [11, 61] }] },
	{ name: 'sand', max: 32, walkable: true },
	{ name: 'grass', max: 55, walkable: true },
	{ name: 'meadow', max: 65, walkable: true },
	{ name: 'forest', max: 76, walkable: true },
	{ name: 'dirt', max: 84, walkable: true },
	{ name: 'snow', max: 92, walkable: true },
	{ name: 'stone', max: 101, walkable: true },
];

const GRASS_RANK = BIOMES.findIndex((b) => b.name === 'grass');

// Every transition set in the sheet shares one LPC layout. Given the set's
// top-left corner (the column left of the 2x2 inner-notch block), this
// derives all 12 edge tiles. Keys are bitmasks of which sides show the
// lower terrain: N=1, E=2, S=4, W=8.
function edgeFrames([ox, oy]) {
	return {
		edges: {
			1: [ox + 1, oy + 2],
			2: [ox + 2, oy + 3],
			3: [ox + 2, oy + 2],
			4: [ox + 1, oy + 4],
			6: [ox + 2, oy + 4],
			8: [ox, oy + 3],
			9: [ox, oy + 2],
			12: [ox, oy + 4],
		},
		notches: {
			se: [ox + 1, oy],
			sw: [ox + 2, oy],
			ne: [ox + 1, oy + 1],
			nw: [ox + 2, oy + 1],
		},
	};
}

// coast is baked onto shallows-water; all others have transparent exteriors
// and get layered over whatever terrain sits beneath them.
const EDGE_SETS = {
	coast: edgeFrames([3, 21]),
	tealGrass: edgeFrames([0, 32]),
	grass: edgeFrames([3, 32]),
	forest: edgeFrames([6, 7]),
	autumn: edgeFrames([9, 7]),
	ochre: edgeFrames([18, 32]),
	sproutDirt: edgeFrames([24, 32]),
	greyStone: edgeFrames([21, 32]),
	snow: edgeFrames([18, 7]),
};

// What each band looks like per temperature zone: [cold, temperate, hot].
// solids are hashed per-cell variants; edge names an EDGE_SETS entry used
// to feather this terrain over lower neighbors.
const APPEARANCES = {
	sand: [
		{ solids: [[6, 59], [7, 59], [8, 59]], edge: null, decor: [{ frame: [0, 54], chance: 0.03 }, { frame: [2, 54], chance: 0.02 }] },
		{ solids: [[6, 59], [7, 59], [8, 59]], edge: null, decor: [{ frame: [0, 54], chance: 0.03 }, { frame: [2, 54], chance: 0.02 }] },
		{ solids: [[9, 62], [10, 62], [11, 62]], edge: null, decor: [{ frame: [0, 54], chance: 0.04 }] },
	],
	grass: [
		{ solids: [[0, 59], [1, 59], [2, 59]], edge: 'tealGrass', decor: [{ frame: [11, 54], chance: 0.04 }] },
		{ solids: [[9, 58], [10, 58], [11, 58]], edge: 'grass', decor: [{ frame: [9, 54], chance: 0.03 }, { frame: [10, 54], chance: 0.03 }] },
		{ solids: [[12, 58], [13, 58], [14, 58]], edge: 'grass', decor: [{ frame: [12, 54], chance: 0.04 }] },
	],
	meadow: [
		{ solids: [[0, 59], [1, 59], [2, 59]], edge: 'tealGrass', decor: [{ frame: [11, 54], chance: 0.05 }] },
		{ solids: [[19, 57], [20, 57], [21, 57], [9, 58], [10, 58]], edge: 'grass', decor: [{ frame: [9, 54], chance: 0.04 }] },
		{ solids: [[19, 57], [20, 57], [21, 57], [12, 58], [13, 58]], edge: 'grass', decor: [{ frame: [12, 54], chance: 0.04 }] },
	],
	forest: [
		{ solids: [[16, 57], [17, 57], [18, 57]], edge: 'forest', decor: [{ frame: [11, 53], chance: 0.1 }, { frame: [12, 53], chance: 0.05 }] },
		{ solids: [[22, 57], [23, 57], [24, 57]], edge: 'forest', decor: [{ frame: [9, 53], chance: 0.08 }, { frame: [10, 53], chance: 0.08 }, { frame: [11, 53], chance: 0.06 }] },
		{ solids: [[10, 10]], edge: 'autumn', decor: [{ frame: [12, 53], chance: 0.12 }, { frame: [12, 54], chance: 0.05 }] },
	],
	dirt: [
		{ solids: [[24, 37], [25, 37], [26, 37]], edge: 'sproutDirt', decor: [{ frame: [2, 54], chance: 0.05 }] },
		{ solids: [[24, 37], [25, 37], [26, 37]], edge: 'sproutDirt', decor: [{ frame: [12, 54], chance: 0.05 }, { frame: [2, 54], chance: 0.04 }] },
		{ solids: [[18, 37], [19, 37], [20, 37]], edge: 'ochre', decor: [{ frame: [1, 54], chance: 0.05 }] },
	],
	snow: [
		{ solids: [[18, 12], [19, 12], [20, 12]], edge: 'snow', decor: [{ frame: [3, 54], chance: 0.05 }, { frame: [15, 54], chance: 0.05 }] },
		{ solids: [[18, 12], [19, 12], [20, 12]], edge: 'snow', decor: [{ frame: [3, 54], chance: 0.04 }, { frame: [15, 54], chance: 0.04 }] },
		{ solids: [[18, 12], [19, 12], [20, 12]], edge: 'snow', decor: [{ frame: [15, 54], chance: 0.03 }] },
	],
	stone: [
		{ solids: [[21, 37], [22, 37], [23, 37]], edge: 'greyStone', decor: [{ frame: [4, 54], chance: 0.07 }, { frame: [1, 55], chance: 0.04 }] },
		{ solids: [[21, 37], [22, 37], [23, 37]], edge: 'greyStone', decor: [{ frame: [4, 54], chance: 0.06 }, { frame: [5, 54], chance: 0.04 }, { frame: [1, 55], chance: 0.03 }] },
		{ solids: [[21, 37], [22, 37], [23, 37]], edge: 'greyStone', decor: [{ frame: [7, 55], chance: 0.1 }, { frame: [5, 54], chance: 0.05 }] },
	],
};

// Enemy types. minKills gates tougher spawns to later in a run.
// tint rotates the sprite's hue so one sheet yields many monsters.
const ENEMY_TYPES = [
	{ id: 'slime-green', name: 'Green Slime', sheet: 'slime', hp: 1, gold: 8, tint: '0deg', minKills: 0, weight: 6 },
	{ id: 'slime-blue', name: 'Blue Slime', sheet: 'slime', hp: 3, gold: 30, tint: '90deg', minKills: 10, weight: 3 },
	{ id: 'skeleton', name: 'Skeleton', sheet: 'skeleton', hp: 6, gold: 75, tint: '0deg', minKills: 25, weight: 3 },
	{ id: 'zombie', name: 'Zombie', sheet: 'zombie', hp: 10, gold: 150, tint: '0deg', minKills: 50, weight: 2 },
	{ id: 'slime-red', name: 'Red Slime', sheet: 'slime', hp: 15, gold: 250, tint: '-120deg', minKills: 75, weight: 2 },
];

// Kill-count milestones pay out bonus gold. Exact-match on kills, so they
// re-fire on each prestige chapter by design.
const MILESTONES = [
	{ kills: 10, gold: 100 },
	{ kills: 50, gold: 600 },
	{ kills: 100, gold: 2000 },
	{ kills: 200, gold: 6000 },
	{ kills: 400, gold: 20000 },
];

// Skill tree. Positions are [col, row] on the 5-wide sidebar grid; every child
// sits exactly one cell from its parent so the CSS connector lines join up.
// effect keys are folded together in recalcStats().
const SKILL_TREE = [
	{
		id: 'awakening', name: 'Awakening', col: 2, row: 0, parent: null, cost: 0, hue: 0,
		desc: 'The fable begins. Click the land to walk; strike down wandering monsters for gold.',
		effect: {},
	},

	// ── Combat (left branch) ──
	{
		id: 'sharp-blade', name: 'Sharp Blade', col: 1, row: 0, parent: 'awakening', cost: 10, hue: 0,
		desc: '+1 damage. The rust comes off.',
		effect: { damage: 1 },
	},
	{
		id: 'honed-edge', name: 'Honed Edge', col: 0, row: 0, parent: 'sharp-blade', cost: 50, hue: 10,
		desc: '+2 damage. It hums when you swing it.',
		effect: { damage: 2 },
	},
	{
		id: 'battle-fury', name: 'Battle Fury', col: 0, row: 1, parent: 'honed-edge', cost: 150, hue: 20,
		desc: 'Attack 50% faster.',
		effect: { attackHaste: 0.5 },
	},
	{
		id: 'whirlwind', name: 'Whirlwind', col: 0, row: 2, parent: 'battle-fury', cost: 400, hue: 30,
		desc: 'Your strikes hit every adjacent monster.',
		effect: { whirlwind: true },
	},
	{
		id: 'berserker', name: 'Berserker', col: 0, row: 3, parent: 'whirlwind', cost: 1000, hue: 40,
		desc: 'Double damage. The monsters have noticed.',
		effect: { damageMult: 2 },
	},
	{
		id: 'warlord', name: 'Warlord', col: 0, row: 4, parent: 'berserker', cost: 2500, hue: 50,
		desc: 'Triple damage. They tell stories about you now.',
		effect: { damageMult: 3 },
	},
	{
		id: 'war-horn', name: 'War Horn', col: 0, row: 5, parent: 'warlord', cost: 5000, hue: 60,
		desc: '+5 monsters roam the world at once.',
		effect: { maxEnemies: 5 },
	},

	// ── Fortune (center branch) ──
	{
		id: 'greed', name: 'Greed', col: 2, row: 1, parent: 'awakening', cost: 25, hue: 100,
		desc: '+25% gold from monsters.',
		effect: { goldMult: 1.25 },
	},
	{
		id: 'lucky-coin', name: 'Lucky Coin', col: 2, row: 2, parent: 'greed', cost: 75, hue: 110,
		desc: '+25% gold. It always lands on edge.',
		effect: { goldMult: 1.25 },
	},
	{
		id: 'prospector', name: 'Prospector', col: 1, row: 2, parent: 'lucky-coin', cost: 200, hue: 120,
		desc: 'The land itself pays you: +1 gold per second.',
		effect: { idleGold: 1 },
	},
	{
		id: 'gold-mine', name: 'Gold Mine', col: 1, row: 3, parent: 'prospector', cost: 600, hue: 130,
		desc: '+4 gold per second. You hear digging at night.',
		effect: { idleGold: 4 },
	},
	{
		id: 'treasure-sense', name: 'Treasure Sense', col: 3, row: 2, parent: 'lucky-coin', cost: 200, hue: 140,
		desc: 'Monsters drop +5 bonus gold.',
		effect: { flatGold: 5 },
	},
	{
		id: 'royal-bounty', name: 'Royal Bounty', col: 3, row: 3, parent: 'treasure-sense', cost: 600, hue: 150,
		desc: 'Monsters drop +20 bonus gold. The crown approves.',
		effect: { flatGold: 20 },
	},
	{
		id: 'midas-touch', name: 'Midas Touch', col: 2, row: 3, parent: 'lucky-coin', cost: 500, hue: 160,
		desc: 'Double all gold. Try not to shake hands.',
		effect: { goldMult: 2 },
	},
	{
		id: 'philosophers-stone', name: "Philosopher's Stone", col: 2, row: 4, parent: 'midas-touch', cost: 1500, hue: 170,
		desc: 'Double all gold again. Lead was never the point.',
		effect: { goldMult: 2 },
	},
	{
		id: 'ascension', name: 'Ascension', col: 2, row: 5, parent: 'philosophers-stone', cost: 5000, hue: 180,
		desc: 'Triple all gold. Monsters spawn twice as fast. The fable continues.',
		effect: { goldMult: 3, spawnHaste: 2 },
	},

	// ── Swiftness (right branch) ──
	{
		id: 'fleet-foot', name: 'Fleet Foot', col: 3, row: 0, parent: 'awakening', cost: 10, hue: 220,
		desc: 'Move 40% faster.',
		effect: { speedMult: 1.4 },
	},
	{
		id: 'wind-walker', name: 'Wind Walker', col: 4, row: 0, parent: 'fleet-foot', cost: 50, hue: 230,
		desc: 'Move another 40% faster. Your boots barely touch the grass.',
		effect: { speedMult: 1.4 },
	},
	{
		id: 'hunters-instinct', name: "Hunter's Instinct", col: 4, row: 1, parent: 'wind-walker', cost: 150, hue: 240,
		desc: 'When idle, you stalk the nearest monster on your own.',
		effect: { autoHunt: true },
	},
	{
		id: 'haste', name: 'Haste', col: 4, row: 2, parent: 'hunters-instinct', cost: 400, hue: 250,
		desc: 'Attack 30% faster.',
		effect: { attackHaste: 0.3 },
	},
	{
		id: 'storm-stride', name: 'Storm Stride', col: 4, row: 3, parent: 'haste', cost: 1000, hue: 260,
		desc: 'Double movement speed. Thunder follows.',
		effect: { speedMult: 2 },
	},
	{
		id: 'tempest', name: 'Tempest', col: 4, row: 4, parent: 'storm-stride', cost: 2500, hue: 270,
		desc: 'Attack another 30% faster. Blink and you miss it.',
		effect: { attackHaste: 0.3 },
	},
	{
		id: 'soul-bond', name: 'Soul Bond', col: 4, row: 5, parent: 'tempest', cost: 4000, hue: 310,
		desc: 'A wild slime takes a liking to you. It follows you and fights at your side.',
		effect: { companion: true },
	},
];
