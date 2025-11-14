
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
  ChevronDown,
  UploadCloud
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
import { Progress } from '@/components/ui/progress';

interface ImageFile {
    file: File;
    preview: string;
}

interface UploadProgress {
    [fileName: string]: {
        progress: number;
        status: 'uploading' | 'completed' | 'error';
    };
}


const privacyOptions: { value: PrivacySetting; label: string; icon: React.FC<any> }[] = [
  { value: 'everyone', label: 'الجميع', icon: Globe },
  { value: 'followers', label: 'المتابعون فقط', icon: Users },
  { value: 'only_me', label: 'أنا فقط', icon: Lock },
];

const backgroundOptions = [
  { id: 'default', value: 'bg-card text-foreground' },
  { id: 'gradient1', value: 'bg-gradient-to-br from-red-200 to-yellow-200 text-black' },
  { id: 'gradient2', value: 'bg-gradient-to-br from-blue-200 to-purple-200 text-black' },
  { id: 'gradient3', value: 'bg-gradient-to-br from-green-200 to-teal-200 text-black' },
  { id: 'gradient4', value: 'bg-gradient-to-br from-pink-200 to-rose-200 text-black' },
  { id: 'gradient5', value: 'bg-gray-800 text-white' },
];


const ImageUploadProgress = ({ progress, status }: { progress: number; status: string; }) => (
    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 rounded-lg">
        {status === 'uploading' ? (
            <>
                <UploadCloud className="h-8 w-8 text-white" />
                <p className="text-white text-sm font-semibold">جاري الرفع... {progress.toFixed(0)}%</p>
                <Progress value={progress} className="w-3/4 h-1" />
            </>
        ) : status === 'completed' ? (
            <p className="text-white">اكتمل</p>
        ) : (
            <p className="text-red-500">خطأ في الرفع</p>
        )}
    </div>
);


export default function CreatePostPage() {
  const { user, isUserLoading } = useUser();
  const [userData, setUserData] = useState<UserType | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [content, setContent] = useState('');
  const [postImages, setPostImages] = useState<ImageFile[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [privacy, setPrivacy] = useState<PrivacySetting>('everyone');
  const [background, setBackground] = useState(backgroundOptions[0].id);
  
  const hasImages = postImages.length > 0;
  const selectedBackground = backgroundOptions.find(b => b.id === background);
  const hasBackground = background !== 'default';
  
  const uploadingFileNames = Object.keys(uploadProgress).filter(
    (fileName) => uploadProgress[fileName].status === 'uploading'
  );
  const isUploading = uploadingFileNames.length > 0;
  const totalFilesToUpload = postImages.length;
  const completedFiles = totalFilesToUpload - uploadingFileNames.length;


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

  useEffect(() => {
    if (hasImages) {
        setBackground('default');
    }
  }, [hasImages])

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
        const newImages = Array.from(files).map(file => ({
            file: file,
            preview: URL.createObjectURL(file)
        }));
        setPostImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    const imageToRemove = postImages[index];
    URL.revokeObjectURL(imageToRemove.preview); // Clean up blob URL
    setPostImages(prev => prev.filter((_, i) => i !== index));
    setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[imageToRemove.file.name];
        return newProgress;
    });
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
    setUploadProgress({});

    try {
      await createPost({
        content: content.trim(),
        imageFiles: postImages.map(img => img.file), // Pass the actual File objects
        author: {
          name: profile.name,
          username: profile.username.toLowerCase(),
          avatarUrl: profile.avatarUrl,
        },
        privacy,
        commenting: 'everyone',
        background: background,
        onProgress: (fileName, progress, status) => {
             setUploadProgress(prev => ({
                ...prev,
                [fileName]: { progress, status },
            }));
        },
      });

      setContent('');
      postImages.forEach(img => URL.revokeObjectURL(img.preview)); // Cleanup all blob URLs
      setPostImages([]);
      setUploadProgress({});
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
  
  const CurrentPrivacyIcon = privacyOptions.find(p => p.value === privacy)?.icon;
  

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
          <Button variant="ghost" size="icon" onClick={() => router.back()} disabled={isSaving || isUploading}>
              <X className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">إنشاء منشور</h1>
          <Button onClick={handleCreatePost} disabled={isSaving || isUploading || (!content.trim() && !hasImages)}>
              {isUploading ? (
                  <>
                    <Loader2 className="animate-spin me-2" />
                    جاري رفع الصور... ({completedFiles}/{totalFilesToUpload})
                  </>
                ) : isSaving ? (
                  <Loader2 className="animate-spin" />
                ) : 'نشر'}
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
              disabled={isSaving || isUploading}
              autoFocus
          />
          
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
                     <Image src={image.preview} alt={`معاينة الصورة ${index + 1}`} fill className="rounded-lg object-cover" />
                     {uploadProgress[image.file.name] && <ImageUploadProgress {...uploadProgress[image.file.name]} />}
                     <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeImage(index)} disabled={isSaving || isUploading}>
                        <X className="h-4 w-4"/>
                     </Button>
                  </div>
                ))}
            </div>
          )}
      </main>
      <footer className="p-4 border-t mt-auto flex-shrink-0 bg-background">
           <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={hasBackground || isSaving || isUploading}>
                  <ImageIcon className={cn("h-6 w-6", hasBackground ? "text-muted-foreground" : "text-green-500")}/>
                  <span className="sr-only">إضافة صورة</span>
              </Button>
               <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden"
                  accept="image/*"
                  multiple
                  disabled={hasBackground || isSaving || isUploading}
                />
              {!hasImages && backgroundOptions.map(bg => (
                  <button 
                      key={bg.id}
                      onClick={() => setBackground(bg.id)}
                      className={cn(
                          "h-8 w-8 rounded-full border-2 flex-shrink-0",
                          background === bg.id ? "border-primary" : "border-muted",
                      )}
                      disabled={isSaving || isUploading}
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
