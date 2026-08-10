// World generation: perlin elevation -> banded biomes, perlin temperature ->
// per-band appearance, then layered edge autotiling so every terrain
// boundary renders with the sheet's transition tiles.

const world = {
	seed: 0,
	biomeMap: [], // [y][x] -> band object from BIOMES
	tempMap: [], // [y][x] -> 0 cold | 1 temperate | 2 hot
};

function biomeForElevation(value) {
	return BIOMES.find((b) => value < b.max) || BIOMES[BIOMES.length - 1];
}

function isWalkable(x, y) {
	if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return false;
	return world.biomeMap[y][x].walkable;
}

function bandRank(x, y) {
	return BIOMES.indexOf(world.biomeMap[y][x]);
}

// Rank used for edge layering: higher bands draw their edges over lower
// ones, and within a band hotter zones draw over colder ones so even
// same-band temperature borders get feathered.
function effectiveRank(x, y) {
	return bandRank(x, y) * 4 + world.tempMap[y][x];
}

function appearanceAt(x, y) {
	const variants = APPEARANCES[world.biomeMap[y][x].name];
	return variants ? variants[world.tempMap[y][x]] : null;
}

// fbm noise clusters around the middle of its range; rank-normalizing to
// percentiles guarantees every world gets the full spread of bands.
function percentileMapper(grid) {
	const sorted = grid.flat().sort((a, b) => a - b);
	return (value) => {
		let low = 0;
		let high = sorted.length - 1;
		while (low < high) {
			const mid = (low + high) >> 1;
			if (sorted[mid] < value) low = mid + 1;
			else high = mid;
		}
		return (low / (sorted.length - 1)) * 100;
	};
}

// Shapes the land/water boundary so it can be drawn with the baked
// sand-on-water blob set, and returns per-cell coast frames.
function computeCoastline() {
	const biomeByName = (name) => BIOMES.find((b) => b.name === name);
	const water = (x, y) =>
		x >= 0 && y >= 0 && x < WORLD_SIZE && y < WORLD_SIZE && !world.biomeMap[y][x].walkable;

	// 1. The blob set has no tiles for land squeezed between water on
	// opposite sides or on 3+ sides — flood such cells.
	let changed = true;
	while (changed) {
		changed = false;
		for (let y = 0; y < WORLD_SIZE; y++) {
			for (let x = 0; x < WORLD_SIZE; x++) {
				if (!world.biomeMap[y][x].walkable) continue;
				const n = water(x, y - 1);
				const e = water(x + 1, y);
				const s = water(x, y + 1);
				const w = water(x - 1, y);
				if (n + e + s + w >= 3 || (n && s) || (e && w)) {
					world.biomeMap[y][x] = biomeByName('shallows');
					changed = true;
				}
			}
		}
	}

	// 2. Every land cell touching water (even diagonally) becomes beach.
	for (let y = 0; y < WORLD_SIZE; y++) {
		for (let x = 0; x < WORLD_SIZE; x++) {
			if (!world.biomeMap[y][x].walkable) continue;
			outer: for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					if (water(x + dx, y + dy)) {
						world.biomeMap[y][x] = biomeByName('sand');
						break outer;
					}
				}
			}
		}
	}

	// 3. Pick the blob tile matching each beach cell's water neighbors.
	const frames = Array.from({ length: WORLD_SIZE }, () => new Array(WORLD_SIZE).fill(null));
	for (let y = 0; y < WORLD_SIZE; y++) {
		for (let x = 0; x < WORLD_SIZE; x++) {
			if (world.biomeMap[y][x].name !== 'sand') continue;
			const mask =
				(water(x, y - 1) ? 1 : 0) |
				(water(x + 1, y) ? 2 : 0) |
				(water(x, y + 1) ? 4 : 0) |
				(water(x - 1, y) ? 8 : 0);
			if (mask) {
				frames[y][x] = EDGE_SETS.coast.edges[mask];
			} else if (water(x - 1, y - 1)) {
				frames[y][x] = EDGE_SETS.coast.notches.nw;
			} else if (water(x + 1, y - 1)) {
				frames[y][x] = EDGE_SETS.coast.notches.ne;
			} else if (water(x - 1, y + 1)) {
				frames[y][x] = EDGE_SETS.coast.notches.sw;
			} else if (water(x + 1, y + 1)) {
				frames[y][x] = EDGE_SETS.coast.notches.se;
			}
		}
	}
	return frames;
}

// Land smoothing: a cell pinched by lower-ranked terrain on opposite sides
// or 3+ sides has no matching edge tile, so it sinks to the highest of its
// lower neighbors. Runs until the whole map is blob-expressible.
function smoothLand() {
	const lower = (x, y, mine) =>
		x >= 0 && y >= 0 && x < WORLD_SIZE && y < WORLD_SIZE && effectiveRank(x, y) < mine;

	let changed = true;
	while (changed) {
		changed = false;
		for (let y = 0; y < WORLD_SIZE; y++) {
			for (let x = 0; x < WORLD_SIZE; x++) {
				if (bandRank(x, y) < GRASS_RANK) continue;
				const mine = effectiveRank(x, y);
				const n = lower(x, y - 1, mine);
				const e = lower(x + 1, y, mine);
				const s = lower(x, y + 1, mine);
				const w = lower(x - 1, y, mine);
				if (n + e + s + w < 3 && !(n && s) && !(e && w)) continue;

				// Demote to the highest-ranked lower neighbor (smallest step).
				let best = null;
				let bestRank = -1;
				for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
					const nx = x + dx;
					const ny = y + dy;
					if (!lower(nx, ny, mine)) continue;
					const rank = effectiveRank(nx, ny);
					if (rank > bestRank) {
						bestRank = rank;
						best = [nx, ny];
					}
				}
				world.biomeMap[y][x] = world.biomeMap[best[1]][best[0]];
				world.tempMap[y][x] = world.tempMap[best[1]][best[0]];
				changed = true;
			}
		}
	}
}

// For every land cell bordering lower-ranked terrain: base tile = the lower
// neighbor's solid, overlay = this terrain's transparent edge blob.
function computeOverlays(coastFrames) {
	const overlays = Array.from({ length: WORLD_SIZE }, () => new Array(WORLD_SIZE).fill(null));
	const inBounds = (x, y) => x >= 0 && y >= 0 && x < WORLD_SIZE && y < WORLD_SIZE;

	for (let y = 0; y < WORLD_SIZE; y++) {
		for (let x = 0; x < WORLD_SIZE; x++) {
			if (bandRank(x, y) < GRASS_RANK || coastFrames[y][x]) continue;
			const appearance = appearanceAt(x, y);
			if (!appearance.edge) continue;
			const set = EDGE_SETS[appearance.edge];
			const mine = effectiveRank(x, y);
			const lower = (nx, ny) => inBounds(nx, ny) && effectiveRank(nx, ny) < mine;

			let tile = null;
			let baseCell = null;
			const mask =
				(lower(x, y - 1) ? 1 : 0) |
				(lower(x + 1, y) ? 2 : 0) |
				(lower(x, y + 1) ? 4 : 0) |
				(lower(x - 1, y) ? 8 : 0);

			if (mask) {
				tile = set.edges[mask];
				// base = highest-ranked lower 4-neighbor
				let bestRank = -1;
				for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
					if (!lower(x + dx, y + dy)) continue;
					const rank = effectiveRank(x + dx, y + dy);
					if (rank > bestRank) {
						bestRank = rank;
						baseCell = [x + dx, y + dy];
					}
				}
			} else {
				const corners = [
					['nw', -1, -1],
					['ne', 1, -1],
					['sw', -1, 1],
					['se', 1, 1],
				];
				for (const [key, dx, dy] of corners) {
					if (lower(x + dx, y + dy)) {
						tile = set.notches[key];
						baseCell = [x + dx, y + dy];
						break;
					}
				}
			}

			if (!tile || !baseCell) continue;
			const baseAppearance = appearanceAt(baseCell[0], baseCell[1]);
			if (!baseAppearance) continue; // never happens: ring keeps water away
			const solids = baseAppearance.solids;
			const base = solids[Math.floor(hash2d(x, y, world.seed ^ 0xbeef) * solids.length)];
			overlays[y][x] = { base, overlay: tile };
		}
	}
	return overlays;
}

// Builds the gameboard cells, paints them with biome tiles and scatters decor.
function generateWorld(seed) {
	world.seed = seed;

	perlin = new PerlinNoise(mulberry32(seed));
	const elevation = generateNoiseGrid(WORLD_SIZE, WORLD_SIZE, { scale: 0.09, octaves: 3 });
	perlin = new PerlinNoise(mulberry32(seed ^ 0x9e3779b9));
	const temperature = generateNoiseGrid(WORLD_SIZE, WORLD_SIZE, { scale: 0.05, octaves: 2 });

	const elevationPct = percentileMapper(elevation);
	const temperaturePct = percentileMapper(temperature);

	world.biomeMap = elevation.map((row) => row.map((v) => biomeForElevation(elevationPct(v))));
	world.tempMap = temperature.map((row) =>
		row.map((v) => (temperaturePct(v) < 33 ? 0 : temperaturePct(v) < 66 ? 1 : 2)),
	);

	const coastFrames = computeCoastline();
	smoothLand();
	const overlays = computeOverlays(coastFrames);

	const gameboard = document.getElementById('gameboard');
	const terrainList = document.getElementById('terrainList');
	gameboard.style.setProperty('--columns', WORLD_SIZE);

	for (let y = 0; y < WORLD_SIZE; y++) {
		for (let x = 0; x < WORLD_SIZE; x++) {
			const biome = world.biomeMap[y][x];

			const cell = document.createElement('div');
			cell.classList.add('cell', 'tile', `cell-${x}⋅${y}`);
			cell.setAttribute('data-sprite-sheet', 'overworld');
			cell.setAttribute('data-biome', biome.name);

			let frame;
			let isEdge = false;
			if (!biome.walkable) {
				frame = biome.tiles[Math.floor(hash2d(x, y, seed) * biome.tiles.length)].frame;
				// stagger the wave animation so the ocean ripples
				cell.style.setProperty('--phase', hash2d(y, x, seed).toFixed(3));
			} else if (coastFrames[y][x]) {
				frame = coastFrames[y][x];
				isEdge = true;
			} else if (overlays[y][x]) {
				frame = overlays[y][x].base;
				cell.setAttribute('data-overlay-x', overlays[y][x].overlay[0]);
				cell.setAttribute('data-overlay-y', overlays[y][x].overlay[1]);
				isEdge = true;
			} else {
				const solids = appearanceAt(x, y).solids;
				frame = solids[Math.floor(hash2d(x, y, seed) * solids.length)];
			}
			cell.setAttribute('data-frame-x', frame[0]);
			cell.setAttribute('data-frame-y', frame[1]);

			if (biome.walkable) {
				cell.addEventListener('click', () => walkHeroTo(x, y));
			}
			gameboard.appendChild(cell);

			// No props on edge tiles — a rock half-overhanging a boundary looks odd.
			if (isEdge || !biome.walkable) continue;

			for (const prop of appearanceAt(x, y).decor) {
				if (hash2d(x * 7 + prop.frame[0], y * 13 + prop.frame[1], seed) < prop.chance) {
					const decor = document.createElement('div');
					decor.classList.add('decor');
					decor.setAttribute('data-sprite-sheet', 'overworld');
					decor.setAttribute('data-frame-x', prop.frame[0]);
					decor.setAttribute('data-frame-y', prop.frame[1]);
					decor.setAttribute('data-grid-x', x);
					decor.setAttribute('data-grid-y', y);
					terrainList.appendChild(decor);
					break;
				}
			}
		}
	}
}

// Nearest walkable cell to (x, y), spiralling outward. Used for spawns.
function findWalkable(startX, startY) {
	for (let radius = 0; radius < WORLD_SIZE; radius++) {
		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
				const x = startX + dx;
				const y = startY + dy;
				if (isWalkable(x, y)) return { x, y };
			}
		}
	}
	return { x: startX, y: startY };
}

function randomWalkableCell() {
	for (let tries = 0; tries < 200; tries++) {
		const x = randomXtoY(0, WORLD_SIZE - 1);
		const y = randomXtoY(0, WORLD_SIZE - 1);
		if (isWalkable(x, y)) return { x, y };
	}
	return findWalkable(WORLD_SIZE / 2, WORLD_SIZE / 2);
}
