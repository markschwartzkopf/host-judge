const recRep = nodecg.Replicant<
	{
		name: string;
		startTime: string;
		endTime: string;
		fileName: string;
	}[]
>('recordings');

document.addEventListener('dialog-confirmed', () => {
	recRep.value = [];
});
