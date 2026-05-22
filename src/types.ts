export interface User {
  uid: string;
  email: string;
  name: string;
  provider: 'google' | 'apple';
  avatar: string;
}

export interface QuizQuestion {
  id: string;
  imageSrc: string; // we will use elegant, curated Unsplash travel images
  question: string;
  optionYes: string;
  optionNo: string;
  yesCategory: string; // e.g. 'Beach', 'Urban', 'Luxury', 'Adventure', 'Culture', 'Structured'
  noCategory: string; // e.g. 'Mountain', 'Nature', 'Budget', 'Relaxation', 'Entertainment', 'Spontaneous'
}

export interface PreferenceResponse {
  [questionId: string]: 'yes' | 'no';
}

export interface InterestProfile {
  [category: string]: number; // category name to percentage
}

export interface TravelerPreference {
  userId: string;
  email: string;
  name: string;
  responses: PreferenceResponse;
  profile: InterestProfile;
  submittedAt: string;
}

export interface Review {
  id: string;
  author: string;
  comment: string;
  date: string;
  rating: number;
  recentWeight: number; // weight multiplier for recency, e.g. 1.2 or 0.8
}

export interface ItineraryItem {
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
  rating: number;
  reviewsCount: number;
  recentRatingTrend: 'up' | 'down' | 'stable';
  ratingDelta: number; // change in rating recently
  category: string;
  reviews: Review[];
  fallbackOptions?: ItineraryItem[];
  isFlaggedLater?: boolean;
}

export interface ItineraryDay {
  day: number;
  date: string;
  activities: ItineraryItem[];
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  description: string;
  organiserId: string;
  organiserName: string;
  deadline: string;
  status: 'setup' | 'gathering' | 'analysis' | 'review' | 'finalized';
  invites: string[]; // list of emails invited
  preferences: TravelerPreference[];
  consensusThreshold: number; // normally 75%
  consensusReached: boolean;
  consensusScore: number; // overall calculated consensus
  categoryScores: { [category: string]: number }; // consolidated scores
  generatedItinerary: ItineraryDay[] | null;
  comments: Comment[];
  votes: { [userId: string]: 'approve' | 'edit' };
  chatMessages: ChatMessage[];
  flaggedForLater: ItineraryItem[];
}
