// Visible gear progression: owned skills compose LPC layers into a gear
// sheet that CSS stacks over the hero's base body sprite. Both sheets share
// the universal 832x3456 layout, so one background-position animates both.
//
// NOTE: lpc-spritesheets/ currently holds only the a-f asset folders.
// Items from missing folders (torso/, legs/, feet/, hair/, weapon/...)
// fail soft inside the generator and start rendering automatically once
// those folders are added — no code change needed.

// Stages apply in order; a later item of the same slot replaces an earlier
// one (e.g. Warlord's gold plate replaces Berserker's steel).
const OUTFIT_STAGES = [
	// Base clothes — all in not-yet-present folders, here for self-healing.
	{ skill: null, items: [
		{ itemId: 'hair_plain', recolor: 'dark_brown' },
		{ itemId: 'torso_clothes_longsleeve', recolor: 'forest' },
		{ itemId: 'legs_pants', recolor: 'brown' },
		{ itemId: 'feet_boots_basic' },
	] },

	// Combat: steel creeps up the arms, then turns gold.
	{ skill: 'sharp-blade', items: [
		{ itemId: 'weapon_sword_arming' },
		{ itemId: 'arms_bracers', recolor: 'steel' },
	] },
	{ skill: 'battle-fury', items: [{ itemId: 'arms_gloves', recolor: 'steel' }] },
	{ skill: 'whirlwind', items: [{ itemId: 'weapon_sword_longsword' }] },
	{ skill: 'berserker', items: [
		{ itemId: 'arms_armour', recolor: 'steel' },
		{ itemId: 'torso_armour_plate', recolor: 'steel' },
	] },
	{ skill: 'warlord', items: [
		{ itemId: 'arms_armour', recolor: 'gold' },
		{ itemId: 'torso_armour_plate', recolor: 'gold' },
		{ itemId: 'beards_winter', recolor: 'redhead' },
	] },

	// Fortune: packs for the takings, gold where it counts.
	{ skill: 'prospector', items: [{ itemId: 'backpack', variant: 'leather' }] },
	{ skill: 'gold-mine', items: [{ itemId: 'backpack_squarepack', variant: 'forest' }] },
	{ skill: 'midas-touch', items: [{ itemId: 'arms_gloves', recolor: 'gold' }] },
	{ skill: 'ascension', items: [{ itemId: 'wings_lunar', variant: 'amber' }] },

	// Swiftness: capes, then wings.
	{ skill: 'fleet-foot', items: [{ itemId: 'cape_tattered', variant: 'brown' }] },
	{ skill: 'wind-walker', items: [{ itemId: 'cape_solid', variant: 'blue' }] },
	{ skill: 'storm-stride', items: [{ itemId: 'cape_solid', variant: 'black' }] },
	{ skill: 'tempest', items: [{ itemId: 'wings_dragonfly_transparent', variant: 'blue' }] },
];

// Only the animations the game actually plays — keeps fetch count down.
// Idle reuses walk frame 0, so 'idle' isn't composed at all.
const HERO_ANIMATIONS = ['walk', 'slash'];

let appearanceGeneration = 0;
let appearanceTimer = null;

// Debounced: buying a chain of skills in one burst composes a single sheet.
function updateHeroAppearance() {
	clearTimeout(appearanceTimer);
	appearanceTimer = setTimeout(composeHeroSheet, 150);
}

// Items like capes and wings have layers meant to draw BEHIND the body
// (zPos below the body's z=10). Those go on a second sheet that CSS slots
// underneath the body sprite. This registers virtual front/behind items in
// the generator's metadata so each sheet only composes its own half.
const BODY_Z = 10;

function splitItemLayers(itemId) {
	const metadata = LPCSpriteSheetGenerator.ITEM_METADATA;
	const meta = metadata[itemId];
	if (!meta) return { front: itemId, behind: null }; // unknown id: fails soft

	const layers = [];
	for (let i = 1; i < 10; i++) {
		const layer = meta.layers?.[`layer_${i}`];
		if (!layer) break;
		layers.push(layer);
	}
	const behindLayers = layers.filter((l) => (l.zPos ?? 100) < BODY_Z);
	if (!behindLayers.length) return { front: itemId, behind: null };

	const frontLayers = layers.filter((l) => (l.zPos ?? 100) >= BODY_Z);
	const register = (suffix, subset) => {
		const id = itemId + suffix;
		if (!metadata[id]) {
			const layersObject = {};
			subset.forEach((layer, i) => (layersObject[`layer_${i + 1}`] = layer));
			metadata[id] = { ...meta, layers: layersObject };
		}
		return id;
	};
	return {
		front: frontLayers.length ? register('__front', frontLayers) : null,
		behind: register('__behind', behindLayers),
	};
}

async function composeHeroSheet() {
	const frontSelections = [];
	const behindSelections = [];
	for (const stage of OUTFIT_STAGES) {
		if (stage.skill && !state.owned.includes(stage.skill)) continue;
		for (const item of stage.items) {
			const { front, behind } = splitItemLayers(item.itemId);
			if (front) frontSelections.push({ ...item, itemId: front });
			if (behind) behindSelections.push({ ...item, itemId: behind });
		}
	}
	if (!frontSelections.length && !behindSelections.length) return;

	const generation = ++appearanceGeneration;
	const options = {
		bodyType: 'male',
		assetsUrl: '/lpc-spritesheets/',
		animations: HERO_ANIMATIONS,
	};
	try {
		const [frontSheet, behindSheet] = await Promise.all([
			frontSelections.length ? LPCSpriteSheetGenerator.createSpritesheet(frontSelections, options) : null,
			behindSelections.length ? LPCSpriteSheetGenerator.createSpritesheet(behindSelections, options) : null,
		]);
		// A purchase mid-generation may have kicked off a newer sheet.
		if (generation !== appearanceGeneration) return;
		if (frontSheet) hero.element.style.setProperty('--gear-sheet', `url(${frontSheet})`);
		if (behindSheet) hero.element.style.setProperty('--gear-behind-sheet', `url(${behindSheet})`);
	} catch (error) {
		console.warn('Could not compose hero gear sheets:', error);
	}
}

// The zombie roams once kills ramp up; its sheet is composed at runtime
// from the LPC zombie body so we get all walk directions + idle for free.
async function generateZombieSheet() {
	try {
		const sheet = await LPCSpriteSheetGenerator.createSpritesheet(
			[{ itemId: 'body_zombie' }],
			{ bodyType: 'male', assetsUrl: '/lpc-spritesheets/', animations: ['walk', 'hurt'] },
		);
		document.documentElement.style.setProperty('--zombie-sheet', `url(${sheet})`);
	} catch (error) {
		console.warn('Could not compose zombie sheet:', error);
	}
}
