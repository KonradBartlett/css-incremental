// Skill tree: builds the nested-checkbox DOM from SKILL_TREE, handles
// purchases, and folds owned skill effects into the live stats object.

const stats = {
	damage: 1,
	moveSpeed: 2, // tiles per second
	attackCooldown: 1.5,
	goldMult: 1,
	flatGold: 0,
	idleGold: 0,
	maxEnemies: 5,
	whirlwind: false,
	autoHunt: false,
	companion: false,
	spawnInterval: 4,
};

function recalcStats() {
	stats.damage = 1;
	stats.moveSpeed = 2;
	stats.attackCooldown = 1.5;
	stats.goldMult = 1;
	stats.flatGold = 0;
	stats.idleGold = 0;
	stats.maxEnemies = 5;
	stats.whirlwind = false;
	stats.autoHunt = false;
	stats.companion = false;
	stats.spawnInterval = 4;

	for (const id of state.owned) {
		const skill = SKILL_TREE.find((s) => s.id === id);
		if (!skill) continue;
		const e = skill.effect;
		if (e.damage) stats.damage += e.damage;
		if (e.damageMult) stats.damage *= e.damageMult;
		if (e.speedMult) stats.moveSpeed *= e.speedMult;
		if (e.attackHaste) stats.attackCooldown /= 1 + e.attackHaste;
		if (e.goldMult) stats.goldMult *= e.goldMult;
		if (e.flatGold) stats.flatGold += e.flatGold;
		if (e.idleGold) stats.idleGold += e.idleGold;
		if (e.maxEnemies) stats.maxEnemies += e.maxEnemies;
		if (e.spawnHaste) stats.spawnInterval /= e.spawnHaste;
		if (e.whirlwind) stats.whirlwind = true;
		if (e.autoHunt) stats.autoHunt = true;
		if (e.companion) stats.companion = true;
	}

	// Legend bonuses persist across chapters: +10% gold, +5% damage each.
	stats.goldMult *= 1 + 0.1 * state.legend;
	stats.damage = Math.max(1, Math.round(stats.damage * (1 + 0.05 * state.legend)));

	renderStats();
}

function skillChildren(skill) {
	return SKILL_TREE.filter((s) => s.parent === skill.id);
}

function childDirections(skill) {
	return skillChildren(skill)
		.map((child) => {
			if (child.row > skill.row) return 'down';
			if (child.row < skill.row) return 'up';
			if (child.col > skill.col) return 'right';
			return 'left';
		})
		.join(' ');
}

function buildSkillNode(skill, parentElement) {
	const label = document.createElement('label');
	label.classList.add('info', 'skill-cell');
	label.id = `skill-${skill.id}`;
	label.setAttribute('data-skill-id', skill.id);
	label.setAttribute('data-skill-cost', skill.cost);
	label.setAttribute('data-skill-row', skill.row);
	label.setAttribute('data-skill-col', skill.col);
	label.setAttribute('data-children', childDirections(skill));
	label.style.setProperty('--skill-hue', `${skill.hue}deg`);

	const blocker = document.createElement('div');
	blocker.classList.add('skill-block');
	label.appendChild(blocker);

	const icon = document.createElement('img');
	icon.src = '/public/icon/fa-d20.svg';
	icon.alt = skill.name;
	icon.draggable = false;
	label.appendChild(icon);

	const checkbox = document.createElement('input');
	checkbox.type = 'checkbox';
	checkbox.addEventListener('change', () => attemptPurchase(skill, checkbox));
	label.appendChild(checkbox);

	const subgrid = document.createElement('div');
	subgrid.classList.add('skill-subgrid');
	subgrid.appendChild(label);
	parentElement.appendChild(subgrid);

	for (const child of skillChildren(skill)) {
		buildSkillNode(child, subgrid);
	}
}

function attemptPurchase(skill, checkbox) {
	if (!checkbox.checked) {
		// No refunds in this fable.
		checkbox.checked = state.owned.includes(skill.id);
		return;
	}
	if (state.owned.includes(skill.id)) return;
	if (state.gold < skill.cost) {
		checkbox.checked = false;
		sfx.denied();
		return;
	}

	addGold(-skill.cost);
	state.owned.push(skill.id);
	checkbox.disabled = true;
	sfx.buy();
	recalcStats();
	updateHeroAppearance();
	updateCompanion();
	saveGame();
}

function initializeSkills() {
	const skillsElement = document.getElementById('skills');
	skillsElement.innerHTML = '';
	app.style.setProperty('--skill-columns', 5);

	const root = SKILL_TREE.find((s) => s.parent === null);
	buildSkillNode(root, skillsElement);
	skillsElement.firstElementChild.classList.add('skill-root');

	// Restore owned skills from the save.
	for (const id of state.owned) {
		const label = document.getElementById(`skill-${id}`);
		if (!label) continue;
		const checkbox = label.querySelector('input');
		checkbox.checked = true;
		checkbox.disabled = true;
	}

	// Tooltip follows skill hover.
	const tooltip = document.getElementById('tooltip');
	skillsElement.addEventListener('mouseover', (event) => {
		const label = event.target.closest('.skill-cell');
		if (!label) return;
		const skill = SKILL_TREE.find((s) => s.id === label.getAttribute('data-skill-id'));
		const owned = state.owned.includes(skill.id);
		tooltip.innerHTML = `
			<strong>${skill.name}</strong><br />
			${skill.desc}<br />
			<em>${owned ? 'Learned' : skill.cost === 0 ? 'Free' : `Cost: ${formatGold(skill.cost)} gold`}</em>`;
	});

	recalcStats();
}
