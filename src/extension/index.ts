import { NodeCG } from '../../../../types/server';
import * as nodecgApiContext from './nodecg-api-context';
import Hyperdeck, { ClipInfo } from './hyperdeck';
import OBSWebSocket from 'obs-websocket-js';

module.exports = function (nodecg: NodeCG) {
	nodecgApiContext.set(nodecg);
	require('./othermodule');

	const hyperdeckIp = nodecg.Replicant<string>('hyperdeck_ip', {
		defaultValue: '',
	});
	const hyperdeckClips = nodecg.Replicant<ClipInfo[]>('hyperdeck_clips', {
		defaultValue: [],
	});
	const auditionSegments = nodecg.Replicant<AuditionSegment[]>(
		'audition_segments',
		{
			defaultValue: [],
		}
	);
	const obsIp = nodecg.Replicant<string>('obs_ip', {
		defaultValue: '',
	});
	const obsPassword = nodecg.Replicant<string>('obs_password', {
		defaultValue: '',
	});
	const obsPort = nodecg.Replicant<string>('obs_port', {
		defaultValue: '4455',
	});

	let hyperdeck: Hyperdeck | null = null;

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
		obsConnected = false;
		if (obsConnecting) return;
		obsConnecting = true;
		//console.log('obs disconnect');
		obs
			.disconnect()
			.then(() => {
				if (obsIp.value) {
					nodecg.log.info('OBS connected');
					obs
						.connect(`ws://${obsIp.value}:${obsPort.value}`, obsPassword.value)
						.then(() => {
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

	nodecg.listenFor('resetHyperdeck', () => {
		nodecg.log.info('Resetting HyperDeck connection');
		connectHyperdeck();
	});

	nodecg.listenFor('resetObs', () => {
		nodecg.log.info('Resetting OBS connection');
		obsRenew();
	});

	nodecg.listenFor('obsRecord', () => {
		if (obsConnected) {
			obs
				.call('StartRecord')
				.then(() => {
					nodecg.log.info('OBS recording started');
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
				.then(() => {
					nodecg.log.info('OBS recording stopped');
				})
				.catch((err) => {
					nodecg.log.error(err);
				});
		} else nodecg.log.error(`Can't stop recording: OBS not connected`);
	});

	hyperdeckIp.on('change', (newVal) => {
		connectHyperdeck();
	});

	nodecg.listenFor('playFile', (filename) => {
		nodecg.log.info(
			`Attempting to play HyperDeck clip with filename "${filename}"`
		);
		if (!hyperdeck) {
			nodecg.log.error(
				`Cannot play file "${filename}". HyperDeck not connected`
			);
			return;
		}
		const index = hyperdeck.clips.map((x) => x.filename).indexOf(filename);
		if (index < 0) {
			nodecg.log.error(`Cannot play file "${filename}". File not on HyperDeck`);
			return;
		}
		hyperdeck.stop().then(() => {
			nodecg.log.info(`Starting HyperDeck clip with filename "${filename}"`);
			if (hyperdeck)
				hyperdeck.play({
					number: hyperdeck.clips[index].index,
					slotId: hyperdeck.clips[index].slotId,
				});
		});
	});

	function connectHyperdeck() {
		if (hyperdeck) hyperdeck.end();
		if (hyperdeckIp.value) {
			const ip = hyperdeckIp.value;
			hyperdeck = new Hyperdeck(ip);
			hyperdeck.on('error', (err) => {
				nodecg.log.error(err);
			});
			hyperdeck.on('info', (info) => {
				nodecg.log.info(info);
			});
			hyperdeck.on('clips', (clips) => {
				nodecg.log.info('HyperDeck clips updated');
				hyperdeckClips.value = clips;
			});
			/* hyperdeck.on('transport', (status) => {
				switch (status) {
					case 'play':
						if (obsConnected) {
							obs
								.call('StartRecord')
								.then(() => {
									nodecg.log.info('OBS recording started');
								})
								.catch((err) => {
									nodecg.log.error(err);
								});
						} else nodecg.log.error(`Can't start recording: OBS not connected`);
						break;
					case 'stopped':
						if (obsConnected) {
							nodecg.sendMessage('videoStopped');
							obs
								.call('StopRecord')
								.then(() => {
									nodecg.log.info('OBS recording stopped');
								})
								.catch((err) => {
									nodecg.log.error(err);
								});
						} else nodecg.log.error(`Can't stop recording: OBS not connected`);
						break;
				}
			}); */
			hyperdeck.once('connected', () => {
				nodecg.log.info('HyperDeck at ' + ip + ' connected');
				if (hyperdeck) hyperdeckClips.value = hyperdeck.clips;
			});
		}
	}
};
