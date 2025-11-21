

import { Timestamp } from "firebase/firestore";

export type PrivacySetting = 'followers' | 'only_me' | 'everyone' | 'none';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  bio?: string;
  dob?: string;
  gender?: string;
  profilePictureUrl?: string;
  createdAt: Timestamp;
  followers: string[];
  following: string[];
  isPrivate?: boolean;
  isVerified?: boolean;
  emailVerified?: boolean;
  accountType: 'student' | 'teacher';
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
  groupId?: string; // Optional group ID
  content: string;
  createdAt: Timestamp;
  likeIds?: string[];
  updatedAt?: Timestamp;
  privacy: PrivacySetting;
  commenting: PrivacySetting;
  background?: string;
  status: 'pending' | 'approved';
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
    reportedEntityType: 'post' | 'user' | 'comment' | 'verification_request' | 'lesson';
    reason: string;
    createdAt: Timestamp;
    status: 'pending' | 'resolved' | 'dismissed' | 'deleted';
}

export interface Group {
    id: string;
    name: string;
    description: string;
    creatorId: string;
    privacy: 'public' | 'private';
    memberIds: string[];
    createdAt: Timestamp;
    // New fields for group management
    moderationRequired: boolean; // If true, posts need approval
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  bio?: string;
  profilePictureUrl?: string;
  courseIds?: string[];
  createdAt?: Timestamp;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  teacherId: string;
  lessonIds: string[];
  totalDuration: number; // in seconds
  createdAt: Timestamp;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number; // in seconds
  courseId: string;
  teacherId: string;
  views: number;
  likes: string[]; // Changed to array of user IDs
  createdAt: Timestamp;
}

export interface LessonComment {
    id: string;
    lessonId: string;
    authorId: string;
    author: {
        name: string;
        username: string;
    };
    content: string;
    createdAt: Timestamp;
    parentId?: string | null;
}

export interface Playlist {
    id: string;
    title: string;
    description?: string;
    teacherId: string;
    courseIds: string[];
}
    
