/// <reference path="../../../../types/browser.d.ts" />

/* const controlButtons2 = nodecg.Replicant<controlButton[]>('control_buttons');

controlButtons2.on('change', (newVal) => {
	const body = document.body;
	body.innerHTML = '';
	for (let i = 0; i < newVal.length; i++) {
		const button = document.createElement('button');
		button.innerHTML = newVal[i].buttonName ? newVal[i].buttonName : '&nbsp';
		button.onclick = () => {
			nodecg.sendMessage('playFile', newVal[i].filename);
		};
		body.appendChild(button);
	}
});
 */