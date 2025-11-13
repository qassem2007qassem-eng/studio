
import { Timestamp } from "firebase/firestore";

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
  createdAt: string;
  postCount: number;
  followerCount: number;
  followingCount: number;
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
  createdAt: string;
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
  imageUrl?: string;
  createdAt: string;
  likeIds?: string[];
}

export interface Story {
  id: string;
  userId: string;
  user: {
      name: string;
      username: string;
      avatarUrl?: string;
  };
  contentUrl: string;
  caption?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  viewers: string[];
}

export interface AppNotification {
  id: string;
  user: Pick<User, 'username' | 'avatarUrl'> & { name: string };
  action: 'liked' | 'commented' | 'followed';
  postContent?: string;
  createdAt: string;
}

export interface Follow {
    id: string;
    followerId: string;
    followeeId: string;
    createdAt: Timestamp;
}
    
