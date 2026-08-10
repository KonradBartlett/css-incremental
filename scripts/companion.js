// The Soul Bond companion: a pink slime that trails the hero and nips at
// adjacent monsters for a share of the hero's damage.

const companion = { nextAttackAt: 0 };

function companionElement() {
	return document.getElementById('companion');
}

function updateCompanion() {
	const existing = companionElement();
	if (!stats.companion) {
		existing?.remove();
		return;
	}
	if (existing || !hero.element) return;

	const { x, y } = heroPosition();
	const spot = findWalkable(x + 1, y + 1);
	const slime = document.createElement('div');
	slime.id = 'companion';
	slime.classList.add('character', 'sprite', 'companion');
	slime.setAttribute('data-sprite-sheet', 'slime');
	slime.setAttribute('data-grid-x', spot.x);
	slime.setAttribute('data-grid-y', spot.y);
	slime.setAttribute('data-animation-state', 'idle');
	slime.setAttribute('data-animation-name', 'walk-down');
	document.getElementById('character-list').appendChild(slime);
}

function companionTick() {
	const slime = companionElement();
	if (!slime) return;

	const cx = parseInt(slime.getAttribute('data-grid-x'));
	const cy = parseInt(slime.getAttribute('data-grid-y'));
	const { x: hx, y: hy } = heroPosition();

	// Trail the hero, staying one tile off their shoulder.
	if (Math.hypot(hx - cx, hy - cy) > 1.9) {
		const tx = hx - (Math.sign(hx - cx) || 1);
		const spot = isWalkable(tx, hy) ? { x: tx, y: hy } : findWalkable(hx, hy);
		moveSprite(slime, spot.x, spot.y, 2.5);
		return;
	}

	// Nip at whatever stands beside it.
	const now = performance.now();
	if (now < companion.nextAttackAt) return;
	const target = livingEnemies().find((enemy) => {
		const ex = parseInt(enemy.getAttribute('data-grid-x'));
		const ey = parseInt(enemy.getAttribute('data-grid-y'));
		return Math.abs(ex - cx) <= 1 && Math.abs(ey - cy) <= 1;
	});
	if (!target) return;
	companion.nextAttackAt = now + 2000;
	const tx = parseInt(target.getAttribute('data-grid-x'));
	const ty = parseInt(target.getAttribute('data-grid-y'));
	setAnimationState(slime, 'walk-' + directionBetween(cx, cy, tx, ty), 0.4);
	damageEnemy(target, Math.max(1, Math.round(stats.damage * 0.3)));
}
