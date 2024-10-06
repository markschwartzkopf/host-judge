import { NodeCG } from '../../../../types/server';
import * as nodecgApiContext from './nodecg-api-context';
import OBSWebSocket from 'obs-websocket-js';

const format = new Intl.DateTimeFormat('en-US', {
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour12: true,
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
});

module.exports = function (nodecg: NodeCG) {
	nodecgApiContext.set(nodecg);
	require('./othermodule');

	const loggedRecordings = nodecg.Replicant<
		{
			name: string;
			startTime: string;
			endTime: string;
			fileName: string;
		}[]
	>('recordings', {
		defaultValue: [],
		persistent: true,
	});

	const obsIp = nodecg.Replicant<string>('obs_ip', {
		defaultValue: '',
	});
	const obsPassword = nodecg.Replicant<string>('obs_password', {
		defaultValue: '',
	});
	const obsPort = nodecg.Replicant<string>('obs_port', {
		defaultValue: '4455',
	});

	let obsConnecting = false;
	let obsConnected = false;
	const obs = new OBSWebSocket();

	obs.on('ConnectionClosed', () => {
		obsConnected = false;
	});
	obs.on('ConnectionOpened', () => {
		obsConnected = true;
	});

	obsIp.on('change', () => {
		obsRenew();
	});

	obsPort.on('change', () => {
		obsRenew();
	});

	obsPassword.on('change', () => {
		obsRenew();
	});

	function obsRenew() {
		if (nodecg.bundleConfig.noObs) return;
		obsConnected = false;
		if (obsConnecting) return;
		obsConnecting = true;
		//console.log('obs disconnect');
		obs
			.disconnect()
			.then(() => {
				if (obsIp.value) {
					nodecg.log.info('OBS connecting');
					obs
						.connect(`ws://${obsIp.value}:${obsPort.value}`, obsPassword.value)
						.then(() => {
							nodecg.log.info('Connected to OBS');
							obsConnecting = false;
						})
						.catch((err) => {
							nodecg.log.error(err);
							obsConnecting = false;
						});
					//
				}
			})
			.catch((err) => {
				nodecg.log.error(err);
				obsConnecting = false;
			});
	}

	nodecg.listenFor('resetObs', () => {
		nodecg.log.info('Resetting OBS connection');
		obsRenew();
	});

	let participant: string;
	let startTime: string;

	nodecg.listenFor('obsRecord', (name) => {
		participant = name;
		startTime = format.format(new Date()).replace(', ', ' ');

		if (nodecg.bundleConfig.noObs) {
			nodecg.sendMessage('recordingStarted');
			return;
		}
		if (obsConnected) {
			obs
				.call('StopRecord')
				.then(() => {
					nodecg.log.error(
						'Interrupting current recording to start new recording'
					);
					return delay(500);
				})
				.catch(() => {
					//This SHOULD throw an error unless 'StopRecord' is needed, which is rare
				})
				.finally(() => {
					return obs.call('StartRecord');
				})
				.then(() => {
					nodecg.log.info('OBS recording started');
					nodecg.sendMessage('recordingStarted');
				})
				.catch((err) => {
					nodecg.log.error(err);
				});
		} else nodecg.log.error(`Can't start recording: OBS not connected`);
	});

	nodecg.listenFor('obsStopRecord', () => {
		if (obsConnected) {
			nodecg.sendMessage('videoStopped');
			obs
				.call('StopRecord')
				.then((output) => {
					loggedRecordings.value.push({
						name: participant,
						startTime: startTime,
						endTime: format.format(new Date()).replace(', ', ' '),
						fileName: output.outputPath,
					});
					nodecg.log.info('OBS recording stopped');
				})
				.catch((err) => {
					nodecg.log.error(err);
				});
		} else nodecg.log.error(`Can't stop recording: OBS not connected`);
	});

	nodecg.listenFor('obsIsRecording', (val, ack) => {
		if (obsConnected) {
			obs
				.call('GetRecordStatus')
				.then((status) => {
					if (ack && !ack.handled) {
						ack(null, status.outputActive);
					}
				})
				.catch((err) => {
					if (ack && !ack.handled) {
						ack(err);
					}
					nodecg.log.error(err);
				});
		} else nodecg.log.error(`Can't get recording status: OBS not connected`);
	});
};

function delay(ms: number): Promise<void> {
	return new Promise((res) => {
		setTimeout(() => {
			res();
		}, ms);
	});
}
