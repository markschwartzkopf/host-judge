import { EventEmitter } from 'events';
import * as net from 'net';

type HyperDeckInfo = string | { name: string; info: { [k: string]: string } };

type SlotId = '1' | '2' | '3';
export type ClipInfo = {
	filename: string;
	length: number;
	startTime: string;
	index: number;
	slotId: SlotId;
};
type Cmd = { string: string; ack: string[] };
type BufferCmd = Cmd & {
	res: (info: HyperDeckInfo) => void;
	rej: (err: Error) => void;
};

const hyperdeckErrors: { [k: string]: string } = {
	'100': 'syntax error',
	'101': 'unsupported parameter',
	'102': 'invalid value',
	'103': 'unsupported',
	'104': 'disk full',
	'105': 'no disk',
	'106': 'disk error',
	'107': 'timeline empty',
	'108': 'internal error',
	'109': 'out of range',
	'110': 'no input',
	'111': 'remote control disabled',
	'120': 'connection rejected',
	'150': 'invalid state',
	'151': 'invalid codec',
	'160': 'invalid format',
	'161': 'invalid token',
	'162': 'format not prepared',
};

interface HyperdeckEvents {
	error: (err: Error) => void;
	closed: () => void;
	info: (info: string) => void;
	connected: () => void;
	clips: (clips: ClipInfo[]) => void;
	transport: (status: string) => void;
}

interface InternalEvents {
	ack: (ack: { code: string; info: HyperDeckInfo }) => void;
	closed: () => void;
}

interface EE extends EventEmitter {
	on<U extends keyof InternalEvents>(event: U, listener: InternalEvents[U]): this;
	off<U extends keyof InternalEvents>(event: U, listener: InternalEvents[U]): this;
	emit<U extends keyof InternalEvents>(event: U, ...args: Parameters<InternalEvents[U]>): boolean;
}

interface Hyperdeck {
	on<U extends keyof HyperdeckEvents>(event: U, listener: HyperdeckEvents[U]): this;
	emit<U extends keyof HyperdeckEvents>(event: U, ...args: Parameters<HyperdeckEvents[U]>): boolean;
}

class Hyperdeck extends EventEmitter {
	private _socket: net.Socket;
	private readonly _ip: string;
	private _connectionState: 'closed' | 'connecting' | 'connected' | 'initializing' = 'initializing';
	private _ee: EE;
	private _hardwareInfo: { [k: string]: string } = {};
	private _cmdBuffer: BufferCmd[] = [];
	private _inCmd = false;
	private _clips: { '1': ClipInfo[]; '2': ClipInfo[]; '3': ClipInfo[] } = { '1': [], '2': [], '3': [] };
	private _lastSlotStatus: { '1': '' | 'mounted'; '2': '' | 'mounted'; '3': '' | 'mounted' } = {
		'1': '',
		'2': '',
		'3': '',
	};

	private _transportStatus = '';
	constructor(address: string) {
		super();
		this._ip = address;
		this._socket = new net.Socket();
		this._socketInit();
		this._socketConnect();
		this._ee = new EventEmitter();
	}

	private _socketInit() {
		if (this._socket) {
			this._socket.on('close', () => {
				if (this._connectionState != 'closed') {
					this._connectionState = 'closed';
					/* setTimeout(() => {
            this._socket = new net.Socket();
            this._socketInit();
            this._socketConnect();
          }, 1000); */
				} else this._ee.emit('closed');
			});
			this._socket.on('error', (err) => {
				this.emit('error', err);
			});
			this._socket.on('data', (buf) => {
				//console.log('DATA: "' + buf.toString() + '"');
				this._processData(buf.toString());
			});
			this._connectionState = 'connecting';
		} else this.emit('error', new Error('Cannot init non-existent HyperDeck socket'));
	}

	private _socketConnect() {
		if (this._socket) {
			this._connectionState = 'connecting';
			this._socket.connect(9993, this._ip, () => {
				this._processCmd({
					string: 'notify: slot: true transport: true\n',
					ack: ['200'],
				})
					.then(() => {
						return this._getSlotInfo();
					})
					.then((status) => {
						this._lastSlotStatus = status;
						this._getClips('1')
							.then((clips) => {
								this._clips['1'] = clips;
							})
							.catch((err) => {});
						this._getClips('2')
							.then((clips) => {
								this._clips['2'] = clips;
							})
							.catch((err) => {});
						return this._getClips('3');
					})
					.then((clips) => {
						this._clips['2'] = clips;
						this._connectionState = 'connected';
						this.emit('connected');
					})
					.catch(() => {
						this._connectionState = 'connected';
						this.emit('connected');
					});
			});
		} else {
			this.emit('error', new Error('Cannot init non-existent HyperDeck socket'));
		}
	}

	private _processData(data: string) {
		const prefix = data.slice(0, 3);
		const prefixInt = parseInt(prefix);
		const info = this._parseInfoFromHyperdeck(data);
		//console.log('DATA: ' + JSON.stringify(info));
		if (info) {
			if (info == 'SPLIT-DATA') return;
			this._ee.emit('ack', { code: prefix, info: info });
		} else this.emit('error', new Error('Bad response from HyperDeck: ' + data));
		if (hyperdeckErrors[prefix]) {
			//this.emit('error', new Error(hyperdeckErrors[prefix]));
			return;
		}
		if (prefixInt >= 200 && prefixInt <= 299) return;
		switch (prefix) {
			case '500':
				if (info && typeof info == 'object' && info.name == 'connection info') {
					this._hardwareInfo = info.info;
				} else {
					this.emit('error', new Error('Unknown connection message from HyperDeck: ' + data.slice(4)));
				}
				break;
			case '502':
				if (info && typeof info == 'object' && info.name == 'slot info') {
					const status = info.info.status == 'mounted' ? 'mounted' : '';
					const slotId = info.info['slot id'];
					if ((slotId == '1' || slotId == '2' || slotId == '3') && status != this._lastSlotStatus[slotId]) {
						this._lastSlotStatus[slotId] = status;
						//setTimeout to prevent polling for new clips[] while still being flooded with notifications
						setTimeout(() => {
							this._getClips(slotId)
								.then((clips) => {
									this._clips[slotId] = clips;
									this.emit('clips', this.clips);
								})
								.catch((err) => {
									this._clips[slotId] = [];
									this.emit('clips', this.clips);
								});
						}, 200);
					}
				} else this.emit('error', new Error('Unknown slot message from HyperDeck: ' + data.slice(4)));
				break;
			case '508':
				if (info && typeof info == 'object' && info.name == 'transport info') {
					const status = info.info.status;
					if (status) {
						this._transportStatus = status;
						this.emit('transport', status);
					}
				} else this.emit('error', new Error('Unknown transport message from HyperDeck: ' + data.slice(4)));
				break;
			default:
				this.emit('error', new Error('Unknown response from HyperDeck: ' + data));
				break;
		}
	}

	private _parseInfoFromHyperdeck(infoIn: string): HyperDeckInfo | null {
		const prefix = infoIn.slice(0, 3);
		let info = infoIn.slice(4);
		const rtn: HyperDeckInfo = { name: '', info: {} };
		let index = info.indexOf(':');
		const index2 = info.indexOf('\r\n');
		if (index2 < index) {
			const preString = info.slice(0, index2 + 2); //string to pass back to _processData
			info = info.slice(index2 + 2);
			index = info.indexOf(':');
			/* console.log('CRLF SPLIT:');
      console.log('"' + prefix + ' ' + preString + '"');
      console.log('"' + info + '"'); */
			this._processData(prefix + ' ' + preString);
			this._processData(info);
			return 'SPLIT-DATA';
		}
		if (index == -1) {
			return info.slice(0, -2); //info without CRLF
		}
		rtn.name = info.slice(0, index);
		info = info.slice(index + 3); //':' + two LF characters
		let split = '';
		while (info != '\r\n' && split == '') {
			//process is done when only CR LF remain
			const possiblePrefix = info.slice(0, 2) != '\r\n' ? info.slice(0, 3) : info.slice(2, 5);
			if (parseInt(possiblePrefix).toString() == possiblePrefix) split = possiblePrefix;
			const indexColon = info.indexOf(':');
			const indexLF = info.indexOf('\r');
			if ((indexColon == -1 || indexLF == -1) && split == '') {
				this.emit('error', new Error('Bad info from HyperDeck: ' + info));
				return null;
			}
			rtn.info[info.slice(0, indexColon)] = info.slice(indexColon + 2, indexLF);
			info = info.slice(indexLF + 2);
		}
		if (split == '') {
			return rtn;
		} else {
			index = infoIn.slice(3).indexOf(split);
			/* console.log(split + ':');
      console.log('"' + infoIn.slice(0, index + 3) + '"');
      console.log('"' + infoIn.slice(index + 3) + '"'); */
			this._processData(infoIn.slice(0, index + 3));
			this._processData(infoIn.slice(index + 3));
			return 'SPLIT-DATA';
		}
	}

	private _restart() {
		console.error('code me');
		return new Promise((res, rej) => {
			rej('code me');
		});
	}

	private _processCmd(cmd: Cmd, tries?: number): Promise<HyperDeckInfo> {
		const retries = tries ? tries : 0;
		return new Promise((res, rej) => {
			if (!this._inCmd) {
				this._inCmd = true;
				const timeOut = setTimeout(() => {
					this._inCmd = false;
					this.emit('info', 'HyperDeck command retry #' + retries);
					if (retries > 5) {
						this._restart()
							.then(() => {
								this._processCmd({ string: cmd.string, ack: cmd.ack }).then(res).catch(rej);
							})
							.catch(rej);
					} else {
						this._processCmd({ string: cmd.string, ack: cmd.ack }, retries + 1)
							.then(res)
							.catch(rej);
					}
				}, 500);
				const ackListener = (ack: { code: string; info: HyperDeckInfo }) => {
					const codeInt = parseInt(ack.code);
					if (cmd.ack.indexOf(ack.code) != -1 || (codeInt >= 100 && codeInt <= 199)) {
						clearTimeout(timeOut);
						this._ee.off('ack', ackListener);
						const nextCmd = this._cmdBuffer.shift();
						this._inCmd = false;
						if (nextCmd)
							setTimeout(() => {
								this._processCmd({ string: nextCmd.string, ack: nextCmd.ack })
									.then(nextCmd.res)
									.catch(nextCmd.rej);
							}, 200);
						if (cmd.ack.indexOf(ack.code) != -1) {
							res(ack.info);
						} else if (codeInt >= 100 && codeInt <= 199) {
							rej(new Error('HyperDeck error: ' + ack.info));
						}
					}
				};
				this._ee.on('ack', ackListener);
				if (this._socket && this._socket.writable) {
					//console.log('CMD: ' + cmd.string);
					this._socket.write(Buffer.from(cmd.string));
				} else this.emit('error', new Error('HyperDeck socket cannot be written'));
			} else {
				if (this._cmdBuffer.length < 5) {
					this._cmdBuffer.push({ ...cmd, res: res, rej: rej });
					this.emit('info', 'Pushing HyperDeck cmd onto buffer');
				} else rej(new Error('To many simultaneous commands to HyperDeck'));
			}
		});
	}

	get hardwareInfo() {
		return { ...this._hardwareInfo };
	}

	end(): Promise<void> {
		return new Promise((res) => {
			if (this._socket && this._socket.writable) {
				const timeOut = setTimeout(() => {
					this._ee.off('closed', closedListener);
					if (this._socket) this._socket.destroy();
					this.emit('error', new Error('HyperDeck failed to close socket'));
					res();
				}, 2000);
				const closedListener = () => {
					clearTimeout(timeOut);
					this._ee.off('closed', closedListener);
					res();
				};
				this._ee.on('closed', closedListener);
				this._connectionState = 'closed';
				this._socket.write(Buffer.from('quit\n'));
			} else {
				if (this._socket) this._socket.destroy();
				res();
			}
		});
	}

	setStopMode(mode: 'lastframe' | 'nextframe' | 'black') {
		return new Promise((res, rej) => {
			this._processCmd({
				string: `play option: stop mode: ${mode}\n`,
				ack: ['200'],
			})
				.then(res)
				.catch(rej);
		});
	}

	prepPlay(number: number, slotIdIn?: SlotId) {
		const slotId = slotIdIn ? slotIdIn : '3';
		return new Promise((res, rej) => {
			//const otherClip = this._clips[slotId].filter((x) => x.index !== number)[0].index;
			this._processCmd({
				string: 'slot select: slot id: ' + slotId + '\n',
				ack: ['200'],
			})
				.then(() => {
					return this._processCmd({
						string: 'playrange set: clip id: ' + number + '\n',
						ack: ['200'],
					});
				})
				.then(() => {
					return this._processCmd({
						string: 'goto: clip: start\n',
						ack: ['200'],
					});
				})
				.then(res)
				.catch(rej);
		});
	}

	play(clipId?: { number: number; slotId: SlotId }): Promise<HyperDeckInfo> {
		return new Promise((res, rej) => {
			//fix this to enforce stop-on-last-frame vs stop-on-black
			if (clipId) {
				this._processCmd({
					string: 'slot select: slot id: ' + clipId.slotId + '\n',
					ack: ['200'],
				})
					.then(() => {
						return this._processCmd({
							string: 'playrange set: clip id: ' + clipId.number + '\n',
							ack: ['200'],
						});
					})
					.then(() => {
						return this._processCmd({
							string: 'goto: clip: start\n',
							ack: ['200'],
						});
					})
					.then(() => {
						return this._processCmd({
							string: 'play: single clip: true\n',
							ack: ['200'],
						});
					})
					.then(res)
					.catch(rej);
			} else
				this._processCmd({
					string: 'play: stop mode: black single clip: true\n',
					ack: ['200'],
				})
					.then(res)
					.catch(rej);
		});
	}

	stop(): Promise<HyperDeckInfo> {
		return new Promise((res, rej) => {
			this._processCmd({ string: 'stop\n', ack: ['200'] })
				.then(res)
				.catch(rej);
		});
	}

	get clips(): ClipInfo[] {
		return [...this._clips['1'], ...this._clips['2'], ...this._clips['3']];
	}

	private _getSlotInfo(): Promise<typeof this._lastSlotStatus> {
		const status = this._lastSlotStatus;
		return new Promise((res) => {
			this._processCmd({
				string: 'slot select: slot id: 1\n',
				ack: ['200'],
			})
				.then(() => {
					return this._processCmd({ string: 'slot info\n', ack: ['202'] });
				})
				.then((info) => {
					if (typeof info == 'object' && info.name == 'slot info') {
						status['1'] = info.info.status == 'mounted' ? 'mounted' : '';
					} else status['1'] = '';
					return this._processCmd({
						string: 'slot select: slot id: 2\n',
						ack: ['200'],
					});
				})
				.then(() => {
					return this._processCmd({ string: 'slot info\n', ack: ['202'] });
				})
				.then((info) => {
					if (typeof info == 'object' && info.name == 'slot info') {
						status['2'] = info.info.status == 'mounted' ? 'mounted' : '';
					} else status['2'] = '';
					return this._processCmd({
						string: 'slot select: slot id: 3\n',
						ack: ['200'],
					});
				})
				.then(() => {
					return this._processCmd({ string: 'slot info\n', ack: ['202'] });
				})
				.then((info) => {
					if (typeof info == 'object' && info.name == 'slot info') {
						status['3'] = info.info.status == 'mounted' ? 'mounted' : '';
					} else status['3'] = '';
					res(status);
				})
				.catch(() => {
					res({ '1': '', '2': '', '3': '' });
				});
		});
	}

	private _getClips(slotId: SlotId): Promise<ClipInfo[]> {
		return new Promise((res, rej) => {
			this._processCmd({
				string: 'slot select: slot id: ' + slotId + '\n',
				ack: ['200'],
			})
				.then(() => {
					return this._processCmd({ string: 'clips get\n', ack: ['205'] });
				})
				.then((info) => {
					if (typeof info == 'object') {
						const rtn: ClipInfo[] = [];
						Object.keys(info.info).forEach((key) => {
							if (parseInt(key).toString() == key) {
								let rawString = (info.info as { [k: string]: string })[key];
								let index = rawString.lastIndexOf(' ');
								if (index > -1) {
									const length = timeStringToMilliseconds(rawString.slice(index + 1));
									rawString = rawString.slice(0, index);
									index = rawString.lastIndexOf(' ');
									if (index > -1) {
										rtn.push({
											filename: rawString.slice(0, index),
											startTime: rawString.slice(index + 1),
											length: length,
											index: parseInt(key),
											slotId: slotId,
										});
									} else this.emit('error', new Error('Invalid clip data from HyperDeck'));
								} else this.emit('error', new Error('Invalid clip data from HyperDeck'));
							}
						});
						res(rtn);
					} else rej(new Error('Invalid clip data from HyperDeck'));
				})
				.catch(rej);
		});
	}
}

export default Hyperdeck;

function timeStringToMilliseconds(rawString: string, fps?: number): number {
	fps = fps ? fps : 60;
	rawString = rawString.split(';').join(':');
	let index = rawString.lastIndexOf(':');
	let numString = rawString.slice(index + 1);
	rawString = rawString.slice(0, index);
	const frames = parseInt(numString);
	if (frames.toString().padStart(2, '0') != numString) return 0;
	let ms = Math.round((frames * 1000) / fps);

	index = rawString.lastIndexOf(':');
	numString = rawString.slice(index + 1);
	rawString = rawString.slice(0, index);
	const seconds = parseInt(numString);
	if (seconds.toString().padStart(2, '0') != numString) return 0;
	ms += seconds * 1000;

	index = rawString.lastIndexOf(':');
	numString = rawString.slice(index + 1);
	rawString = rawString.slice(0, index);
	const minutes = parseInt(numString);
	if (minutes.toString().padStart(2, '0') != numString) return 0;
	ms += minutes * 60 * 1000;

	index = rawString.lastIndexOf(':');
	numString = rawString.slice(index + 1);
	rawString = rawString.slice(0, index);
	const hours = parseInt(numString);
	if (hours.toString().padStart(2, '0') != numString) return 0;
	ms += hours * 60 * 60 * 1000;
	return ms;
}
