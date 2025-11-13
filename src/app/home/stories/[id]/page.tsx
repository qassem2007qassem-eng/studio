
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDoc, useCollection, useMemoFirebase, useFirebase } from "@/firebase";
import { doc, collection, query, where, Timestamp, orderBy } from "firebase/firestore";
import { type Story, type User } from "@/lib/types";

const STORY_DURATION = 10000; // 10 seconds per story

const safeToDate = (timestamp: string | Timestamp | Date | undefined | null): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
        return timestamp;
    }
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return null;
        }
        return date;
    } catch (e) {
        return null;
    }
};


export default function StoryPage() {
    const router = useRouter();
    const params = useParams();
    const storyId = typeof params.id === 'string' ? params.id : '';

    const { firestore } = useFirebase();

    // Fetch all active stories to create a playlist
    const storiesCollection = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'stories');
    }, [firestore]);

    const storiesQuery = useMemoFirebase(() => {
        if (!storiesCollection) return null;
        const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
        return query(storiesCollection, where("createdAt", ">=", twentyFourHoursAgo), orderBy("createdAt", "desc"));
    }, [storiesCollection]);

    const { data: storyPlaylist, isLoading: playlistLoading } = useCollection<Story>(storiesQuery);

    const initialStoryIndex = useMemo(() => {
        if (!storyPlaylist) return -1;
        return storyPlaylist.findIndex(s => s.id === storyId)
    }, [storyId, storyPlaylist]);

    const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
    const [progress, setProgress] = useState(0);

     // Set the initial index once the playlist is loaded
    useEffect(() => {
        if (initialStoryIndex !== -1 && currentStoryIndex === -1) {
            setCurrentStoryIndex(initialStoryIndex);
        }
    }, [initialStoryIndex, currentStoryIndex]);

    // This effect handles the timer and auto-advancing stories
    useEffect(() => {
        if (currentStoryIndex === -1 || !storyPlaylist) {
            if(!playlistLoading) router.push('/home');
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
    }, [currentStoryIndex, storyPlaylist, playlistLoading, router]);

    const handleNextStory = () => {
        if (storyPlaylist && currentStoryIndex < storyPlaylist.length - 1) {
            const nextStoryId = storyPlaylist[currentStoryIndex + 1].id;
            router.push(`/home/stories/${nextStoryId}`);
        } else {
            router.push('/home'); // Go home after the last story
        }
    };

    const handlePrevStory = () => {
        if (storyPlaylist && currentStoryIndex > 0) {
            const prevStoryId = storyPlaylist[currentStoryIndex - 1].id;
            router.push(`/home/stories/${prevStoryId}`);
        }
    };
    
    if (playlistLoading || currentStoryIndex === -1) {
        return <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center text-white">Loading...</div>;
    }
    
    const story = storyPlaylist?.[currentStoryIndex];
    const user = story?.user;

    if (!story || !user) {
        // This can happen briefly while redirecting
        return null;
    }

    const storyDate = safeToDate(story.createdAt);


    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={(e) => {
            if (e.target === e.currentTarget) {
                router.push('/home');
            }
        }}>
            <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-20" onClick={handlePrevStory} disabled={currentStoryIndex === 0}>
                <ChevronLeft className="h-8 w-8" />
            </Button>
            
            <div className="relative aspect-[9/16] w-full max-w-md h-full max-h-[90vh] rounded-2xl overflow-hidden bg-muted">
                <Image
                    src={story.contentUrl}
                    alt={`Story by ${story.user.name}`}
                    fill
                    className="object-cover"
                    priority
                    key={story.id}
                />

                <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/50 to-transparent">
                    <div className="flex gap-1 mb-2">
                        {storyPlaylist.map((s, index) => (
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
                            <Link href={`/home/profile/${user.username.toLowerCase()}`} className="font-bold text-white text-sm hover:underline">
                                {story.user.name}
                            </Link>
                            <p className="text-xs text-gray-300">{storyDate?.toLocaleString()}</p>
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

             <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-20" onClick={handleNextStory}>
                <ChevronRight className="h-8 w-8" />
            </Button>
        </div>
    );
}
