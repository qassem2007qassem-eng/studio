
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCollection, useMemoFirebase, useFirebase } from "@/firebase";
import { collection, query, where, Timestamp, orderBy } from "firebase/firestore";
import { type Story } from "@/lib/types";
import { formatDistanceToNow, cn } from "@/lib/utils";

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
    const initialStoryId = typeof params.id === 'string' ? params.id : '';

    const { firestore } = useFirebase();

    // Fetch all active stories to create a global playlist, sorted by user and then time
    const storiesCollection = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'stories');
    }, [firestore]);

    const storiesQuery = useMemoFirebase(() => {
        if (!storiesCollection) return null;
        const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
        return query(storiesCollection, where("createdAt", ">=", twentyFourHoursAgo), orderBy("createdAt", "asc"));
    }, [storiesCollection]);

    const { data: allStories, isLoading: playlistLoading } = useCollection<Story>(storiesQuery);
    
    // Group all stories by user
    const groupedStories = useMemo(() => {
        if (!allStories) return {};
        return allStories.reduce((acc, story) => {
            if (!acc[story.userId]) {
                acc[story.userId] = [];
            }
            acc[story.userId].push(story);
            return acc;
        }, {} as { [userId: string]: Story[] });
    }, [allStories]);
    
    // Find the user and index for the initial story
    const [currentStory, setCurrentStory] = useState<Story | null>(null);
    const [currentUserStoryGroup, setCurrentUserStoryGroup] = useState<Story[]>([]);
    const [currentStoryIndexInGroup, setCurrentStoryIndexInGroup] = useState(0);

    // Effect to set the initial story and its group
    useEffect(() => {
        if (initialStoryId && allStories) {
            const story = allStories.find(s => s.id === initialStoryId);
            if (story) {
                const userGroup = groupedStories[story.userId];
                const storyIndex = userGroup.findIndex(s => s.id === initialStoryId);
                
                setCurrentStory(story);
                setCurrentUserStoryGroup(userGroup);
                setCurrentStoryIndexInGroup(storyIndex);
            } else {
                // Story not found or expired, go home
                router.push('/home');
            }
        }
    }, [initialStoryId, allStories, groupedStories, router]);


    const [progress, setProgress] = useState(0);

    // This effect handles the timer and auto-advancing stories
    useEffect(() => {
        if (!currentStory) return;

        setProgress(0); // Reset progress for new story

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
    }, [currentStory]); // Depend on the current story object

    const handleNextStory = () => {
        // Try to go to the next story in the current user's group
        if (currentStoryIndexInGroup < currentUserStoryGroup.length - 1) {
            const nextStory = currentUserStoryGroup[currentStoryIndexInGroup + 1];
            router.push(`/home/stories/${nextStory.id}`);
        } else {
            // End of user's stories, try to go to the next user's stories
            const userGroupIds = Object.keys(groupedStories);
            const currentUserGroupId = currentStory?.userId;
            const currentUserGroupIndex = userGroupIds.findIndex(id => id === currentUserGroupId);

            if (currentUserGroupIndex < userGroupIds.length - 1) {
                const nextUserGroupId = userGroupIds[currentUserGroupIndex + 1];
                const nextUserGroup = groupedStories[nextUserGroupId];
                router.push(`/home/stories/${nextUserGroup[0].id}`);
            } else {
                // End of all stories, go home
                router.push('/home');
            }
        }
    };

    const handlePrevStory = () => {
        // Try to go to the previous story in the current user's group
        if (currentStoryIndexInGroup > 0) {
            const prevStory = currentUserStoryGroup[currentStoryIndexInGroup - 1];
            router.push(`/home/stories/${prevStory.id}`);
        } else {
            // Start of user's stories, try to go to the previous user's last story
            const userGroupIds = Object.keys(groupedStories);
            const currentUserGroupId = currentStory?.userId;
            const currentUserGroupIndex = userGroupIds.findIndex(id => id === currentUserGroupId);
            
            if (currentUserGroupIndex > 0) {
                const prevUserGroupId = userGroupIds[currentUserGroupIndex - 1];
                const prevUserGroup = groupedStories[prevUserGroupId];
                router.push(`/home/stories/${prevUserGroup[prevUserGroup.length - 1].id}`);
            }
            // else: at the very first story, do nothing
        }
    };
    
    if (playlistLoading || !currentStory) {
        return <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center text-white">Loading...</div>;
    }
    
    const storyDate = safeToDate(currentStory.createdAt);

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={(e) => {
            const target = e.target as HTMLElement;
            // Close if clicking on the background, but not on the navigation buttons
            if (target.getAttribute('data-story-container')) {
                router.push('/home');
            }
        }}>
            <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-20" onClick={handlePrevStory}>
                <ChevronLeft className="h-8 w-8" />
            </Button>
            
            <div data-story-container className="relative aspect-[9/16] w-full max-w-md h-full max-h-[90vh] rounded-2xl overflow-hidden flex items-center justify-center bg-muted">
                {currentStory.type === 'image' && currentStory.contentUrl ? (
                    <Image
                        src={currentStory.contentUrl}
                        alt={`Story by ${currentStory.user.name}`}
                        fill
                        className="object-cover"
                        priority
                        key={currentStory.id}
                    />
                ) : (
                    <div className={cn("w-full h-full flex items-center justify-center", currentStory.backgroundColor)}>
                        <p className="text-white font-bold text-3xl text-center p-8 break-words">
                            {currentStory.text}
                        </p>
                    </div>
                )}

                <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/50 to-transparent">
                    <div className="flex gap-1 mb-2">
                        {currentUserStoryGroup.map((s, index) => (
                            <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                                <div 
                                    className="h-1 bg-white"
                                    style={{ 
                                        width: `${index < currentStoryIndexInGroup ? 100 : (index === currentStoryIndexInGroup ? progress : 0)}%`,
                                        transition: index === currentStoryIndexInGroup ? 'width 100ms linear' : 'none'
                                    }}
                                ></div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <Avatar className="h-10 w-10 border-2 border-white">
                            <AvatarImage src={currentStory.user.avatarUrl || undefined} alt={currentStory.user.name} />
                            <AvatarFallback>{currentStory.user.name.charAt(0)}</AvatarFallback>
                         </Avatar>
                         <div>
                            <Link href={`/home/profile/${currentStory.user.username.toLowerCase()}`} className="font-bold text-white text-sm hover:underline">
                                {currentStory.user.name}
                            </Link>
                            <p className="text-xs text-gray-300">{storyDate ? formatDistanceToNow(storyDate) : ''}</p>
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
