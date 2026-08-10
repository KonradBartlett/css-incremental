// Banner announcements and the sidebar minimap.

let bannerTimer = null;
function showBanner(text) {
	const banner = document.getElementById('banner');
	banner.textContent = text;
	banner.classList.add('show');
	clearTimeout(bannerTimer);
	bannerTimer = setTimeout(() => banner.classList.remove('show'), 6000);
}

// ── Minimap ──────────────────────────────────────────────────────

const MINIMAP_COLORS = {
	'deep-water': '#16305e',
	water: '#1d4f8f',
	shallows: '#4f86a8',
	sand: '#d8c08a',
	grass: '#4d9442',
	meadow: '#63a84e',
	forest: '#2c6b38',
	dirt: '#8a5a33',
	snow: '#dfe8f0',
	stone: '#8d8d8d',
};

const minimap = { scale: 4, base: null };

function initMinimap() {
	const canvas = document.getElementById('minimap');
	canvas.width = WORLD_SIZE * minimap.scale;
	canvas.height = WORLD_SIZE * minimap.scale;

	// Terrain only changes on world gen, so paint it once offscreen.
	minimap.base = document.createElement('canvas');
	minimap.base.width = canvas.width;
	minimap.base.height = canvas.height;
	const ctx = minimap.base.getContext('2d');
	for (let y = 0; y < WORLD_SIZE; y++) {
		for (let x = 0; x < WORLD_SIZE; x++) {
			ctx.fillStyle = MINIMAP_COLORS[world.biomeMap[y][x].name] || '#000';
			ctx.fillRect(x * minimap.scale, y * minimap.scale, minimap.scale, minimap.scale);
		}
	}

	canvas.addEventListener('click', (event) => {
		const rect = canvas.getBoundingClientRect();
		const x = Math.floor(((event.clientX - rect.left) / rect.width) * WORLD_SIZE);
		const y = Math.floor(((event.clientY - rect.top) / rect.height) * WORLD_SIZE);
		const cell = document.querySelector(`.cell-${x}⋅${y}`);
		if (cell) cell.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
	});

	updateMinimap();
}

function updateMinimap() {
	const canvas = document.getElementById('minimap');
	const ctx = canvas.getContext('2d');
	const s = minimap.scale;
	ctx.drawImage(minimap.base, 0, 0);

	for (const enemy of livingEnemies()) {
		const boss = enemy.classList.contains('boss');
		ctx.fillStyle = boss ? '#ffd75e' : '#e03b3b';
		const ex = parseInt(enemy.getAttribute('data-grid-x')) * s;
		const ey = parseInt(enemy.getAttribute('data-grid-y')) * s;
		ctx.fillRect(ex - (boss ? 1 : 0), ey - (boss ? 1 : 0), boss ? s + 2 : s, boss ? s + 2 : s);
	}

	const { x, y } = heroPosition();
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(x * s, y * s, s, s);
	ctx.strokeStyle = '#000000';
	ctx.strokeRect(x * s - 0.5, y * s - 0.5, s + 1, s + 1);
}
