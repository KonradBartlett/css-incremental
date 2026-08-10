// Treasure caches: golden sparks that appear on walkable land. Walk onto
// one to loot it; 10% are jackpots. They fade away if ignored.

const MAX_TREASURES = 3;

function spawnTreasure() {
	if (document.querySelectorAll('.treasure').length >= MAX_TREASURES) return;
	const { x, y } = randomWalkableCell();

	const chest = document.createElement('div');
	chest.classList.add('treasure');
	chest.setAttribute('data-grid-x', x);
	chest.setAttribute('data-grid-y', y);
	document.getElementById('enemy-list').appendChild(chest);

	// Unclaimed treasure sinks back into the earth.
	setTimeout(() => {
		chest.classList.add('fading');
		setTimeout(() => chest.remove(), 1000);
	}, 45000);
}

function collectTreasure() {
	const { x, y } = heroPosition();
	for (const chest of document.querySelectorAll('.treasure:not(.fading)')) {
		if (
			parseInt(chest.getAttribute('data-grid-x')) !== x ||
			parseInt(chest.getAttribute('data-grid-y')) !== y
		) {
			continue;
		}
		chest.classList.add('fading');
		setTimeout(() => chest.remove(), 400);

		// Worth more as the chapter deepens.
		let amount = Math.round((100 + state.kills * 10) * stats.goldMult);
		if (Math.random() < 0.1) {
			amount *= 5;
			showBanner(`💰 Jackpot! The cache held ${formatGold(amount)} gold!`);
		}
		addGold(amount);
		spawnPopup(x, y, `+${formatGold(amount)}`, 'gold-popup');
		sfx.coin();
	}
}
