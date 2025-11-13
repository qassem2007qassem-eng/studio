
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ImageIcon,
  Paperclip,
  Smile,
  Loader2,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useFirebase, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { type User as UserType } from '@/lib/types';


export default function CreatePostPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [userData, setUserData] = useState<UserType | null>(null);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then((doc) => {
        if (doc.exists()) {
          setUserData(doc.data() as UserType);
        }
      });
    }
  }, [user, firestore]);

  const handleCreatePost = async () => {
    if (!content.trim() || !user || !firestore || !userData) {
      return;
    }
    setIsLoading(true);

    try {
      const postsCollection = collection(firestore, 'posts');
      const postData = {
        author: {
          name: userData.name,
          username: userData.username,
          avatarUrl: userData.avatarUrl,
        },
        authorId: user.uid,
        content: content.trim(),
        createdAt: serverTimestamp(),
        likeIds: [],
      };

      await addDocumentNonBlocking(postsCollection, postData);
      setContent('');
      toast({
        title: 'نجاح',
        description: 'تم نشر منشورك بنجاح.',
      });
      router.push('/home');
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'لم نتمكن من نشر منشورك. حاول مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>الرجاء تسجيل الدخول</CardTitle>
            </CardHeader>
            <CardContent>
                <p>يجب عليك تسجيل الدخول لإنشاء منشور.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between p-4 border-b">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <X className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-semibold">إنشاء منشور</h1>
                <Button onClick={handleCreatePost} disabled={isLoading || !content.trim()}>
                    {isLoading ? <Loader2 className="animate-spin" /> : 'نشر'}
                </Button>
            </header>
            <main className="flex-1 p-4 space-y-4">
                 <div className="flex items-start gap-3">
                    <Avatar>
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ''} />
                        <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{user.displayName}</p>
                        <p className="text-sm text-muted-foreground">عام</p>
                    </div>
                </div>
                <Textarea
                    placeholder={`بماذا تفكر يا ${user.displayName?.split(' ')[0] || ''}؟`}
                    className="w-full h-48 bg-transparent border-none focus-visible:ring-0 text-xl"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                />
            </main>
            <footer className="p-4 border-t">
                 <div className="grid grid-cols-3 gap-2">
                    <Button variant="ghost" className="gap-2 text-muted-foreground" disabled>
                        <ImageIcon className="h-5 w-5 text-red-500"/>
                        <span>صورة/فيديو</span>
                    </Button>
                    <Button variant="ghost" className="gap-2 text-muted-foreground" disabled>
                        <Smile className="h-5 w-5 text-yellow-500"/>
                        <span>شعور/نشاط</span>
                    </Button>
                    <Button variant="ghost" className="gap-2 text-muted-foreground" disabled>
                        <Paperclip className="h-5 w-5 text-green-500"/>
                        <span>مرفق</span>
                    </Button>
                </div>
            </footer>
        </div>
    </div>
  );
}

    