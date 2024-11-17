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
		text: 'I have the blurbs and audition context open',
		checked: false,
	},
];

let auditionSegment: number | null | 'alert' = -1;
let obsRecording = false;

auditionSegments.on('change', () => {
	drawScreen();
});

const activeDonations = nodecg.Replicant<Donation[]>('activeDonations');
activeDonations.value = [];
activeDonations.on('change', () => {
	if (
		auditionSegment !== null &&
		auditionSegment !== 'alert' &&
		auditionSegment >= 0
	)
		drawScreen();
});

let participantName: string | undefined;

function drawScreen() {
	instructionsDiv.innerHTML = '';
	donationsDiv.innerHTML = '';
	if (
		auditionSegment !== null &&
		auditionSegment !== 'alert' &&
		auditionSegment < 0
	) {
		nodecg
			.sendMessage('preloadVideo', auditionSegments.value![0].filename)
			.catch((err) => {
				nodecg.log.error(err);
			});

		const button = makeButton(
			'Start',
			'blue',
			() => {
				NodeCG.waitForReplicants(auditionSegments)
					.then(() => {
						if (auditionSegments.value && auditionSegments.value.length) {
							startNextSegment();
						}
					})
					.catch((err) => {
						nodecg.log.error(err);
					});
			},
			true
		);
		instructionsDiv.appendChild(
			document.createTextNode(
				`Hello and welcome to the Frost Fatales 2025 host audition. Please make sure you've reviewed the audition materials before beginning. `
			)
		);

		instructionsDiv.appendChild(
			document.createTextNode(
				`Make sure you have the blurbs and context open and ready to go. When you're ready, check the boxes, enter your username, and press start to begin.`
			)
		);
		instructionsDiv.appendChild(document.createElement('br'));
		instructionsDiv.appendChild(document.createElement('br'));
		for (let i = 0; i < startingChecklist.length; i++) {
			const itemDiv = document.createElement('div');
			const checkbox = document.createElement('input');
			checkbox.id = `checkbox-${i}`;
			checkbox.type = 'checkbox';
			checkbox.checked = startingChecklist[i].checked;
			checkbox.onclick = () => {
				startingChecklist[i].checked = checkbox.checked;
				if (
					startingChecklist.map((x) => x.checked).every((x) => x) &&
					name.value !== ''
				) {
					buttonOn(button);
				} else buttonOn(button, false);
			};
			itemDiv.appendChild(checkbox);

			const label = document.createElement('label');
			label.innerText = startingChecklist[i].text;
			label.htmlFor = `checkbox-${i}`;

			itemDiv.appendChild(label);
			instructionsDiv.appendChild(itemDiv);
		}

		instructionsDiv.appendChild(document.createElement('br'));

		const label = document.createElement('label');
		label.htmlFor = 'participant';
		label.innerText = 'Your Discord Username';

		instructionsDiv.appendChild(label);
		instructionsDiv.appendChild(document.createElement('br'));

		const name = document.createElement('input');
		name.id = 'participant';
		name.type = 'text';
		name.addEventListener('input', () => {
			participantName = name.value;
			if (
				startingChecklist.map((x) => x.checked).every((x) => x) &&
				name.value !== ''
			) {
				buttonOn(button);
			} else buttonOn(button, false);
		});

		instructionsDiv.appendChild(name);

		instructionsDiv.appendChild(button);
	} else if (auditionSegment !== null && auditionSegment !== 'alert') {
		NodeCG.waitForReplicants(auditionSegments, activeDonations)
			.then(() => {
				const segment =
					auditionSegments.value &&
					auditionSegment !== null &&
					auditionSegment !== 'alert'
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
					if (activeDonations.value && activeDonations.value.length) {
						const pinned = [...activeDonations.value].filter(
							(donation) => donation.pinned
						);

						const unpinned = activeDonations.value.filter(
							(donation) => !donation.pinned
						);

						for (let i = 0, l = pinned.length; i < l; i++) {
							const donation = pinned[i];
							if (!donation.hide) {
								const donationDiv = document.createElement('div');
								donationDiv.className = 'donation';
								const headerDiv = document.createElement('div');
								headerDiv.className = 'donation-header';
								const metaDiv = document.createElement('div');
								metaDiv.className = 'metadiv';
								const amount = document.createElement('b');
								amount.innerHTML = `$${donation.amount.toFixed(2)} `;
								metaDiv.appendChild(amount);
								metaDiv.appendChild(document.createTextNode('from '));
								const donor = document.createElement('b');
								donor.innerHTML = donation.donor;
								metaDiv.appendChild(donor);
								headerDiv.appendChild(metaDiv);
								const buttonDiv = document.createElement('div');
								buttonDiv.style.display = 'flex';

								const upButton = makeButton(
									'⇧',
									i === 0 ? '#212427' : '#6B6D6F',
									() => {
										if (i === 0) return;
										const donation = pinned.splice(i, 1)[0];
										pinned.splice(i - 1, 0, donation);
										activeDonations.value = [...pinned, ...unpinned];
									},
									false,
									'donation-button'
								);
								buttonDiv.appendChild(upButton);

								const downButton = makeButton(
									'⇩',
									i === l - 1 ? '#212427' : '#6B6D6F',
									() => {
										if (i === l - 1) return;
										const donation = pinned.splice(i, 1)[0];
										pinned.splice(i + 1, 0, donation);
										activeDonations.value = [...pinned, ...unpinned];
									},
									false,
									'donation-button'
								);
								buttonDiv.appendChild(downButton);

								const readButton = makeButton(
									'',
									'#57A047',
									() => {
										donation.hide = true;
									},
									false,
									'donation-button'
								);
								addPathToButton(
									'M504 256c0 136.967-111.033 248-248 248S8 392.967 8 256 119.033 8 256 8s248 111.033 248 248zM227.314 387.314l184-184c6.248-6.248 6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.249-16.379-6.249-22.628 0L216 308.118l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627 22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.249 16.379 6.249 22.628.001z',
									readButton
								);
								buttonDiv.appendChild(readButton);
								const ignoreButton = makeButton(
									'',
									'#C6313F',
									() => {
										donation.hide = true;
									},
									false,
									'donation-button'
								);
								addPathToButton(
									'M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zM124 296c-6.6 0-12-5.4-12-12v-56c0-6.6 5.4-12 12-12h264c6.6 0 12 5.4 12 12v56c0 6.6-5.4 12-12 12H124z',
									ignoreButton
								);
								buttonDiv.appendChild(ignoreButton);
								const pinButton = makeButton(
									'',
									donation.pinned ? 'black' : '#6B6D6F',
									() => {
										donation.pinned = !donation.pinned;
										drawScreen();
									},
									false,
									'donation-button'
								);
								addPathToButton(
									'M256 8A 248,248 0 0,1 504,256A 248,248 0 0,1 256,504A 248,248 0 0,1 8,256A 248,248 0 0,1 256,8M 341.33333,261V 90.333333h 21.33334V 47.666666H 149.33333v 42.666667h 21.33334V 261L 128,303.66667v 42.66666H 238.93333V 455L 255,490 273.06667,455V 346.33333H 384v -42.66666Z',
									pinButton
								);
								buttonDiv.appendChild(pinButton);
								headerDiv.appendChild(buttonDiv);
								donationDiv.appendChild(headerDiv);
								const commentDiv = document.createElement('div');
								commentDiv.className = 'comment';
								if (donation.comment) {
									commentDiv.innerHTML = donation.comment;
								} else {
									commentDiv.innerHTML = '<i>No comment was provided</i>';
									commentDiv.style.color = 'gray';
									commentDiv.style.textAlign = 'center';
								}
								donationDiv.appendChild(commentDiv);
								donationDiv.classList.add('pinned');
								donationsDiv.appendChild(donationDiv);
							}
						}

						for (let i = 0, l = unpinned.length; i < l; i++) {
							const donation = unpinned[i];
							if (!donation.hide) {
								const donationDiv = document.createElement('div');
								donationDiv.className = 'donation';
								const headerDiv = document.createElement('div');
								headerDiv.className = 'donation-header';
								const metaDiv = document.createElement('div');
								metaDiv.className = 'metadiv';
								const amount = document.createElement('b');
								amount.innerHTML = `$${donation.amount.toFixed(2)} `;
								metaDiv.appendChild(amount);
								metaDiv.appendChild(document.createTextNode('from '));
								const donor = document.createElement('b');
								donor.innerHTML = donation.donor;
								metaDiv.appendChild(donor);
								headerDiv.appendChild(metaDiv);
								const buttonDiv = document.createElement('div');
								buttonDiv.style.display = 'flex';

								const upButton = makeButton(
									'⇧',
									i === 0 ? '#212427' : '#6B6D6F',
									() => {
										if (i === 0) return;
										const donation = unpinned.splice(i, 1)[0];
										unpinned.splice(i - 1, 0, donation);
										activeDonations.value = [...pinned, ...unpinned];
									},
									false,
									'donation-button'
								);
								buttonDiv.appendChild(upButton);

								const downButton = makeButton(
									'⇩',
									i === l - 1 ? '#212427' : '#6B6D6F',
									() => {
										if (i === l - 1) return;
										const donation = unpinned.splice(i, 1)[0];
										unpinned.splice(i + 1, 0, donation);
										activeDonations.value = [...pinned, ...unpinned];
									},
									false,
									'donation-button'
								);
								buttonDiv.appendChild(downButton);

								const readButton = makeButton(
									'',
									'#57A047',
									() => {
										donation.hide = true;
									},
									false,
									'donation-button'
								);
								addPathToButton(
									'M504 256c0 136.967-111.033 248-248 248S8 392.967 8 256 119.033 8 256 8s248 111.033 248 248zM227.314 387.314l184-184c6.248-6.248 6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.249-16.379-6.249-22.628 0L216 308.118l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627 22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.249 16.379 6.249 22.628.001z',
									readButton
								);
								buttonDiv.appendChild(readButton);
								const ignoreButton = makeButton(
									'',
									'#C6313F',
									() => {
										donation.hide = true;
									},
									false,
									'donation-button'
								);
								addPathToButton(
									'M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zM124 296c-6.6 0-12-5.4-12-12v-56c0-6.6 5.4-12 12-12h264c6.6 0 12 5.4 12 12v56c0 6.6-5.4 12-12 12H124z',
									ignoreButton
								);
								buttonDiv.appendChild(ignoreButton);
								const pinButton = makeButton(
									'',
									donation.pinned ? 'black' : '#6B6D6F',
									() => {
										donation.pinned = !donation.pinned;
										drawScreen();
									},
									false,
									'donation-button'
								);
								addPathToButton(
									'M256 8A 248,248 0 0,1 504,256A 248,248 0 0,1 256,504A 248,248 0 0,1 8,256A 248,248 0 0,1 256,8M 341.33333,261V 90.333333h 21.33334V 47.666666H 149.33333v 42.666667h 21.33334V 261L 128,303.66667v 42.66666H 238.93333V 455L 255,490 273.06667,455V 346.33333H 384v -42.66666Z',
									pinButton
								);
								buttonDiv.appendChild(pinButton);
								headerDiv.appendChild(buttonDiv);
								donationDiv.appendChild(headerDiv);
								const commentDiv = document.createElement('div');
								commentDiv.className = 'comment';
								if (donation.comment) {
									commentDiv.innerHTML = donation.comment;
								} else {
									commentDiv.innerHTML = '<i>No comment was provided</i>';
									commentDiv.style.color = 'gray';
									commentDiv.style.textAlign = 'center';
								}
								donationDiv.appendChild(commentDiv);
								donationsDiv.appendChild(donationDiv);
							}
						}
					} /* else {
            const noDonos = document.createElement('div');
            noDonos.innerHTML =
              '<i>There are no donations for this segment</i>';
            noDonos.style.color = 'gray';
            noDonos.style.textAlign = 'center';
            noDonos.style.margin = '1em';
            donationsDiv.appendChild(noDonos);
          } */
			})
			.catch((err) => {
				nodecg.log.error(err);
			});
	} else if (auditionSegment === null) {
		instructionsDiv.innerHTML =
			'Your audition is now complete! Thank you for auditioning as a host for this event. You will hear back on your results via email in mid to late December. <br /><b>Please close this window now.</b>';

		nodecg
			.sendMessage('preloadVideo', auditionSegments.value![0].filename)
			.catch((err) => {
				nodecg.log.error(err);
			});
	} else {
		instructionsDiv.innerHTML =
			'There has been an error. Please contact a staff member for assistance. <br /><b>Please close this window now.</b>';
	}
}

function addPathToButton(path: string, button: HTMLDivElement) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('viewBox', '0 0 512 512');
	svg.innerHTML = `<path fill="currentColor" d="${path}"></path>`;
	svg.classList.add('svg-icon');
	const buttonDiv = button.children[0] as HTMLDivElement;
	buttonDiv.appendChild(svg);
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
	button.style.backgroundColor = color;
	color = button.style.backgroundColor;
	if (disabled) button.style.backgroundColor = 'gray';
	buttonContainer.onclick = () => {
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
	if (auditionSegment === -1 && !obsRecording) {
		nodecg.sendMessage('obsRecord', participantName).catch((err) => {
			nodecg.log.error(err);
		});
		return;
	}
	if (auditionSegment !== null && auditionSegment !== 'alert')
		auditionSegment++;
	if (auditionSegment && auditionSegment !== 'alert') {
		nodecg
			.sendMessage('obsIsRecording')
			.then((val) => {
				if (!val) {
					auditionSegment = 'alert';
					drawScreen();
					nodecg.log.error('OBS is not recording, mid-audition!');
				}
			})
			.catch((err) => {
				auditionSegment = 'alert';
				drawScreen();
				nodecg.log.error(err);
			});
	}
	NodeCG.waitForReplicants(auditionSegments, activeDonations)
		.then(() => {
			if (
				auditionSegments.value &&
				auditionSegment !== null &&
				auditionSegment !== 'alert' &&
				auditionSegment >= auditionSegments.value.length
			) {
				auditionSegment = null;
			}
			//if (auditionSegment === 0) nodecg.sendMessage('obsRecord');
			if (auditionSegment === null)
				nodecg.sendMessage('obsStopRecord').catch((err) => {
					nodecg.log.error(err);
				});
			const segment =
				auditionSegments.value &&
				auditionSegment !== null &&
				auditionSegment !== 'alert'
					? auditionSegments.value[auditionSegment]
					: null;
			if (segment) {
				/* for (let i = 0; i < segment.donations.length; i++)
          segment.donations[i].hide = false; */
				activeDonations.value = [
					...activeDonations.value!.filter(
						(donation) => donation.persist ?? true
					),
					...(JSON.parse(JSON.stringify(segment.donations)) as Donation[]).map(
						(donation) => ({ ...donation, persist: segment.retain ?? true })
					),
				];
			}
			drawScreen();
			if (auditionSegment !== null && auditionSegment !== 'alert') {
				nodecg
					.sendMessage(
						'playFile',
						auditionSegments.value![auditionSegment].filename
					)
					.catch((err) => {
						nodecg.log.error(err);
					});
				if (auditionSegment <= auditionSegments.value!.length - 2) {
					nodecg
						.sendMessage(
							'preloadVideo',
							auditionSegments.value![auditionSegment + 1].filename
						)
						.catch((err) => {
							nodecg.log.error(err);
						});
				}
			}
		})
		.catch((err) => {
			nodecg.log.error(err);
		});
}

nodecg.listenFor('recordingStarted', () => {
	obsRecording = true;
	startNextSegment();
});
