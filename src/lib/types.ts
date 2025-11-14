

import { Timestamp } from "firebase/firestore";

export type PrivacySetting = 'everyone' | 'followers' | 'only_me' | 'none';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  bio?: string;
  dob?: string;
  gender?: string;
  createdAt: Timestamp;
  followers: string[];
  following: string[];
  isPrivate?: boolean;
  emailVerified?: boolean;
}

export interface Comment {
  id: string;
  authorId: string;
  postId: string;
  author: {
      name: string;
      username: string;
  };
  content: string;
  createdAt: Timestamp;
}

export interface Post {
  id: string;
  authorId: string;
  author: {
      name: string;
      username: string;
  };
  content: string;
  createdAt: Timestamp;
  likeIds?: string[];
  updatedAt?: Timestamp;
  privacy: PrivacySetting;
  commenting: PrivacySetting;
  background?: string;
}

export interface AppNotification {
  id: string;
  userId: string; // The user who receives the notification
  fromUser: {
    id: string;
    name: string;
    username: string;
  };
  type: 'like' | 'comment' | 'follow' | 'follow_request';
  content: string;
  relatedEntityId: string; // e.g., postId, commentId, or fromUserId for follows
  isRead: boolean;
  createdAt: Timestamp;
}


export interface Report {
    id: string;
    reporterId: string;
    reportedEntityId: string;
    reportedEntityType: 'post' | 'user' | 'comment';
    reason: string;
    createdAt: Timestamp;
    status: 'pending' | 'resolved' | 'dismissed' | 'deleted';
}

    
