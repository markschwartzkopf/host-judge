/// <reference path="../../../../types/browser.d.ts" />

const video = document.getElementById('playback') as HTMLVideoElement;

let nextVideo: Blob | undefined;
let videoSrc: undefined | string;
let loading = false;

nodecg.listenFor('preloadVideo', async (filename) => {
	loading = true;
	const res = await fetch(`/assets/host-judge/videos/${filename}`);
	const blob = await res.blob();

	if (loading) {
		loading = false;
		nextVideo = blob;
		videoSrc = filename;
	}
});

nodecg.listenFor('playFile', async (filename) => {
	loading = false;

	if (videoSrc !== filename) {
		video.src = `/assets/host-judge/videos/${filename}`;
	} else {
		video.src = (nextVideo && URL.createObjectURL(nextVideo)) ?? '';
	}

	await video.play();
});
