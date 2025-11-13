
import { Timestamp } from "firebase/firestore";

export type PrivacySetting = 'everyone' | 'followers' | 'only_me' | 'none';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  avatarUrl: string;
  coverUrl: string;
  bio?: string;
  dob?: string;
  gender?: string;
  createdAt: Timestamp;
  followers: string[];
  following: string[];
  isPrivate?: boolean;
}

export interface Comment {
  id: string;
  authorId: string;
  postId: string;
  author: {
      name: string;
      username: string;
      avatarUrl?: string;
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
      avatarUrl?: string;
  };
  content: string;
  imageUrls: string[];
  createdAt: Timestamp;
  likeIds?: string[];
  updatedAt?: Timestamp;
  privacy: PrivacySetting;
  commenting: PrivacySetting;
}

export interface AppNotification {
  id:string;
  user: Pick<User, 'username' | 'avatarUrl'> & { name: string };
  action: 'liked' | 'commented' | 'followed';
  postContent?: string;
  createdAt: string;
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
