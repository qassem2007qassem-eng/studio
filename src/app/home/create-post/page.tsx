
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  X,
  Globe,
  Users,
  Lock,
  ChevronDown,
  MessageCircle,
  MessageCircleOff,
} from 'lucide-react';
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

const visibilityOptions: { value: PrivacySetting; label: string; icon: React.FC<any> }[] = [
  { value: 'everyone', label: 'الجميع', icon: Globe },
  { value: 'followers', label: 'المتابعون فقط', icon: Users },
  { value: 'only_me', label: 'أنا فقط', icon: Lock },
];

const commentingOptions: { value: PrivacySetting; label: string; icon: React.FC<any> }[] = [
  { value: 'everyone', label: 'الجميع', icon: MessageCircle },
  { value: 'followers', label: 'المتابعون', icon: Users },
  { value: 'none', label: 'لا أحد', icon: MessageCircleOff },
];

const backgroundOptions = [
  { id: 'default', value: 'bg-card text-foreground' },
  { id: 'gradient1', value: 'bg-gradient-to-br from-red-200 to-yellow-200 text-black' },
  { id: 'gradient2', value: 'bg-gradient-to-br from-blue-200 to-purple-200 text-black' },
  { id: 'gradient3', value: 'bg-gradient-to-br from-green-200 to-teal-200 text-black' },
  { id: 'gradient4', value: 'bg-gradient-to-br from-pink-200 to-rose-200 text-black' },
  { id: 'gradient5', value: 'bg-gray-800 text-white' },
];


export default function CreatePostPage() {
  const { user, isUserLoading } = useUser();
  const [userData, setUserData] = useState<UserType | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();
  const router = useRouter();
  const [visibility, setVisibility] = useState<PrivacySetting>('everyone');
  const [commenting, setCommenting] = useState<PrivacySetting>('everyone');
  const [background, setBackground] = useState(backgroundOptions[0].id);
  
  const selectedBackground = backgroundOptions.find(b => b.id === background);
  const hasBackground = background !== 'default';

  useEffect(() => {
    if (user && !userData) {
      getCurrentUserProfile().then(profile => {
        if (profile) {
          setUserData(profile as UserType);
        }
        setIsDataLoading(false);
      });
    } else if (!isUserLoading) {
      setIsDataLoading(false);
    }
  }, [user, userData, isUserLoading]);

  const handleCreatePost = async () => {
    if (!content.trim()) {
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
        author: {
          name: profile.name,
          username: profile.username.toLowerCase(),
        },
        privacy: visibility,
        commenting: commenting,
        background: background,
      });

      setContent('');
      toast({
        title: 'نجاح',
        description: 'تم نشر منشورك بنجاح.',
      });
      router.push('/home');
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast({
        title: 'خطأ في إنشاء المنشور',
        description: error.message || 'لم نتمكن من نشر منشورك. حاول مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const CurrentVisibilityIcon = visibilityOptions.find(p => p.value === visibility)?.icon;
  const CurrentCommentingIcon = commentingOptions.find(p => p.value === commenting)?.icon;
  

  if (isUserLoading || isDataLoading) {
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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col pb-20">
      <header className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} disabled={isSaving}>
              <X className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">إنشاء منشور</h1>
          <Button onClick={handleCreatePost} disabled={isSaving || !content.trim()}>
              {isSaving ? (
                  <Loader2 className="animate-spin" />
                ) : 'نشر'}
          </Button>
      </header>
      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
           <div className="flex items-start gap-3">
              <Avatar>
                  <AvatarImage alt={userData.name || ''} />
                  <AvatarFallback>{userData.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                  <p className="font-semibold">{userData.name}</p>
                   <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 p-1 text-xs">
                                  {CurrentVisibilityIcon && <CurrentVisibilityIcon className="h-3 w-3 me-1" />}
                                  {visibilityOptions.find(p => p.value === visibility)?.label}
                                  <ChevronDown className="h-3 w-3 ms-1"/>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                              {visibilityOptions.map(option => (
                                  <DropdownMenuItem key={option.value} onSelect={() => setVisibility(option.value)}>
                                      <option.icon className="h-4 w-4 me-2"/>
                                      {option.label}
                                  </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                      </DropdownMenu>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 p-1 text-xs">
                                  {CurrentCommentingIcon && <CurrentCommentingIcon className="h-3 w-3 me-1" />}
                                  <span className="whitespace-nowrap">التعليق: {commentingOptions.find(p => p.value === commenting)?.label}</span>
                                  <ChevronDown className="h-3 w-3 ms-1"/>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                              {commentingOptions.map(option => (
                                  <DropdownMenuItem key={option.value} onSelect={() => setCommenting(option.value)}>
                                      <option.icon className="h-4 w-4 me-2"/>
                                      {option.label}
                                  </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                      </DropdownMenu>
                   </div>
              </div>
          </div>

          <Textarea
              placeholder={`بماذا تفكر يا ${userData.name?.split(' ')[0] || ''}؟`}
              className={cn(
                  "w-full border-none focus-visible:ring-0 resize-none rounded-lg min-h-[250px] flex items-center justify-center p-4",
                  "text-xl",
                  hasBackground ? "text-3xl font-bold text-center" : "",
                  selectedBackground?.value
              )}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSaving}
              autoFocus
          />
          
      </main>
      <footer className="p-4 border-t mt-auto flex-shrink-0 bg-background">
           <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {backgroundOptions.map(bg => (
                  <button 
                      key={bg.id}
                      onClick={() => setBackground(bg.id)}
                      className={cn(
                          "h-8 w-8 rounded-full border-2 flex-shrink-0",
                          background === bg.id ? "border-primary" : "border-muted",
                      )}
                      disabled={isSaving}
                  >
                      <div className={cn("h-full w-full rounded-full", bg.value.split(' ')[0], bg.id === 'default' && 'flex items-center justify-center text-muted-foreground border')}>
                          {bg.id === 'default' && 'Aa'}
                      </div>
                  </button>
              ))}
          </div>
      </footer>
    </div>
  );
}
