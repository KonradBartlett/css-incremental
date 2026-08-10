// Rotating slay-quests: a contract for N of one monster type, paying out
// above bounty rate. A fresh quest rolls a few seconds after completion.

function rollQuest() {
	const unlocked = ENEMY_TYPES.filter((t) => state.kills >= t.minKills);
	const type = unlocked[randomXtoY(0, unlocked.length - 1)];
	const need = randomXtoY(4, 8);
	state.quest = {
		typeId: type.id,
		need,
		progress: 0,
		reward: Math.round(need * type.gold * 1.5),
	};
	renderQuest();
	saveGame();
}

function questProgress(typeId) {
	const quest = state.quest;
	if (!quest || quest.typeId !== typeId || quest.progress >= quest.need) return;

	quest.progress += 1;
	if (quest.progress >= quest.need) {
		addGold(quest.reward);
		showBanner(`📜 Quest complete! +${formatGold(quest.reward)} gold`);
		sfx.chime();
		setTimeout(rollQuest, 4000);
	}
	renderQuest();
}

function renderQuest() {
	const quest = state.quest;
	if (!quest) return;
	const type = ENEMY_TYPES.find((t) => t.id === quest.typeId);
	const done = quest.progress >= quest.need;

	document.getElementById('quest-text').textContent = done
		? 'Contract fulfilled!'
		: `Slay ${quest.need} ${type ? type.name : quest.typeId}s`;
	document.getElementById('quest-reward').textContent = `Reward: ${formatGold(quest.reward)} gold`;
	document
		.getElementById('quest-fill')
		.style.setProperty('--quest-percent', `${(quest.progress / quest.need) * 100}%`);
	document.getElementById('quest-count').textContent = `${quest.progress}/${quest.need}`;
}
