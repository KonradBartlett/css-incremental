// Shared helpers.

function randomXtoY(x, y) {
	return Math.floor(Math.random() * (y - x + 1)) + x;
}

// Deterministic PRNG so the same seed always grows the same world.
function mulberry32(seed) {
	let a = seed >>> 0;
	return function () {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// Stable per-cell hash in [0, 1) for picking tile variants and decor.
function hash2d(x, y, seed) {
	let h = (x * 374761393 + y * 668265263) ^ seed;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function pickWeighted(options, roll) {
	const total = options.reduce((sum, o) => sum + (o.weight || 1), 0);
	let target = roll * total;
	for (const option of options) {
		target -= option.weight || 1;
		if (target <= 0) return option;
	}
	return options[options.length - 1];
}

function formatGold(n) {
	if (n >= 1e6) return (n / 1e6).toFixed(1) + 'm';
	if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k';
	return Math.floor(n).toString();
}
