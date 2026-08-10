// Monster spawning, wandering, damage and gold drops.

let enemyIdCounter = 0;

function livingEnemies() {
	return [...document.querySelectorAll('#enemy-list .enemy:not(.dying)')];
}

function nearestEnemy(x, y) {
	let best = null;
	let bestDistance = Infinity;
	for (const enemy of livingEnemies()) {
		const ex = parseInt(enemy.getAttribute('data-grid-x'));
		const ey = parseInt(enemy.getAttribute('data-grid-y'));
		const distance = Math.hypot(ex - x, ey - y);
		if (distance < bestDistance) {
			bestDistance = distance;
			best = enemy;
		}
	}
	return best;
}

function createEnemy(type, hp, gold) {
	const { x, y } = randomWalkableCell();

	const enemy = document.createElement('div');
	enemy.id = `enemy-${++enemyIdCounter}`;
	enemy.classList.add('enemy', 'sprite');
	enemy.setAttribute('data-sprite-sheet', type.sheet);
	enemy.setAttribute('data-enemy-type', type.id);
	enemy.setAttribute('data-grid-x', x);
	enemy.setAttribute('data-grid-y', y);
	enemy.setAttribute('data-hp', hp);
	enemy.setAttribute('data-max-hp', hp);
	enemy.setAttribute('data-bounty', gold);
	enemy.setAttribute('data-animation-state', 'idle');
	enemy.setAttribute('data-animation-name', 'walk-down');
	enemy.style.setProperty('--tint', type.tint);

	document.getElementById('enemy-list').appendChild(enemy);
	return enemy;
}

function spawnEnemy() {
	if (livingEnemies().length >= stats.maxEnemies) return;
	const unlocked = ENEMY_TYPES.filter((t) => state.kills >= t.minKills);
	const type = pickWeighted(unlocked, Math.random());
	createEnemy(type, type.hp, type.gold);
}

// Every 25th kill summons the Golden Slime King — tougher and richer each
// time. It spawns outside the normal monster cap.
const BOSS_TYPE = { id: 'slime-king', sheet: 'slime', tint: '-80deg' };

function spawnBoss() {
	if (document.querySelector('#enemy-list .boss')) return;
	const hp = 20 + state.kills;
	const gold = 300 + state.kills * 10;
	const boss = createEnemy(BOSS_TYPE, hp, gold);
	boss.classList.add('boss', 'damaged');
	boss.style.setProperty('--hp-percent', '100%');
	showBanner('👑 A Golden Slime King has appeared!');
	sfx.boss();
}

// Each wander tick a few monsters shuffle 1-2 tiles in a cardinal
// direction, stopping short if the line crosses blocked terrain.
function wanderEnemies() {
	const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
	for (const enemy of livingEnemies()) {
		if (Math.random() > 0.4) continue;
		const x = parseInt(enemy.getAttribute('data-grid-x'));
		const y = parseInt(enemy.getAttribute('data-grid-y'));
		const [dx, dy] = directions[randomXtoY(0, 3)];

		let steps = 0;
		const distance = randomXtoY(1, 2);
		while (steps < distance && isWalkable(x + dx * (steps + 1), y + dy * (steps + 1))) {
			steps++;
		}
		if (steps === 0) continue;
		moveSprite(enemy, x + dx * steps, y + dy * steps, 1.5);
	}
}

function damageEnemy(enemy, amount, isCrit = false) {
	const hp = parseInt(enemy.getAttribute('data-hp')) - amount;
	enemy.setAttribute('data-hp', Math.max(0, hp));
	enemy.style.setProperty(
		'--hp-percent',
		`${(Math.max(0, hp) / parseInt(enemy.getAttribute('data-max-hp'))) * 100}%`,
	);

	enemy.classList.add('hit', 'damaged');
	setTimeout(() => enemy.classList.remove('hit'), 150);

	if (isCrit) sfx.crit();
	else sfx.hit();

	spawnPopup(
		parseInt(enemy.getAttribute('data-grid-x')),
		parseInt(enemy.getAttribute('data-grid-y')),
		isCrit ? `${amount}!` : `${amount}`,
		isCrit ? 'damage-popup crit' : 'damage-popup',
	);

	if (hp <= 0) killEnemy(enemy);
}

function killEnemy(enemy) {
	const bounty = Math.round(
		(parseInt(enemy.getAttribute('data-bounty')) + stats.flatGold) * stats.goldMult,
	);

	enemy.classList.add('dying');
	setTimeout(() => enemy.remove(), 600);

	spawnPopup(
		parseInt(enemy.getAttribute('data-grid-x')),
		parseInt(enemy.getAttribute('data-grid-y')),
		`+${formatGold(bounty)}`,
		'gold-popup',
	);

	state.kills += 1;
	addGold(bounty);
	sfx.coin();
	questProgress(enemy.getAttribute('data-enemy-type'));

	const milestone = MILESTONES.find((m) => m.kills === state.kills);
	if (milestone) {
		addGold(milestone.gold);
		showBanner(`🏆 ${milestone.kills} monsters slain! +${formatGold(milestone.gold)} gold`);
		sfx.chime();
	}

	if (state.kills % 25 === 0) spawnBoss();
}

function spawnPopup(x, y, text, className) {
	const popup = document.createElement('div');
	popup.className = className;
	popup.textContent = text;
	popup.setAttribute('data-grid-x', x);
	popup.setAttribute('data-grid-y', y);
	// nudge sideways so stacked popups on one cell stay readable
	popup.style.marginLeft = `${randomXtoY(-10, 10)}px`;
	document.getElementById('enemy-list').appendChild(popup);
	setTimeout(() => popup.remove(), 1200);
}
