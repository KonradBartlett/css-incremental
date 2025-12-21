const skills = document.getElementById('skills');
const skillColumns = 5;
// initializeGrid(skills, skillColumns, 9);

app.style.setProperty('--skill-columns', skillColumns);

const skillMap = {
	down: {
		cost: 0,
		right: {
			cost: 1,
		},
		left: {
			cost: 1,
		},
		down: {
			cost: 0,
			down: {
				cost: 1,
				left: {
					cost: 2,
					down: {
						cost: 3,
						left: {
							cost: 4,
						},
					},
				},
				right: {
					cost: 2,
					down: {
						cost: 3,
						left: {
							cost: 4,
							down: {
								cost: 5,
								down: {
									cost: 6,
									left: {
										cost: 7,
										up: {
											cost: 8,
										},
										left: {
											cost: 8,
										},
									},
									right: {
										cost: 7,
										up: {
											cost: 8,
										},
										right: {
											cost: 8,
										},
									},
									down: {
										cost: 10,
										down: {
											cost: 10,
										},
									},
								},
							},
						},
						right: {
							cost: 4,
						},
					},
				},
			},
		},
	},
	// right: {
	// 	name: 'Skill 2',
	// },
	// down: {
	// 	name: 'Skill 3',
	// },
};

(function initializeSkills(skill, parentRow = 0, parentCol = 2, direction, parentElement) {
	let skillElement = document.createElement('label');
	skillElement.classList.add('info');
	skillElement.classList.add('skill-cell');

	const disableElement = document.createElement('div');
	disableElement.classList.add('skill-block');
	skillElement.appendChild(disableElement);

	const newRow = parentRow + (direction == 'down' ? 1 : direction == 'up' ? -1 : 0);
	console.log(newRow, parentRow, direction == 'down' ? 1 : direction == 'up' ? -1 : 0);
	const newCol = parentCol + (direction == 'right' ? 1 : direction == 'left' ? -1 : 0);
	skillElement.id = `skill-${newRow}-${newCol}`;

	skillElement.setAttribute('data-skill-cost', skill.cost);

	skillElement.setAttribute('data-skill-row', newRow);
	skillElement.setAttribute('data-skill-col', newCol);

	skillElement.setAttribute('data-parent', `skill-${parentRow}-${parentCol}`);

	skillElement.setAttribute(
		'data-children',
		`${skill.down ? 'down' : ''}
        ${skill.up ? 'up' : ''} ${skill.left ? 'left' : ''} ${skill.right ? 'right' : ''}`,
	);

	const skillIcon = document.createElement('img');
	skillIcon.src = '/public/icon/fa-d20.svg';
	skillElement.appendChild(skillIcon);

	let checkbox = document.createElement('input');
	checkbox.type = 'checkbox';
	const skillId = `skill-${newRow}-${newCol}`;
	checkbox.id = 'check-' + skillId;
	skillElement.appendChild(checkbox);

	const skillSubgrid = document.createElement('div');
	skillSubgrid.classList.add('skill-subgrid');
	skillSubgrid.appendChild(skillElement);

	parentElement.appendChild(skillSubgrid);

	if (skill.down) initializeSkills(skill.down, newRow, newCol, 'down', skillSubgrid);
	if (skill.up) initializeSkills(skill.up, newRow, newCol, 'up', skillSubgrid);
	if (skill.left) initializeSkills(skill.left, newRow, newCol, 'left', skillSubgrid);
	if (skill.right) initializeSkills(skill.right, newRow, newCol, 'right', skillSubgrid);
})(skillMap, undefined, undefined, undefined, skills);
