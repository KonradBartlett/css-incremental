const app = document.getElementById('app');

const gameboard = document.getElementById('gameboard');

function initializeGrid(element, columns, rows = columns) {
	element.style.setProperty('--columns', columns);
	for (let i = 0; i < columns * rows; i++) {
		const cell = document.createElement('div');
		cell.classList.add('cell');
		const anchorName = `${i % columns}⋅${Math.floor(i / columns)}`;
		cell.classList.add(`cell-${anchorName}`);
		cell.innerText = anchorName;
		element.appendChild(cell);

		cell.addEventListener('click', () => {
			moveCharacter(character, i % columns, Math.floor(i / columns));
		});
	}
}

initializeGrid(gameboard, 16, 32);
