
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ImageIcon,
  Paperclip,
  Smile,
  Loader2,
  X,
} from 'lucide-react';
import Image from 'next/image';
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
import { useFirebase, useUser } from '@/firebase';
import { collection, serverTimestamp, addDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { type User as UserType } from '@/lib/types';
import { getCurrentUserProfile } from '@/services/user-service';


export default function CreatePostPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [userData, setUserData] = useState<UserType | null>(null);
  const [content, setContent] = useState('');
  const [postImage, setPostImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (user) {
      getCurrentUserProfile().then(profile => {
        if (profile) {
          setUserData(profile as UserType);
        }
      });
    }
  }, [user]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async () => {
    if ((!content.trim() && !postImage) || !user || !firestore || !userData) {
      toast({
        title: 'خطأ',
        description: 'لا يمكنك إنشاء منشور فارغ.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);

    try {
      let imageUrl = '';
      if (postImage) {
        const storage = getStorage();
        const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}`);
        const snapshot = await uploadString(imageRef, postImage, 'data_url');
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const postsCollection = collection(firestore, 'posts');
      const postData = {
        author: {
          name: userData.name,
          username: userData.username,
          avatarUrl: userData.avatarUrl,
        },
        authorId: user.uid,
        content: content.trim(),
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        likeIds: [],
      };

      await addDoc(postsCollection, postData);
      setContent('');
      setPostImage(null);
      toast({
        title: 'نجاح',
        description: 'تم نشر منشورك بنجاح.',
      });
      router.push('/home');
    } catch (error) {
      console.error(error);
      toast({
        title: 'خطأ',
        description: 'لم نتمكن من نشر منشورك. حاول مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !userData) {
    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-center">الرجاء تسجيل الدخول</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center">يجب عليك تسجيل الدخول لإنشاء منشور.</p>
                </CardContent>
            </Card>
        </div>
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
                <Button onClick={handleCreatePost} disabled={isLoading || (!content.trim() && !postImage)}>
                    {isLoading ? <Loader2 className="animate-spin" /> : 'نشر'}
                </Button>
            </header>
            <main className="flex-1 p-4 space-y-4 overflow-y-auto">
                 <div className="flex items-start gap-3">
                    <Avatar>
                        <AvatarImage src={userData.avatarUrl || undefined} alt={userData.name || ''} />
                        <AvatarFallback>{userData.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{userData.name}</p>
                        <p className="text-sm text-muted-foreground">عام</p>
                    </div>
                </div>
                <Textarea
                    placeholder={`بماذا تفكر يا ${userData.name?.split(' ')[0] || ''}؟`}
                    className="w-full h-36 bg-transparent border-none focus-visible:ring-0 text-xl"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                />
                {postImage && (
                  <div className="relative">
                      <Image src={postImage} alt="معاينة الصورة" width={800} height={450} className="rounded-lg object-contain" />
                      <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => setPostImage(null)}>
                        <X className="h-4 w-4"/>
                      </Button>
                  </div>
                )}
            </main>
            <footer className="p-4 border-t mt-auto">
                 <div className="grid grid-cols-3 gap-2">
                    <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                        <ImageIcon className="h-5 w-5 text-red-500"/>
                        <span>صورة/فيديو</span>
                    </Button>
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        className="hidden"
                        accept="image/*"
                      />
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
