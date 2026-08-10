// Game state, save/load, and the main loops. Loads last; kicks everything off.

const app = document.getElementById('app');
const SAVE_KEY = 'incremental-fable-save';

const state = {
	gold: 0,
	kills: 0,
	owned: [],
	seed: Math.floor(Math.random() * 2 ** 31),
	totalGold: 0, // lifetime earnings this chapter; sets the Legend payout
	legend: 0, // permanent prestige currency, survives new chapters
};

function loadGame() {
	try {
		const raw = localStorage.getItem(SAVE_KEY);
		if (!raw) return;
		const saved = JSON.parse(raw);
		state.gold = saved.gold ?? 0;
		state.kills = saved.kills ?? 0;
		state.owned = saved.owned ?? [];
		state.seed = saved.seed ?? state.seed;
		state.lastSeen = saved.lastSeen ?? null;
		state.totalGold = saved.totalGold ?? 0;
		state.legend = saved.legend ?? 0;
		state.quest = saved.quest ?? null;
	} catch (error) {
		console.warn('Could not load save:', error);
	}
}

function saveGame() {
	localStorage.setItem(
		SAVE_KEY,
		JSON.stringify({
			gold: Math.floor(state.gold),
			kills: state.kills,
			owned: state.owned,
			seed: state.seed,
			lastSeen: Date.now(),
			totalGold: Math.floor(state.totalGold),
			legend: state.legend,
			quest: state.quest,
		}),
	);
}

function addGold(amount) {
	state.gold = Math.max(0, state.gold + amount);
	if (amount > 0) state.totalGold += amount;
	// data-gold feeds the CSS --gold-total var that gates skill affordability.
	app.setAttribute('data-gold', Math.floor(state.gold));
	document.getElementById('gold-display').textContent = formatGold(state.gold);
	document.getElementById('kills-display').textContent = state.kills;
}

function prestigeGain() {
	return Math.max(1, Math.floor(Math.sqrt(state.totalGold / 2000)));
}

// Reset the chapter, keep the Legend. A fresh seed grows a fresh world.
function beginNewChapter() {
	const gain = prestigeGain();
	const blurb = `Begin a new chapter? The world, your gold and your skills are reborn. ` +
		`You gain ${gain} Legend - each grants +10% gold and +5% damage, forever.`;
	if (!confirm(blurb)) return;

	state.legend += gain;
	state.gold = 0;
	state.kills = 0;
	state.owned = [];
	state.totalGold = 0;
	state.quest = null;
	state.seed = Math.floor(Math.random() * 2 ** 31);
	saveGame();
	sessionStorage.setItem('fable-new-chapter', '1');
	location.reload();
}

function updatePrestigeButton() {
	const button = document.getElementById('prestige');
	const ready = state.owned.includes('ascension');
	button.classList.toggle('hidden', !ready);
	if (ready) button.textContent = `⭐ Begin a New Chapter (+${prestigeGain()} Legend)`;
}

function renderStats() {
	document.getElementById('stat-damage').textContent = stats.damage;
	document.getElementById('stat-speed').textContent = `${stats.moveSpeed.toFixed(1)} tiles/s`;
	document.getElementById('stat-attack').textContent = `${(1 / stats.attackCooldown).toFixed(2)}/s`;
	document.getElementById('stat-gold-mult').textContent = `×${stats.goldMult.toFixed(2)}`;
	document.getElementById('stat-idle').textContent = `${stats.idleGold}/s`;

	const legendRow = document.getElementById('legend-row');
	legendRow.classList.toggle('hidden', state.legend === 0);
	document.getElementById('legend-display').textContent = state.legend;
	updatePrestigeButton();
}

function newWorld() {
	localStorage.removeItem(SAVE_KEY);
	location.reload();
}

// Idle income keeps flowing while the tab is closed (capped at 8 hours).
function grantOfflineGold() {
	if (!state.lastSeen || stats.idleGold <= 0) return;
	const elapsedSeconds = Math.min((Date.now() - state.lastSeen) / 1000, 8 * 3600);
	if (elapsedSeconds < 60) return;
	const earned = Math.round(stats.idleGold * elapsedSeconds);
	addGold(earned);
	showBanner(`While you were away, your lands earned ${formatGold(earned)} gold`);
}

function startLoops() {
	// Combat/AI tick.
	setInterval(heroTick, 200);

	// Monster spawns honor the (skill-adjustable) spawn interval.
	let nextSpawnAt = 0;
	setInterval(() => {
		if (performance.now() >= nextSpawnAt) {
			spawnEnemy();
			nextSpawnAt = performance.now() + stats.spawnInterval * 1000;
		}
	}, 500);

	setInterval(wanderEnemies, 2500);

	// Companion AI, treasure spawns and pickup.
	setInterval(companionTick, 600);
	setInterval(spawnTreasure, 20000);
	setInterval(collectTreasure, 300);

	// Idle income + autosave; the Legend payout grows with lifetime gold.
	setInterval(() => {
		if (stats.idleGold > 0) addGold(stats.idleGold);
		updatePrestigeButton();
		saveGame();
	}, 1000);
}

(function init() {
	loadGame();
	generateWorld(state.seed);
	initializeSkills();

	hero.element = document.getElementById('character-1');
	const start = findWalkable(WORLD_SIZE / 2, WORLD_SIZE / 2);
	hero.element.setAttribute('data-grid-x', start.x);
	hero.element.setAttribute('data-grid-y', start.y);
	document
		.querySelector(`.cell-${start.x}⋅${start.y}`)
		.scrollIntoView({ block: 'center', inline: 'center' });

	addGold(0);
	renderStats();
	updateHeroAppearance();
	generateZombieSheet();
	grantOfflineGold();
	initMinimap();
	setInterval(updateMinimap, 1000);

	document.getElementById('new-world').addEventListener('click', newWorld);
	document.getElementById('prestige').addEventListener('click', beginNewChapter);

	updateCompanion();
	// A quest finished right before closing the tab rolls fresh on return.
	if (!state.quest || state.quest.progress >= state.quest.need) rollQuest();
	else renderQuest();

	if (sessionStorage.getItem('fable-new-chapter')) {
		sessionStorage.removeItem('fable-new-chapter');
		showBanner(`⭐ A new chapter begins — Legend ${state.legend}`);
	}

	// Dev cheat tucked into the settings <details>.
	document.getElementById('cheat-gold').addEventListener('click', () => addGold(500));

	// Initial spawns so the world feels alive immediately.
	for (let i = 0; i < 4; i++) spawnEnemy();
	startLoops();
})();
