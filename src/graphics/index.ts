/// <reference path="../../../../types/browser.d.ts" />

type ChecklistItem = { text: string; checked: boolean };

const instructionsDiv = document.getElementById(
	'instructions'
) as HTMLDivElement;

const auditionSegments =
	nodecg.Replicant<AuditionSegment[]>('audition_segments');

const startingChecklist: ChecklistItem[] = [
	{
		text: 'My mic is working in Discord',
		checked: false,
	},
	{
		text: 'I see video in Discord',
		checked: false,
	},
	{
		text: 'I have the blurbs open',
		checked: false,
	},
];

let auditionSegment = -1;

auditionSegments.on('change', (newVal) => {
	drawScreen();
});

function drawScreen() {
	instructionsDiv.innerHTML = '';

	if (auditionSegment < 0) {
		const button = makeButton(
			'Start',
			() => {
				NodeCG.waitForReplicants(auditionSegments).then(() => {
					if (auditionSegments.value && auditionSegments.value.length) {
						auditionSegment++;
						drawScreen();
					}
				});
			},
			'disabled'
		);
		for (let i = 0; i < startingChecklist.length; i++) {
			const itemDiv = document.createElement('div');
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.checked = startingChecklist[i].checked;
			checkbox.onclick = () => {
				startingChecklist[i].checked = checkbox.checked;
				if (startingChecklist.map((x) => x.checked).every((x) => x)) {
					buttonOn(button);
				} else buttonOn(button, false);
			};
			itemDiv.appendChild(checkbox);
			itemDiv.appendChild(document.createTextNode(startingChecklist[i].text));
			instructionsDiv.appendChild(itemDiv);
		}
		instructionsDiv.appendChild(button);
	} else {
		NodeCG.waitForReplicants(auditionSegments).then(() => {
			const segment = auditionSegments.value
				? auditionSegments.value[auditionSegment]
				: null;
			instructionsDiv.innerHTML = segment ? segment.instructions : '';
		});
	}
}

function makeButton(
	text: string,
	cb: () => void,
	disabled?: 'disabled'
): HTMLDivElement {
	const buttonContainer = document.createElement('div');
	buttonContainer.style.display = 'flex';
	buttonContainer.style.justifyContent = 'space-around';
	buttonContainer.style.alignItems = 'center';
	const button = document.createElement('div');
	button.className = 'button';
	if (disabled) button.style.backgroundColor = 'gray';
	button.onclick = () => {
		if (button.style.backgroundColor === 'blue') cb();
	};
	button.innerHTML = text;
	buttonContainer.appendChild(button);
	return buttonContainer;
}

function buttonOn(buttonContainer: HTMLDivElement, on?: boolean) {
	if (on === undefined) on = true;
	const child = buttonContainer.children[0];
	if (child.nodeName === 'DIV')
		(child as HTMLDivElement).style.backgroundColor = on ? 'blue' : 'gray';
}
