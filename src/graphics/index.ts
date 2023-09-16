/// <reference path="../../../../types/browser.d.ts" />

type ChecklistItem = { text: string; checked: boolean };

const instructionsDiv = document.getElementById(
	'instructions'
) as HTMLDivElement;
const donationsDiv = document.getElementById('donations') as HTMLDivElement;

//let showGotoNext = false;

/* nodecg.listenFor('videoStopped', () => {
	showGotoNext = true;
	drawScreen();
}); */

const auditionSegments =
	nodecg.Replicant<AuditionSegment[]>('audition_segments');

const startingChecklist: ChecklistItem[] = [
	{
		text: 'My mic is working in Discord',
		checked: false,
	},
	{
		text: 'I have the GDQHostBot stream open in discord (you should see a black screen)',
		checked: false,
	},
	{
		text: 'I have the blurbs open',
		checked: false,
	},
];

let auditionSegment: number | null = -1;

auditionSegments.on('change', (newVal) => {
	drawScreen();
});

function drawScreen() {
	instructionsDiv.innerHTML = '';
	donationsDiv.innerHTML = '';
	if (auditionSegment !== null && auditionSegment < 0) {
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
		instructionsDiv.appendChild(
			document.createTextNode(
				`Hello and welcome to the AGDQ 2024 host audition. Please make sure you've reviewed the following materials before beginning:`
			)
		);
		const list = document.createElement('ul');
		let item = document.createElement('li');
		item.innerHTML = `Instructions`;
		list.appendChild(item);
		item = document.createElement('li');
		item.innerHTML = `Judging rubric`;
		list.appendChild(item);
		item = document.createElement('li');
		item.innerHTML = `Blurbs`;
		list.appendChild(item);
		instructionsDiv.appendChild(list);
		instructionsDiv.appendChild(
			document.createTextNode(
				`Make sure you have the blurbs open and ready to go. When you’re ready, check the boxes and go to the next page to start.`
			)
		);
		instructionsDiv.appendChild(document.createElement('br'));
		instructionsDiv.appendChild(document.createElement('br'));
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
	} else if (auditionSegment !== null) {
		NodeCG.waitForReplicants(auditionSegments).then(() => {
			const segment =
				auditionSegments.value && auditionSegment !== null
					? auditionSegments.value[auditionSegment]
					: null;
			instructionsDiv.innerHTML = segment ? segment.instructions : '';
			instructionsDiv.appendChild(
				makeButton('Start Next Segment', 'blue', () => {
					if (
						confirm(
							`Are you sure you're finished, and ready for the next segment?`
						)
					)
						startNextSegment();
				})
			);
			if (segment)
				if (segment.donations.length) {
					console.log(segment.donations.length);
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
							if (segment.donations[i].comment) {
								commentDiv.innerHTML = segment.donations[i].comment;
							} else {
								commentDiv.innerHTML = '<i>No comment was provided</i>';
								commentDiv.style.color = 'gray';
								commentDiv.style.textAlign = 'center';
							}
							donationDiv.appendChild(commentDiv);
							donationsDiv.appendChild(donationDiv);
						}
					}
				} else {
					const noDonos = document.createElement('div');
					noDonos.innerHTML = '<i>There are no donations for this segment</i>';
					noDonos.style.color = 'gray';
					noDonos.style.textAlign = 'center';
					noDonos.style.margin = '1em';
					donationsDiv.appendChild(noDonos);
				}
		});
	} else {
		instructionsDiv.innerHTML =
			'Thank you for auditioning. Your audition is now complete. Please close this page now.';
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
	if (auditionSegment !== null) auditionSegment++;
	NodeCG.waitForReplicants(auditionSegments).then(() => {
		if (
			auditionSegments.value &&
			auditionSegment !== null &&
			auditionSegment >= auditionSegments.value.length
		) {
			auditionSegment = null;
		}
		if (auditionSegment === 0) nodecg.sendMessage('obsRecord');
		if (auditionSegment === null) nodecg.sendMessage('obsStopRecord');
		const segment =
			auditionSegments.value && auditionSegment !== null
				? auditionSegments.value[auditionSegment]
				: null;
		if (segment)
			for (let i = 0; i < segment.donations.length; i++)
				segment.donations[i].hide = false;
		//showGotoNext = false;
		drawScreen();
		if (auditionSegment !== null)
			nodecg.sendMessage(
				'playFile',
				auditionSegments.value![auditionSegment].filename
			);
	});
}
