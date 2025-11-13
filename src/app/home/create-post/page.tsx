
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
import { Textarea } from '@/components/ui/textarea';
import { useUser, initializeFirebase } from '@/firebase';
import { collection, serverTimestamp, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { type User as UserType } from '@/lib/types';
import { getCurrentUserProfile } from '@/services/user-service';
import { cn } from '@/lib/utils';


export default function CreatePostPage() {
  const { user, isUserLoading } = useUser();
  const [userData, setUserData] = useState<UserType | null>(null);
  const [content, setContent] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (user && !userData) {
      getCurrentUserProfile().then(profile => {
        if (profile) {
          setUserData(profile as UserType);
        }
      });
    }
  }, [user, userData]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages: string[] = [];
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newImages.push(reader.result as string);
          if (newImages.length === files.length) {
            setPostImages(prev => [...prev, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setPostImages(prev => prev.filter((_, i) => i !== index));
  };


  const handleCreatePost = async () => {
    if (!content.trim() && postImages.length === 0) {
      toast({
        title: 'خطأ',
        description: 'لا يمكنك إنشاء منشور فارغ.',
        variant: 'destructive',
      });
      return;
    }
    const profile = await getCurrentUserProfile();
    if (!user || !profile) {
       toast({
        title: 'خطأ',
        description: 'الرجاء تسجيل الدخول أولاً.',
        variant: 'destructive',
      });
      return;
    }
    setIsSaving(true);

    try {
      const { firestore, storage } = initializeFirebase();
      
      const imageUrls: string[] = [];
      for (const image of postImages) {
         const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}-${Math.random()}`);
         const snapshot = await uploadString(imageRef, image, 'data_url');
         const downloadURL = await getDownloadURL(snapshot.ref);
         imageUrls.push(downloadURL);
      }

      const postsCollection = collection(firestore, 'posts');
      
      const postData = {
        authorId: user.uid,
        author: {
          name: profile.name,
          username: profile.username.toLowerCase(),
          avatarUrl: profile.avatarUrl,
        },
        content: content.trim(),
        imageUrls: imageUrls,
        createdAt: serverTimestamp() as Timestamp,
        likeIds: [],
        updatedAt: serverTimestamp() as Timestamp,
      };

      await addDoc(postsCollection, postData);

      setContent('');
      setPostImages([]);
      toast({
        title: 'نجاح',
        description: 'تم نشر منشورك بنجاح.',
      });
      router.push('/home');
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: 'خطأ',
        description: 'لم نتمكن من نشر منشورك. حاول مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading) {
      return (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      );
  }

  if (!user || !userData) {
     return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card p-6 rounded-lg shadow-lg text-center">
                <p>الرجاء تسجيل الدخول لإنشاء منشور.</p>
                <Button onClick={() => router.push('/login')} className="mt-4">تسجيل الدخول</Button>
            </div>
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
                <Button onClick={handleCreatePost} disabled={isSaving || (!content.trim() && postImages.length === 0)}>
                    {isSaving ? <Loader2 className="animate-spin" /> : 'نشر'}
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
                    disabled={isSaving}
                    autoFocus
                />
                {postImages.length > 0 && (
                  <div className={cn(
                      "grid gap-2",
                      postImages.length === 1 && "grid-cols-1",
                      postImages.length === 2 && "grid-cols-2",
                      postImages.length === 3 && "grid-cols-3",
                      postImages.length >= 4 && "grid-cols-2",
                  )}>
                      {postImages.map((image, index) => (
                        <div key={index} className="relative aspect-square">
                           <Image src={image} alt={`معاينة الصورة ${index + 1}`} fill className="rounded-lg object-cover" />
                           <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeImage(index)}>
                              <X className="h-4 w-4"/>
                           </Button>
                        </div>
                      ))}
                  </div>
                )}
            </main>
            <footer className="p-4 border-t mt-auto">
                 <div className="grid grid-cols-3 gap-2">
                    <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="h-5 w-5 text-red-500"/>
                        <span>صورة/فيديو</span>
                    </Button>
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        className="hidden"
                        accept="image/*"
                        multiple
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
