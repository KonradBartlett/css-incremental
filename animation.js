function highlightElement(element, duration) {
	// element.classList.add('highlighted');

	setTimeout(() => {
		element.classList.remove('highlighted');
	}, duration * 1000);
}

// sprite animations
function setAnimationState(character, animationName, duration) {
	character.setAttribute('data-animation-name', animationName);
	character.setAttribute('data-animation-state', 'playing');
	if (duration) {
		setTimeout(() => {
			character.setAttribute('data-animation-state', 'idle');
		}, duration * 1000);
	}
}

const character = document.getElementById('character-1');
// moveCharacter(character, 2, 3);
