export interface User {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  coverUrl: string;
  bio: string;
  postCount: number;
  followerCount: number;
  followingCount: number;
}

export interface Comment {
  id: string;
  author: Pick<User, 'name' | 'username' | 'avatarUrl'>;
  content: string;
  createdAt: string;
}

export interface Post {
  id: string;
  author: Pick<User, 'name' | 'username' | 'avatarUrl'>;
  content: string;
  imageUrl?: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  comments: Comment[];
  isLiked: boolean;
}

export interface Story {
  id: string;
  user: Pick<User, 'name' | 'avatarUrl'>;
  imageUrl: string;
}

export interface AppNotification {
  id: string;
  user: Pick<User, 'name' | 'avatarUrl'>;
  action: 'liked' | 'commented' | 'followed';
  postContent?: string;
  createdAt: string;
}
