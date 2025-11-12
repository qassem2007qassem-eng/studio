
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { mockStories } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORY_DURATION = 5000; // 5 seconds per story

export default function StoryPage({ params }: { params: { id: string } }) {
    const router = useRouter();

    const initialStoryIndex = useMemo(() => mockStories.findIndex(s => s.id === params.id), [params.id]);

    const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
    const [progress, setProgress] = useState(0);

    const story = mockStories[currentStoryIndex];
    const user = story?.user;

    useEffect(() => {
        if (currentStoryIndex === -1) {
            router.push('/home');
            return;
        }

        setProgress(0);
        
        const progressInterval = setInterval(() => {
            setProgress(prev => prev + (100 / (STORY_DURATION / 100)));
        }, 100);

        const storyTimeout = setTimeout(() => {
            handleNextStory();
        }, STORY_DURATION);

        return () => {
            clearInterval(progressInterval);
            clearTimeout(storyTimeout);
        };
    }, [currentStoryIndex, router]);

    const handleNextStory = () => {
        if (currentStoryIndex < mockStories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
        } else {
            router.push('/home'); // Go home after the last story
        }
    };

    const handlePrevStory = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1);
        } else {
            router.push('/home'); // Go home if trying to go back from the first story
        }
    };

    if (currentStoryIndex === -1 || !story || !user) {
        return (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                <div className="text-center text-white">
                    <h1 className="text-2xl font-bold">لم يتم العثور على القصة</h1>
                    <p className="text-muted-foreground">ربما انتهت صلاحيتها أو تم حذفها.</p>
                    <Button asChild className="mt-4">
                        <Link href="/home">العودة إلى الصفحة الرئيسية</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={(e) => {
             // Close if clicking on the background
            if (e.target === e.currentTarget) {
                router.push('/home');
            }
        }}>
            {/* Previous story button */}
            <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-20" onClick={handlePrevStory}>
                <ChevronLeft className="h-8 w-8" />
            </Button>
            
            <div className="relative aspect-[9/16] w-full max-w-md h-full max-h-[90vh] rounded-2xl overflow-hidden bg-muted">
                <Image
                    src={story.imageUrl}
                    alt={`Story by ${story.user.name}`}
                    fill
                    className="object-cover"
                    priority
                />

                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/50 to-transparent">
                    {/* Progress Bars */}
                    <div className="flex gap-1 mb-2">
                        {mockStories.map((_, index) => (
                            <div key={index} className="flex-1 h-1 bg-white/30 rounded-full">
                                <div 
                                    className="h-1 bg-white rounded-full transition-all duration-100 ease-linear"
                                    style={{ width: `${index < currentStoryIndex ? 100 : (index === currentStoryIndex ? progress : 0)}%` }}
                                ></div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <Avatar className="h-10 w-10 border-2 border-white">
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                         </Avatar>
                         <div>
                            <Link href={`/home/profile/${user.username}`} className="font-bold text-white text-sm hover:underline">
                                {story.user.name}
                            </Link>
                            <p className="text-xs text-gray-300">منذ 4 ساعات</p>
                         </div>
                       </div>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" asChild>
                            <Link href="/home">
                                <X />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Next story button */}
             <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-20" onClick={handleNextStory}>
                <ChevronRight className="h-8 w-8" />
            </Button>
        </div>
    );
}
