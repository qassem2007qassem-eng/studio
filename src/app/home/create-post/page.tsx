
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ImageIcon,
  Loader2,
  X,
  Globe,
  Users,
  Lock,
  ChevronDown
} from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { type User as UserType, type PrivacySetting } from '@/lib/types';
import { getCurrentUserProfile } from '@/services/user-service';
import { createPost } from '@/services/post-service';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const privacyOptions: { value: PrivacySetting; label: string; icon: React.FC<any> }[] = [
  { value: 'everyone', label: 'الجميع', icon: Globe },
  { value: 'followers', label: 'المتابعون فقط', icon: Users },
  { value: 'only_me', label: 'أنا فقط', icon: Lock },
];

const backgroundOptions = [
  { id: 'default', className: 'bg-transparent text-foreground' },
  { id: 'bg1', className: 'bg-gradient-to-br from-red-200 to-yellow-200 text-black' },
  { id: 'bg2', className: 'bg-gradient-to-br from-blue-200 to-purple-200 text-black' },
  { id: 'bg3', className: 'bg-gradient-to-br from-green-200 to-teal-200 text-black' },
  { id: 'bg4', className: 'bg-gradient-to-br from-pink-200 to-rose-200 text-black' },
  { id: 'bg5', className: 'bg-gray-800 text-white' },
];

export default function CreatePostPage() {
  const { user, isUserLoading } = useUser();
  const [userData, setUserData] = useState<UserType | null>(null);
  const [content, setContent] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [privacy, setPrivacy] = useState<PrivacySetting>('everyone');
  const [background, setBackground] = useState(backgroundOptions[0].id);
  
  const hasImages = postImages.length > 0;
  const hasBackground = background !== 'default';

  useEffect(() => {
    if (user && !userData) {
      getCurrentUserProfile().then(profile => {
        if (profile) {
          setUserData(profile as UserType);
        }
      });
    }
  }, [user, userData]);

  useEffect(() => {
    // If images are added, reset the background
    if (hasImages) {
        setBackground('default');
    }
  }, [hasImages])

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
    if (!content.trim() && !hasImages) {
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
      await createPost({
        content: content.trim(),
        imageBlobs: postImages,
        author: {
          name: profile.name,
          username: profile.username.toLowerCase(),
          avatarUrl: profile.avatarUrl,
        },
        privacy,
        commenting: 'everyone',
        background,
      });

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
  
  const CurrentPrivacyIcon = privacyOptions.find(p => p.value === privacy)?.icon;
  const selectedBackgroundClass = backgroundOptions.find(b => b.id === background)?.className || '';

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
                <Button onClick={handleCreatePost} disabled={isSaving || (!content.trim() && !hasImages)}>
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 p-1 text-xs">
                                     {CurrentPrivacyIcon && <CurrentPrivacyIcon className="h-3 w-3 me-1" />}
                                    {privacyOptions.find(p => p.value === privacy)?.label}
                                    <ChevronDown className="h-3 w-3 ms-1"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {privacyOptions.map(option => (
                                    <DropdownMenuItem key={option.value} onSelect={() => setPrivacy(option.value)}>
                                        <option.icon className="h-4 w-4 me-2"/>
                                        {option.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className={cn(
                    "relative flex items-center justify-center rounded-lg min-h-[144px]",
                    hasBackground && "min-h-[250px]",
                    selectedBackgroundClass
                )}>
                    <Textarea
                        placeholder={`بماذا تفكر يا ${userData.name?.split(' ')[0] || ''}؟`}
                        className={cn(
                            "w-full bg-transparent border-none focus-visible:ring-0 resize-none",
                            "text-xl",
                            hasBackground && "text-3xl font-bold text-center h-auto min-h-[250px] flex items-center justify-center"
                        )}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={isSaving}
                        autoFocus
                    />
                </div>
                
                {hasImages && (
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
                 <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={hasBackground}>
                        <ImageIcon className="h-6 w-6 text-green-500"/>
                        <span className="sr-only">إضافة صورة</span>
                    </Button>
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        className="hidden"
                        accept="image/*"
                        multiple
                        disabled={hasBackground}
                      />
                    {!hasImages && backgroundOptions.map(bg => (
                        <button 
                            key={bg.id}
                            onClick={() => setBackground(bg.id)}
                            className={cn(
                                "h-8 w-8 rounded-full border-2",
                                background === bg.id ? "border-primary" : "border-muted",
                                bg.className.startsWith('bg-') ? bg.className.split(' ')[0] : 'bg-transparent',
                                bg.id === 'default' && 'flex items-center justify-center text-muted-foreground'
                            )}
                        >
                            {bg.id === 'default' && 'Aa'}
                        </button>
                    ))}
                </div>
            </footer>
        </div>
    </div>
  );
}
