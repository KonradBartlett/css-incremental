// Sprite animation state helpers. Rendering itself is pure CSS keyed off
// data-animation-name / data-animation-state.

function setAnimationState(element, animationName, duration) {
	element.setAttribute('data-animation-name', animationName);
	element.setAttribute('data-animation-state', 'playing');
	if (duration) {
		clearTimeout(element._animationTimer);
		element._animationTimer = setTimeout(() => {
			element.setAttribute('data-animation-state', 'idle');
		}, duration * 1000);
	}
}
