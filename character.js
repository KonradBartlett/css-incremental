// character positioning and movement
function moveCharacter(character, targetX, targetY) {
	const currentX = parseInt(character.getAttribute('data-grid-x'));
	const currentY = parseInt(character.getAttribute('data-grid-y'));
	const deltaX = targetX - currentX;
	const deltaY = targetY - currentY;
	const moveDuration =
		Math.sqrt(deltaX * deltaX + deltaY * deltaY) /
		parseFloat(character.getAttribute('data-move-speed'));
	character.setAttribute('data-movement-duration', moveDuration);
	character.setAttribute('data-grid-x', currentX + deltaX);
	character.setAttribute('data-grid-y', currentY + deltaY);

	const cell = `.cell-${currentX + deltaX}⋅${currentY + deltaY}`;
	highlightElement(document.querySelector(cell), moveDuration);

	const direction =
		Math.abs(deltaX) > Math.abs(deltaY)
			? deltaX > 0
				? 'right'
				: 'left'
			: deltaY > 0
			? 'down'
			: 'up';
	if (deltaX !== 0 || deltaY !== 0) {
		setAnimationState(character, 'walk-' + direction, moveDuration);
	}
}
