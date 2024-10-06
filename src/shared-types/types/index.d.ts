type AuditionSegment = {
  filename: string;
  donations: Donation[];
  instructions: string;
  retain: boolean;
};

type Donation = {
  donor: string;
  amount: number;
  comment: string;
  persist?: boolean;
  hide?: boolean;
  pinned?: boolean;
};
