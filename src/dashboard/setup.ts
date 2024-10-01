/// <reference path="../../../../types/browser.d.ts" />

import { parse } from '@cipscis/csv';

const videos = nodecg.Replicant<{ base: string }[]>('assets:videos');
const auditionSegments =
	nodecg.Replicant<AuditionSegment[]>('audition_segments');
const obsIp = nodecg.Replicant<string>('obs_ip');
const obsPassword = nodecg.Replicant<string>('obs_password');
const obsPort = nodecg.Replicant<string>('obs_port');

videos.on('change', console.log);

const obsAddressInput = document.getElementById(
	'obs-address'
) as HTMLInputElement;
const obsPortInput = document.getElementById('obs-port') as HTMLInputElement;
const obsPasswordInput = document.getElementById(
	'obs-password'
) as HTMLInputElement;
const instructionsModal = document.getElementById(
	'instructions-modal'
) as HTMLDivElement;
const instructionsDiv = document.getElementById(
	'instructions'
) as HTMLDivElement;
const donationsModal = document.getElementById(
	'donations-modal'
) as HTMLDivElement;
const donationsDiv = document.getElementById('donations') as HTMLDivElement;
const csvInput = document.getElementById('csv-input') as HTMLInputElement;

let instructionsSave: ((str: string) => void) | null = null;

instructionsModal.onclick = () => {
	if (instructionsSave) instructionsSave(instructionsDiv.innerHTML);
	instructionsSave = null;
	instructionsModal.style.display = 'none';
};
instructionsDiv.onclick = (e) => {
	e.stopPropagation();
};
instructionsDiv.onkeydown = (e) => {
	if (e.key === 'Enter') e.preventDefault();
};
instructionsDiv.onkeyup = (e) => {
	switch (e.key) {
		case 'Enter':
			if (instructionsSave) instructionsSave(instructionsDiv.innerHTML);
			instructionsSave = null;
			instructionsModal.style.display = 'none';
			break;
		case 'Escape':
			instructionsSave = null;
			instructionsModal.style.display = 'none';
			break;
	}
};

donationsModal.onclick = () => {
	donationsModal.style.display = 'none';
	donationsSegment = null;
};
(donationsModal.children[0] as HTMLDivElement).onclick = (e) => {
	e.stopPropagation();
};

type DonationData = [string, string, string][];

function isDonationData(data: any[][]): data is DonationData {
	return data.every((row) => {
		try {
			if (row.length !== 3) return false;

			const amount = parseFloat(row[0]);
			if (isNaN(amount)) return false;

			return true;
		} catch {
			return false;
		}
	});
}

csvInput.addEventListener('change', async () => {
	if (!csvInput.files) return;
	const string = await csvInput.files[0].text();
	const donations = parse(string);

	if (!isDonationData(donations)) {
		alert('CSV does not contain valid donation data.');
		return;
	}

	const segments = JSON.parse(
		JSON.stringify(auditionSegments.value)
	) as AuditionSegment[];

	if (donationsSegment === null || !segments[donationsSegment]) {
		console.error('unknown audition segment');
		return;
	}

	segments[donationsSegment].donations = donations.map((donation) => {
		return {
			amount: parseFloat(donation[0]),
			donor: donation[1],
			comment: donation[2],
		};
	});

	auditionSegments.value = segments;

	// eslint-disable-next-line
	csvInput.value = '';
});

let donationsSegment: number | null = null;

function openDonationsEdit() {
	NodeCG.waitForReplicants(auditionSegments)
		.then(() => {
			const segments = JSON.parse(
				JSON.stringify(auditionSegments.value)
			) as AuditionSegment[];
			if (donationsSegment === null || !segments[donationsSegment]) {
				console.error('unknown audition segment');
				return;
			}
			const i = donationsSegment;
			(document.getElementById('add-donation') as HTMLButtonElement).onclick =
				() => {
					segments[i].donations.push({ amount: 0, donor: '', comment: '' });
					auditionSegments.value = segments;
				};
			donationsModal.style.display = 'block';
			document.body.onkeyup = (e) => {
				if (e.key === 'Escape') {
					console.log('dddd');
					donationsModal.style.display = 'none';
					donationsSegment = null;
				}
			};
			const donations = segments[i].donations;
			donationsDiv.innerHTML = '';
			for (let j = 0; j < donations.length; j++) {
				const donationDiv = document.createElement('div');
				const metaDiv = document.createElement('div');
				metaDiv.className = 'segment-flex';
				const amount = document.createElement('input');
				amount.value = donations[j].amount.toFixed(2);
				amount.onfocus = amount.select;
				amount.onkeyup = (e) => {
					switch (e.key) {
						case 'Enter': {
							const newVal = parseFloat(amount.value);
							if (isNaN(newVal)) {
								amount.value = donations[j].amount.toFixed(2);
								amount.blur();
							} else {
								donations[j].amount = Math.round(newVal * 100) / 100;
								auditionSegments.value = segments;
							}
							break;
						}
						case 'Escape':
							if (document.activeElement === amount) {
								console.log('yoa');
								e.stopPropagation();
								amount.value = donations[j].amount.toFixed(2);
								amount.blur();
							}
							break;
					}
				};
				metaDiv.appendChild(amount);
				const donor = document.createElement('input');
				donor.value = donations[j].donor;
				donor.onfocus = donor.select;
				donor.onkeyup = (e) => {
					switch (e.key) {
						case 'Enter':
							donations[j].donor = donor.value;
							auditionSegments.value = segments;
							break;
						case 'Escape':
							if (document.activeElement === donor) {
								console.log('yod');
								e.stopPropagation();
								donor.value = donations[j].donor;
								donor.blur();
							}
							break;
					}
				};
				metaDiv.appendChild(donor);
				const deleteButton = document.createElement('button');
				deleteButton.innerHTML = 'Delete Donation';
				deleteButton.onclick = () => {
					donations.splice(j, 1);
					auditionSegments.value = segments;
				};
				metaDiv.appendChild(deleteButton);
				donationDiv.appendChild(metaDiv);
				const comment = document.createElement('div');
				comment.innerHTML = donations[j].comment
					? donations[j].comment
					: '&nbsp';
				comment.style.border = '1px black solid';
				comment.style.padding = '.2em';
				comment.contentEditable = 'true';
				comment.onfocus = () => {
					window.getSelection()?.selectAllChildren(comment);
				};
				comment.onkeydown = (e) => {
					if (e.key === 'Enter') e.preventDefault();
				};
				comment.onkeyup = (e) => {
					switch (e.key) {
						case 'Enter':
							donations[j].comment = comment.innerHTML;
							auditionSegments.value = segments;
							break;
						case 'Escape':
							if (document.activeElement === comment) {
								console.log('yoc');
								e.stopPropagation();
								comment.innerHTML = donations[j].comment;
								comment.blur();
							}
							break;
					}
				};
				donationDiv.appendChild(comment);
				donationsDiv.appendChild(donationDiv);
			}
		})
		.catch((err) => {
			nodecg.log.error(err);
		});
}

obsIp.on('change', (newVal) => {
	obsAddressInput.value = newVal;
});

obsPort.on('change', (newVal) => {
	obsPortInput.value = newVal;
});

(document.getElementById('reset-obs') as HTMLButtonElement).onclick = () => {
	nodecg.sendMessage('resetObs').catch((err) => {
		nodecg.log.error(err);
	});
};

(document.getElementById('add') as HTMLButtonElement).onclick = () => {
	NodeCG.waitForReplicants(auditionSegments)
		.then(() => {
			if (auditionSegments.value) {
				auditionSegments.value.push({
					filename: '',
					donations: [],
					instructions: '',
				});
			} else
				auditionSegments.value = [
					{ filename: '', donations: [], instructions: '' },
				];
		})
		.catch((err) => {
			nodecg.log.error(err);
		});
};

auditionSegments.on('change', () => {
	if (donationsSegment !== null) openDonationsEdit();
	drawSegments();
});

obsAddressInput.onkeyup = (e) => {
	switch (e.key) {
		case 'Enter':
			obsIp.value = obsAddressInput.value;
			obsAddressInput.blur();
			break;
		case 'Escape':
			NodeCG.waitForReplicants(obsIp)
				.then(() => {
					obsAddressInput.value = obsIp.value ? obsIp.value : '';
					obsAddressInput.blur();
				})
				.catch((err) => {
					nodecg.log.error(err);
				});
			break;
	}
};

obsPortInput.onkeyup = (e) => {
	switch (e.key) {
		case 'Enter':
			if (obsPortInput.value === parseInt(obsPortInput.value).toString()) {
				obsPort.value = obsPortInput.value;
				obsPortInput.blur();
			} else {
				NodeCG.waitForReplicants(obsPort)
					.then(() => {
						obsPortInput.value = obsPort.value ? obsPort.value : '';
						obsPortInput.blur();
					})
					.catch((err) => {
						nodecg.log.error(err);
					});
			}
			break;
		case 'Escape':
			NodeCG.waitForReplicants(obsPort)
				.then(() => {
					obsPortInput.value = obsPort.value ? obsPort.value : '';
					obsPortInput.blur();
				})
				.catch((err) => {
					nodecg.log.error(err);
				});
			break;
	}
};

obsPasswordInput.onkeyup = (e) => {
	switch (e.key) {
		case 'Enter':
			obsPassword.value = obsPasswordInput.value;
			obsPasswordInput.value = '';
			obsPasswordInput.blur();
			break;
		case 'Escape':
			obsPasswordInput.value = '';
			obsPasswordInput.blur();
			break;
	}
};

videos.on('change', () => {
	drawSegments();
});

function drawSegments() {
	NodeCG.waitForReplicants(auditionSegments, videos)
		.then(() => {
			const mainDiv = document.getElementById('segments') as HTMLDivElement;
			if (!auditionSegments.value) {
				mainDiv.innerHTML = '';
				return;
			}
			if (mainDiv.children.length !== auditionSegments.value.length) {
				mainDiv.innerHTML = '';
				console.log('redrawing segments div');
			} else console.log('updating segments div');
			const segments = JSON.parse(
				JSON.stringify(auditionSegments.value)
			) as AuditionSegment[];
			const clips = videos.value ? videos.value.map((x) => x.base) : [];
			if (!segments || !clips) return;
			for (let i = 0; i < segments.length; i++) {
				const segmentDiv = mainDiv.children[i]
					? mainDiv.children[i]
					: document.createElement('div');

				let e = 0;
				const titleDiv = segmentDiv.children[e]
					? (segmentDiv.children[e] as HTMLDivElement)
					: document.createElement('div');
				titleDiv.innerHTML = `Segment ${i + 1} `;
				if (!segmentDiv.children[e]) {
					titleDiv.style.textAlign = 'center';
					titleDiv.style.fontWeight = 'bold';
					segmentDiv.appendChild(titleDiv);
				}

				e++;
				const fileDeleteDiv = segmentDiv.children[e]
					? (segmentDiv.children[e] as HTMLDivElement)
					: document.createElement('div');
				{
					let e = 0;
					const filename = fileDeleteDiv.children[e]
						? (fileDeleteDiv.children[e] as HTMLSelectElement)
						: document.createElement('select');
					filename.innerHTML = '';
					for (let j = 0; j <= clips.length; j++) {
						const clipfile = document.createElement('option');
						clipfile.innerHTML = clips[j] ? clips[j] : '';
						clipfile.value = clips[j] ? clips[j] : '';
						filename.appendChild(clipfile);
					}
					const originalFilename = segments[i].filename;
					filename.value = originalFilename;
					filename.oninput = () => {
						segments[i].filename = filename.value;
						auditionSegments.value = segments;
					};
					if (!fileDeleteDiv.children[e]) {
						fileDeleteDiv.className = 'segment-flex';
						fileDeleteDiv.appendChild(filename);
					}

					e++;
					const deleteButton = fileDeleteDiv.children[e]
						? (fileDeleteDiv.children[e] as HTMLButtonElement)
						: document.createElement('button');
					deleteButton.innerHTML = 'Delete Segment';
					deleteButton.onclick = () => {
						if (confirm('Really delete this segment?')) segments.splice(i, 1);
						auditionSegments.value = segments;
					};
					if (!fileDeleteDiv.children[e])
						fileDeleteDiv.appendChild(deleteButton);
				}
				if (!segmentDiv.children[e]) segmentDiv.appendChild(fileDeleteDiv);

				e++;
				const instructionsLabel = segmentDiv.children[e]
					? (segmentDiv.children[e] as HTMLDivElement)
					: document.createElement('div');
				instructionsLabel.innerHTML = 'Instructions:';
				if (!segmentDiv.children[e]) {
					segmentDiv.appendChild(instructionsLabel);
				}

				e++;
				const instructions = segmentDiv.children[e]
					? (segmentDiv.children[e] as HTMLDivElement)
					: document.createElement('div');
				instructions.innerHTML = segments[i].instructions
					? segments[i].instructions
					: '&nbsp';
				instructions.onclick = () => {
					instructionsDiv.innerHTML = segments[i].instructions;
					instructionsSave = (text) => {
						segments[i].instructions = text;
						auditionSegments.value = segments;
					};
					instructionsModal.style.display = 'block';
					instructionsDiv.focus();
				};
				if (!segmentDiv.children[e]) {
					instructions.style.border = '1px solid black';
					instructions.style.marginBottom = '1em';
					instructions.style.padding = '.2em';
					segmentDiv.appendChild(instructions);
				}

				e++;
				const donations = segmentDiv.children[e]
					? (segmentDiv.children[e] as HTMLDivElement)
					: document.createElement('div');
				donations.innerHTML = `${segments[i].donations.length} Donations`;
				const editDonations = document.createElement('button');
				editDonations.innerHTML = 'Edit Donations';
				editDonations.onclick = () => {
					donationsSegment = i;
					openDonationsEdit();
				};
				donations.appendChild(editDonations);
				if (!segmentDiv.children[e]) {
					donations.className = 'segment-flex';
					segmentDiv.appendChild(donations);
				}

				if (!mainDiv.children[i]) {
					segmentDiv.className = 'segment';
					mainDiv.appendChild(segmentDiv);
				}
			}
		})
		.catch((err) => {
			nodecg.log.error(err);
		});
}
