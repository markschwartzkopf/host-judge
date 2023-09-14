type AuditionSegment = {
	filename: string;
	donations: Donation[];
	instructions: string;
}

type Donation = {
	donor: string;
	amount: number;
	comment: string;
	hide?: boolean;
}