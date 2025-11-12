
export interface User {
  id: string;
  username: string;
  email: string;
  profilePictureUrl?: string;
  coverPhotoUrl?: string;
  bio?: string;
  privacySettings?: string;
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
      avatarUrl?: string;
  };
  contentUrl: string;
  createdAt: string;
  expiresAt: string;
}

export interface AppNotification {
  id: string;
  user: Pick<User, 'username' | 'profilePictureUrl'> & { name: string };
  action: 'liked' | 'commented' | 'followed';
  postContent?: string;
  createdAt: string;
}
