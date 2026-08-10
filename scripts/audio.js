// Tiny WebAudio synth — every sound is an oscillator with an envelope, so
// no audio assets are needed. Gated by the Sound checkbox in settings.

const audio = { ctx: null };

function audioContext() {
	if (!audio.ctx) audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
	if (audio.ctx.state === 'suspended') audio.ctx.resume();
	return audio.ctx;
}

// Browsers block audio until a user gesture; the game is click-driven, so
// the first click unlocks the context.
document.addEventListener('pointerdown', () => audioContext(), { once: true });

function soundEnabled() {
	const checkbox = document.getElementById('enable-sound');
	return checkbox && checkbox.checked;
}

function tone(frequency, duration, { type = 'square', volume = 0.07, delay = 0, slide = 0 } = {}) {
	if (!soundEnabled()) return;
	const ctx = audioContext();
	const start = ctx.currentTime + delay;

	const oscillator = ctx.createOscillator();
	const gain = ctx.createGain();
	oscillator.type = type;
	oscillator.frequency.setValueAtTime(frequency, start);
	if (slide) {
		oscillator.frequency.exponentialRampToValueAtTime(
			Math.max(30, frequency + slide),
			start + duration,
		);
	}
	gain.gain.setValueAtTime(volume, start);
	gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

	oscillator.connect(gain).connect(ctx.destination);
	oscillator.start(start);
	oscillator.stop(start + duration);
}

const sfx = {
	hit: () => tone(160, 0.08, { slide: -60 }),
	crit: () => {
		tone(320, 0.1, { slide: -120 });
		tone(480, 0.08, { delay: 0.04 });
	},
	coin: () => {
		tone(880, 0.07, { type: 'triangle' });
		tone(1320, 0.12, { type: 'triangle', delay: 0.07 });
	},
	buy: () => {
		tone(523, 0.08, { type: 'triangle' });
		tone(659, 0.08, { type: 'triangle', delay: 0.07 });
		tone(784, 0.16, { type: 'triangle', delay: 0.14 });
	},
	denied: () => tone(110, 0.15),
	boss: () => {
		tone(110, 0.3, { type: 'sawtooth', volume: 0.09 });
		tone(147, 0.3, { type: 'sawtooth', volume: 0.09, delay: 0.25 });
		tone(196, 0.5, { type: 'sawtooth', volume: 0.09, delay: 0.5 });
	},
	chime: () => tone(1047, 0.25, { type: 'sine', volume: 0.05 }),
};
