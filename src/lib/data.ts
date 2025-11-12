import type { User, Story, Post, Comment, AppNotification } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const findImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'آلاء محمد',
    username: 'alaa.m',
    avatarUrl: findImage('profile-1'),
    coverUrl: findImage('cover-1'),
    bio: 'طالبة هندسة معلوماتية في جامعة دمشق. مهتمة بتطوير الويب والذكاء الاصطناعي. #مبرمجة_المستقبل',
    postCount: 125,
    followerCount: 5800,
    followingCount: 320,
  },
  {
    id: 'user-2',
    name: 'أحمد خالد',
    username: 'ahmad.k',
    avatarUrl: findImage('profile-2'),
    coverUrl: findImage('cover-2'),
    bio: 'طالب طب بشري. شغوف بالعلوم ومساعدة الآخرين.',
    postCount: 78,
    followerCount: 1200,
    followingCount: 150,
  },
  {
    id: 'user-3',
    name: 'سارة علي',
    username: 'sara.ali',
    avatarUrl: findImage('profile-3'),
    coverUrl: findImage('cover-1'),
    bio: 'طالبة فنون جميلة. أعبر عن نفسي من خلال الرسم.',
    postCount: 210,
    followerCount: 10200,
    followingCount: 450,
  },
    {
    id: 'user-4',
    name: 'عمر ياسين',
    username: 'omar.y',
    avatarUrl: findImage('profile-4'),
    coverUrl: findImage('cover-2'),
    bio: 'طالب اقتصاد. أبحث عن حلول مبتكرة لمستقبل أفضل.',
    postCount: 55,
    followerCount: 850,
    followingCount: 90,
  },
];

export const mockStories: Story[] = [
  { id: 'story-1', user: { name: mockUsers[0].name, avatarUrl: mockUsers[0].avatarUrl }, imageUrl: findImage('story-1') },
  { id: 'story-2', user: { name: mockUsers[1].name, avatarUrl: mockUsers[1].avatarUrl }, imageUrl: findImage('story-2') },
  { id: 'story-3', user: { name: mockUsers[2].name, avatarUrl: mockUsers[2].avatarUrl }, imageUrl: findImage('story-3') },
  { id: 'story-4', user: { name: mockUsers[3].name, avatarUrl: mockUsers[3].avatarUrl }, imageUrl: findImage('story-4') },
  { id: 'story-5', user: { name: mockUsers[0].name, avatarUrl: mockUsers[0].avatarUrl }, imageUrl: findImage('story-1') },
];

const mockComments: Comment[] = [
  { id: 'comment-1', author: { name: mockUsers[1].name, username: mockUsers[1].username, avatarUrl: mockUsers[1].avatarUrl }, content: 'مقال رائع ومفيد جداً، شكراً لمشاركته!', createdAt: 'منذ ساعتين' },
  { id: 'comment-2', author: { name: mockUsers[2].name, username: mockUsers[2].username, avatarUrl: mockUsers[2].avatarUrl }, content: 'بالتوفيق في دراستك!', createdAt: 'منذ ٣ ساعات' },
];

export const mockPosts: Post[] = [
  {
    id: 'post-1',
    author: { name: mockUsers[0].name, username: mockUsers[0].username, avatarUrl: mockUsers[0].avatarUrl },
    content: 'قمت اليوم بتلخيص الفصل الخامس من مادة الشبكات العصبونية. من يرغب بالملخص يمكنه التواصل معي. #هندسة_معلوماتية #ذكاء_اصطناعي',
    imageUrl: findImage('post-image-1'),
    createdAt: 'منذ ساعة',
    likeCount: 152,
    commentCount: 12,
    shareCount: 8,
    comments: mockComments,
    isLiked: true,
  },
  {
    id: 'post-2',
    author: { name: mockUsers[1].name, username: mockUsers[1].username, avatarUrl: mockUsers[1].avatarUrl },
    content: 'نصيحة لطلاب السنة الأولى في كلية الطب: لا تؤجلوا دراسة علم التشريح أبداً! ابدأوا من اليوم الأول. #طب_بشري #نصائح_دراسية',
    createdAt: 'منذ ٥ ساعات',
    likeCount: 230,
    commentCount: 45,
    shareCount: 22,
    comments: [],
    isLiked: false,
  },
    {
    id: 'post-3',
    author: { name: mockUsers[2].name, username: mockUsers[2].username, avatarUrl: mockUsers[2].avatarUrl },
    content: 'لوحتي الجديدة "أمل". استلهمتها من شروق الشمس فوق قاسيون. ما رأيكم؟ #فن #رسم',
    imageUrl: findImage('post-image-2'),
    createdAt: 'بالأمس',
    likeCount: 480,
    commentCount: 78,
    shareCount: 35,
    comments: [],
    isLiked: false,
  },
  {
    id: 'post-4',
    author: { name: mockUsers[0].name, username: mockUsers[0].username, avatarUrl: mockUsers[0].avatarUrl },
    content: 'أبحث عن شريك لمشروع تخرج في مجال معالجة اللغات الطبيعية (NLP). يفضل أن يكون لديه خبرة في Python و TensorFlow. #مشروع_تخرج #NLP',
    createdAt: 'منذ يومين',
    likeCount: 95,
    commentCount: 33,
    shareCount: 15,
    comments: [],
    isLiked: true,
  },
];

export const mockNotifications: AppNotification[] = [
    { id: 'notif-1', user: { name: mockUsers[1].name, avatarUrl: mockUsers[1].avatarUrl }, action: 'liked', postContent: 'قمت اليوم بتلخيص الفصل الخامس...', createdAt: 'منذ ٥ دقائق'},
    { id: 'notif-2', user: { name: mockUsers[2].name, avatarUrl: mockUsers[2].avatarUrl }, action: 'commented', postContent: 'قمت اليوم بتلخيص الفصل الخامس...', createdAt: 'منذ ١٠ دقائق'},
    { id: 'notif-3', user: { name: mockUsers[3].name, avatarUrl: mockUsers[3].avatarUrl }, action: 'followed', createdAt: 'منذ ساعة'},
    { id: 'notif-4', user: { name: mockUsers[0].name, avatarUrl: mockUsers[0].avatarUrl }, action: 'liked', postContent: 'نصيحة لطلاب السنة الأولى...', createdAt: 'منذ ٣ ساعات'},
];

export const mockUsersToFollow = [mockUsers[2], mockUsers[3]];

export const mockTrends = [
    { name: '#هندسة_معلوماتية', posts: '12.5k' },
    { name: '#جامعة_دمشق', posts: '8.2k' },
    { name: '#بكالوريا_2024', posts: '5.7k' },
    { name: '#نصائح_دراسية', posts: '3.1k' },
];

export const getCurrentUser = () => mockUsers[0];
export const getUser = (username: string) => mockUsers.find(u => u.username === username) || mockUsers[0];