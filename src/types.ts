/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'fr' | 'ht'; // French or Haitian Creole (Kreyòl Ayisyen)

export interface Memorial {
  id: string;
  fullName: string;
  nickname: string;
  birthDate: string; // e.g., "1994-06-26"
  importantDate: string; // e.g., "June 26"
  biography: string;
  coverImage: string;
  profileImage?: string;
  personalityTitleFr?: string;
  personalityTitleHt?: string;
  personalityTextFr?: string;
  personalityTextHt?: string;
  traitsTitleFr?: string;
  traitsTitleHt?: string;
  traitsFr?: string;
  traitsHt?: string;
  createdAt: string;
}

export interface Testimonial {
  id: string;
  memorialId: string;
  authorName: string;
  nickname?: string;
  relationship: 'family' | 'friend' | 'colleague' | 'other';
  language: Language;
  message: string;
  photoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  isAnonymous: boolean;
  likes?: number;
  createdAt: string;
}

export interface Photo {
  id: string;
  memorialId: string;
  category: 'Childhood' | 'Family' | 'Friends' | 'Important Moments' | 'Memories';
  imageUrl: string;
  caption: string;
  uploadedBy: string;
  createdAt: string;
}

export interface TributeVideoConfig {
  id: string;
  memorialId: string;
  title: string;
  musicUrl: string;
  downloadUrl?: string; // Optional direct mp4/webm download link
  videoEnabled?: boolean;
  disabledMessageFr?: string;
  disabledMessageHt?: string;
  status: 'draft' | 'published';
  selectedPhotos: string[]; // List of Photo IDs
  selectedTestimonials: string[]; // List of Testimonial IDs
  slideDuration: number; // in seconds
  createdAt: string;
}

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  youtubeUrl: string;
  audioUrl?: string;
  createdAt: string;
}

export interface DownloadRequest {
  id: string;
  name: string;
  type: 'photos' | 'pdf';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

