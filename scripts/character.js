// Hero movement and combat.

const hero = {
	element: null,
	busyUntil: 0, // timestamp (ms) until current walk finishes
	nextAttackAt: 0,
};

function heroPosition() {
	return {
		x: parseInt(hero.element.getAttribute('data-grid-x')),
		y: parseInt(hero.element.getAttribute('data-grid-y')),
	};
}

function directionBetween(fromX, fromY, toX, toY) {
	const deltaX = toX - fromX;
	const deltaY = toY - fromY;
	return Math.abs(deltaX) > Math.abs(deltaY)
		? deltaX > 0
			? 'right'
			: 'left'
		: deltaY > 0
		? 'down'
		: 'up';
}

// Slides any sprite element to a grid cell; CSS transitions do the tween.
function moveSprite(element, targetX, targetY, speed) {
	const currentX = parseInt(element.getAttribute('data-grid-x'));
	const currentY = parseInt(element.getAttribute('data-grid-y'));
	const deltaX = targetX - currentX;
	const deltaY = targetY - currentY;
	if (deltaX === 0 && deltaY === 0) return 0;

	const moveDuration = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / speed;

	element.setAttribute('data-movement-duration', moveDuration);
	element.setAttribute('data-grid-x', targetX);
	element.setAttribute('data-grid-y', targetY);

	setAnimationState(element, 'walk-' + directionBetween(currentX, currentY, targetX, targetY), moveDuration);
	return moveDuration;
}

// Breadth-first search over walkable cells, 4-directional. Returns the
// waypoints (excluding the start) to the goal — or, if the goal is
// unreachable, to the reachable cell closest to it.
function findPath(startX, startY, goalX, goalY) {
	const key = (x, y) => y * WORLD_SIZE + x;
	const queue = [[startX, startY]];
	const cameFrom = new Map([[key(startX, startY), null]]);
	let best = [startX, startY];
	let bestDistance = Math.hypot(goalX - startX, goalY - startY);

	while (queue.length) {
		const [x, y] = queue.shift();
		if (x === goalX && y === goalY) {
			best = [x, y];
			break;
		}
		const distance = Math.hypot(goalX - x, goalY - y);
		if (distance < bestDistance) {
			bestDistance = distance;
			best = [x, y];
		}
		for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
			const nx = x + dx;
			const ny = y + dy;
			if (!isWalkable(nx, ny) || cameFrom.has(key(nx, ny))) continue;
			cameFrom.set(key(nx, ny), [x, y]);
			queue.push([nx, ny]);
		}
	}

	const path = [];
	let current = best;
	while (current && !(current[0] === startX && current[1] === startY)) {
		path.push({ x: current[0], y: current[1] });
		current = cameFrom.get(key(current[0], current[1]));
	}
	return path.reverse();
}

// Merge consecutive same-direction steps into single segments so each
// straight run is one smooth CSS transition instead of 1-tile hops.
function compressPath(path, startX, startY) {
	const segments = [];
	let previous = { x: startX, y: startY };
	let direction = null;
	for (const point of path) {
		const d = `${Math.sign(point.x - previous.x)},${Math.sign(point.y - previous.y)}`;
		if (d === direction) segments[segments.length - 1] = point;
		else segments.push(point);
		direction = d;
		previous = point;
	}
	return segments;
}

function walkHeroTo(targetX, targetY) {
	if (!isWalkable(targetX, targetY)) return;
	if (performance.now() < hero.busyUntil) return;

	const { x, y } = heroPosition();
	const segments = compressPath(findPath(x, y, targetX, targetY), x, y);
	if (!segments.length) return;

	let totalDuration = 0;
	let px = x;
	let py = y;
	for (const segment of segments) {
		totalDuration += Math.hypot(segment.x - px, segment.y - py) / stats.moveSpeed;
		px = segment.x;
		py = segment.y;
	}
	hero.busyUntil = performance.now() + totalDuration * 1000;

	clearTimeout(hero.walkTimer);
	const walkSegment = (index) => {
		if (index >= segments.length) return;
		const duration = moveSprite(hero.element, segments[index].x, segments[index].y, stats.moveSpeed);
		if (index + 1 < segments.length) {
			hero.walkTimer = setTimeout(() => walkSegment(index + 1), duration * 1000);
		}
	};
	walkSegment(0);
}

function heroAttack(targets) {
	const now = performance.now();
	hero.nextAttackAt = now + stats.attackCooldown * 1000;

	const { x, y } = heroPosition();
	const first = targets[0];
	const dir = directionBetween(x, y, parseInt(first.getAttribute('data-grid-x')), parseInt(first.getAttribute('data-grid-y')));
	setAnimationState(hero.element, 'slash-' + dir, 0.4);

	for (const enemy of targets) {
		// 10% critical strikes hit twice as hard.
		const isCrit = Math.random() < 0.1;
		damageEnemy(enemy, isCrit ? stats.damage * 2 : stats.damage, isCrit);
	}
}

// One combat/AI tick: attack adjacent monsters, or hunt if the skill is owned.
function heroTick() {
	const now = performance.now();
	if (now < hero.busyUntil) return;

	const { x, y } = heroPosition();
	const adjacent = livingEnemies().filter((enemy) => {
		const ex = parseInt(enemy.getAttribute('data-grid-x'));
		const ey = parseInt(enemy.getAttribute('data-grid-y'));
		return Math.abs(ex - x) <= 1 && Math.abs(ey - y) <= 1;
	});

	if (adjacent.length > 0) {
		if (now >= hero.nextAttackAt) {
			heroAttack(stats.whirlwind ? adjacent : [adjacent[0]]);
		}
		return;
	}

	if (stats.autoHunt) {
		const nearest = nearestEnemy(x, y);
		if (nearest) {
			const targetX = parseInt(nearest.getAttribute('data-grid-x'));
			const targetY = parseInt(nearest.getAttribute('data-grid-y'));
			// Step to a walkable cell beside the monster, not on top of it.
			const side = findWalkable(
				targetX + Math.sign(x - targetX),
				targetY + Math.sign(y - targetY),
			);
			walkHeroTo(side.x, side.y);
		}
	}
}
