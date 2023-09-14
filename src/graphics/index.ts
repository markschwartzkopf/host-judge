/// <reference path="../../../../types/browser.d.ts" />

type ChecklistItem = { text: string; checked: boolean };

const instructionsDiv = document.getElementById(
	'instructions'
) as HTMLDivElement;
const donationsDiv = document.getElementById('donations') as HTMLDivElement;

let showGotoNext = false;

nodecg.listenFor('videoStopped', () => {
	showGotoNext = true;
	drawScreen();
});

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
	donationsDiv.innerHTML = '';
	if (auditionSegment < 0) {
		const button = makeButton(
			'Start',
			'blue',
			() => {
				NodeCG.waitForReplicants(auditionSegments).then(() => {
					if (auditionSegments.value && auditionSegments.value.length) {
						startNextSegment();
					}
				});
			},
			true
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
			if (showGotoNext) {
				instructionsDiv.appendChild(
					makeButton('Start Next Segment', 'blue', () => {
						startNextSegment();
					})
				);
			}
			if (segment)
				for (let i = 0; i < segment.donations.length; i++) {
					if (!segment.donations[i].hide) {
						const donationDiv = document.createElement('div');
						donationDiv.className = 'donation';
						const headerDiv = document.createElement('div');
						headerDiv.className = 'donation-header';
						const metaDiv = document.createElement('div');
						metaDiv.className = 'metadiv';
						const amount = document.createElement('b');
						amount.innerHTML = `$${segment.donations[i].amount.toFixed(2)} `;
						metaDiv.appendChild(amount);
						metaDiv.appendChild(document.createTextNode('from '));
						const donor = document.createElement('b');
						donor.innerHTML = segment.donations[i].donor;
						metaDiv.appendChild(donor);
						headerDiv.appendChild(metaDiv);
						const buttonDiv = document.createElement('div');
						buttonDiv.style.display = 'flex';
						buttonDiv.appendChild(
							makeButton(
								'&#x2713',
								'green',
								() => {
									segment.donations[i].hide = true;
								},
								false,
								'donation-button'
							)
						);
						buttonDiv.appendChild(
							makeButton(
								'&#8211',
								'red',
								() => {
									segment.donations[i].hide = true;
								},
								false,
								'donation-button'
							)
						);
						headerDiv.appendChild(buttonDiv);
						donationDiv.appendChild(headerDiv);
						const commentDiv = document.createElement('div');
						commentDiv.className = 'comment';
						commentDiv.innerHTML = segment.donations[i].comment;
						donationDiv.appendChild(commentDiv);
						donationsDiv.appendChild(donationDiv);
					}
				}
		});
	}
}

function makeButton(
	text: string,
	color: string,
	cb: () => void,
	disabled?: boolean,
	className?: string
): HTMLDivElement {
	const buttonContainer = document.createElement('div');
	buttonContainer.style.display = 'flex';
	buttonContainer.style.justifyContent = 'space-around';
	buttonContainer.style.alignItems = 'center';
	buttonContainer.style.color = color;
	const button = document.createElement('div');
	button.className = 'button';
	if (className) button.classList.add(className);
	button.style.backgroundColor = disabled ? 'gray' : color;
	button.onclick = () => {
		if (button.style.backgroundColor === color) cb();
	};
	button.innerHTML = text;
	buttonContainer.appendChild(button);
	return buttonContainer;
}

function buttonOn(buttonContainer: HTMLDivElement, on?: boolean) {
	if (on === undefined) on = true;
	const child = buttonContainer.children[0];
	if (child.nodeName === 'DIV')
		(child as HTMLDivElement).style.backgroundColor = on
			? buttonContainer.style.color
			: 'gray';
}

function startNextSegment() {
	auditionSegment++;
	NodeCG.waitForReplicants(auditionSegments).then(() => {
		const segment = auditionSegments.value![auditionSegment];
		for (let i = 0; i < segment.donations.length; i++)
			segment.donations[i].hide = false;
		showGotoNext = false;
		drawScreen();
		nodecg.sendMessage(
			'playFile',
			auditionSegments.value![auditionSegment].filename
		);
	});
}
