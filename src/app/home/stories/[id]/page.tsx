
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORY_DURATION = 10000; // 10 seconds per story

export default function StoryPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { id } = params;
    const mockStories: any[] = [];

    const initialStoryIndex = useMemo(() => mockStories.findIndex(s => s.id === id), [id, mockStories]);

    const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
    const [progress, setProgress] = useState(0);

    // This effect handles the timer and auto-advancing stories
    useEffect(() => {
        // If the story can't be found, go back home
        if (initialStoryIndex === -1) {
            router.push('/home');
            return;
        }
        
        // Reset progress when story changes
        setProgress(0);
        
        // Set up an interval to update the progress bar every 100ms
        const progressInterval = setInterval(() => {
            setProgress(prev => prev + (100 / (STORY_DURATION / 100)));
        }, 100);

        // Set up a timeout to switch to the next story
        const storyTimeout = setTimeout(() => {
            handleNextStory();
        }, STORY_DURATION);

        // Cleanup function to clear intervals and timeouts
        return () => {
            clearInterval(progressInterval);
            clearTimeout(storyTimeout);
        };
    }, [currentStoryIndex, initialStoryIndex, router]); // Rerun effect when story index changes

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
        }
    };

    // Get the current story object, or null if not found
    const story = currentStoryIndex !== -1 ? mockStories[currentStoryIndex] : null;
    const user = story?.user;
    
    // If story or user don't exist (e.g., invalid ID), show a not found message
    if (!story || !user) {
        // This can be a loading state or a not found component
        // For now, redirecting to home if the initial story is not found.
        useEffect(() => {
            if(initialStoryIndex === -1) {
                router.push('/home');
            }
        }, [router, initialStoryIndex]);
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={(e) => {
             // Close if clicking on the background
            if (e.target === e.currentTarget) {
                router.push('/home');
            }
        }}>
            {/* Previous story button */}
            <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-20" onClick={handlePrevStory} disabled={currentStoryIndex === 0}>
                <ChevronLeft className="h-8 w-8" />
            </Button>
            
            <div className="relative aspect-[9/16] w-full max-w-md h-full max-h-[90vh] rounded-2xl overflow-hidden bg-muted">
                <Image
                    src={story.imageUrl}
                    alt={`Story by ${story.user.name}`}
                    fill
                    className="object-cover"
                    priority
                    key={story.id} // Add key to force re-render on image change
                />

                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/50 to-transparent">
                    {/* Progress Bars */}
                    <div className="flex gap-1 mb-2">
                        {mockStories.map((s, index) => (
                            <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                                <div 
                                    className="h-1 bg-white"
                                    style={{ 
                                        width: `${index < currentStoryIndex ? 100 : (index === currentStoryIndex ? progress : 0)}%`,
                                        transition: index === currentStoryIndex ? 'width 100ms linear' : 'none'
                                    }}
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
