/// <reference path="../../../../types/browser.d.ts" />
type ClipInfo = {
	filename: string;
	length: number;
	startTime: string;
	index: number;
	slotId: '1' | '2' | '3';
};

const hyperdeckIp = nodecg.Replicant<string>('hyperdeck_ip');
const hyperdeckClips = nodecg.Replicant<ClipInfo[]>('hyperdeck_clips');
const controlButtons = nodecg.Replicant<controlButton[]>('control_buttons');
const obsIp = nodecg.Replicant<string>('obs_ip');
const obsPassword = nodecg.Replicant<string>('obs_password');
const obsPort = nodecg.Replicant<string>('obs_port');

const hyperdeckAddressInput = document.getElementById(
	'hyperdeck-address'
) as HTMLInputElement;
const obsAddressInput = document.getElementById(
	'obs-address'
) as HTMLInputElement;
const obsPortInput = document.getElementById('obs-port') as HTMLInputElement;
const obsPasswordInput = document.getElementById(
	'obs-password'
) as HTMLInputElement;

obsIp.on('change', (newVal) => {
	obsAddressInput.value = newVal;
});

obsPort.on('change', (newVal) => {
	obsPortInput.value = newVal;
});

(document.getElementById('reset-obs') as HTMLButtonElement).onclick = () => {
	nodecg.sendMessage('resetObs');
};

(document.getElementById('reset-hyperdeck') as HTMLButtonElement).onclick =
	() => {
		nodecg.sendMessage('resetHyperdeck');
	};

(document.getElementById('add') as HTMLButtonElement).onclick = () => {
	NodeCG.waitForReplicants(controlButtons).then(() => {
		if (controlButtons.value)
			controlButtons.value.push({ filename: '', buttonName: '' });
	});
};

controlButtons.on('change', (newVal) => {
	drawButtons();
});

hyperdeckIp.on('change', (newVal) => {
	hyperdeckAddressInput.value = newVal;
});

hyperdeckAddressInput.onkeyup = (e) => {
	switch (e.key) {
		case 'Enter':
			hyperdeckIp.value = hyperdeckAddressInput.value;
			hyperdeckAddressInput.blur();
			break;
		case 'Escape':
			NodeCG.waitForReplicants(hyperdeckIp).then(() => {
				hyperdeckAddressInput.value = hyperdeckIp.value
					? hyperdeckIp.value
					: '';
				hyperdeckAddressInput.blur();
			});
			break;
	}
};

obsAddressInput.onkeyup = (e) => {
	switch (e.key) {
		case 'Enter':
			obsIp.value = obsAddressInput.value;
			obsAddressInput.blur();
			break;
		case 'Escape':
			NodeCG.waitForReplicants(obsIp).then(() => {
				obsAddressInput.value = obsIp.value ? obsIp.value : '';
				obsAddressInput.blur();
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
				NodeCG.waitForReplicants(obsPort).then(() => {
					obsPortInput.value = obsPort.value ? obsPort.value : '';
					obsPortInput.blur();
				});
			}
			break;
		case 'Escape':
			NodeCG.waitForReplicants(obsPort).then(() => {
				obsPortInput.value = obsPort.value ? obsPort.value : '';
				obsPortInput.blur();
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

hyperdeckClips.on('change', (newVal) => {
	drawButtons();
});

function drawButtons() {
	NodeCG.waitForReplicants(controlButtons, hyperdeckClips).then(() => {
		const mainDiv = document.getElementById(
			'control-buttons'
		) as HTMLDivElement;
		mainDiv.innerHTML = '';
		const buttons = controlButtons.value;
		const clips = hyperdeckClips.value
			? hyperdeckClips.value.map((x) => x.filename)
			: null;
		if (!buttons || !clips) return;
		let textDiv = document.createElement('div');
		textDiv.style.textAlign = 'center';
		textDiv.innerHTML = 'Filename';
		mainDiv.appendChild(textDiv);
		textDiv = document.createElement('div');
		textDiv.style.textAlign = 'center';
		textDiv.innerHTML = 'Button Label';
		mainDiv.appendChild(textDiv);
		textDiv = document.createElement('div');
		textDiv.style.textAlign = 'center';
		mainDiv.appendChild(textDiv);
		for (let i = 0; i < buttons.length; i++) {
			const filename = document.createElement('select');
			for (let j = 0; j <= clips.length; j++) {
				const clipfile = document.createElement('option');
				clipfile.innerHTML = clips[j] ? clips[j] : '';
				clipfile.value = clips[j] ? clips[j] : '';
				filename.appendChild(clipfile);
			}
			const originalFilename = buttons[i].filename;
			filename.value = originalFilename;
			mainDiv.appendChild(filename);

			const buttonName = document.createElement('input');
			const originalButtonName = buttons[i].buttonName;
			buttonName.value = originalButtonName;
			buttonName.onkeyup = (e) => {
				switch (e.key) {
					case 'Enter':
						buttons[i].buttonName = buttonName.value;
						controlButtons.value = buttons;
						break;
					case 'Escape':
						buttonName.value = originalButtonName;
						buttonName.blur();
						break;
				}
			};
			mainDiv.appendChild(buttonName);

			const deleteButton = document.createElement('button');
			deleteButton.innerHTML = 'Delete Button';
			deleteButton.onclick = () => {
				buttons.splice(i, 1);
				controlButtons.value = buttons;
			};
			mainDiv.appendChild(deleteButton);

			filename.oninput = () => {
				if (!originalFilename && !originalButtonName)
					buttons[i].buttonName = filename.value;
				buttons[i].filename = filename.value;
				controlButtons.value = buttons;
			};
		}
	});
}
