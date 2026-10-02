/// <reference path="../../../../types/browser.d.ts" />

const restart_nodecg = document.getElementById('restart-nodecg') as HTMLInputElement;

restart_nodecg.addEventListener('click', () => {
	console.log('Attempting to restart NodeCG instance.');

	// Promise acknowledgement
	nodecg.sendMessage('restartPM2')
		.then(result => {
			console.log(result); // 
		}).catch(error => {
			console.error(error);
		});
}
);