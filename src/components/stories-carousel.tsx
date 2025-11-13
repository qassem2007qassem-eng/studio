
'use client';

import Image from "next/image";
import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardFooter } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Link from "next/link";
import { useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, where, Timestamp } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { type Story } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { useMemo, useEffect, useState } from "react";
import { getCurrentUserProfile } from "@/services/user-service";
import { cn } from "@/lib/utils";

// Helper to group stories by userId
const groupStoriesByUser = (stories: Story[]): { [userId: string]: Story[] } => {
    if (!stories) return {};
    return stories.reduce((acc, story) => {
        if (!acc[story.userId]) {
            acc[story.userId] = [];
        }
        acc[story.userId].push(story);
        // Sort each user's stories by creation date
        acc[story.userId].sort((a, b) => ((a.createdAt as Timestamp)?.toMillis() || 0) - ((b.createdAt as Timestamp)?.toMillis() || 0));
        return acc;
    }, {} as { [userId: string]: Story[] });
};


export function StoriesCarousel() {
    const { user, isUserLoading } = useUser();
    // const { firestore } = useFirebase();
    // const [following, setFollowing] = useState<string[] | null>(null);

    // // 1. Fetch current user's following list
    // useEffect(() => {
    //     if (user) {
    //         getCurrentUserProfile().then(profile => {
    //             const ownId = profile?.id || user.uid;
    //             // Ensure user's own ID is in the list to see their own stories/create button
    //             const followingList = profile?.following || [];
    //             if (!followingList.includes(ownId)) {
    //                 followingList.unshift(ownId);
    //             }
    //             setFollowing(followingList);
    //         });
    //     } else {
    //         setFollowing([]);
    //     }
    // }, [user]);

    // // 2. Build the query for stories based on the following list
    // const storiesQuery = useMemoFirebase(() => {
    //     if (!firestore || following === null || following.length === 0) return null;
        
    //     const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
        
    //     // Firestore 'in' queries are limited to 30 items.
    //     const queryableFollowing = following.slice(0, 30);

    //     return query(
    //         collection(firestore, 'stories'), 
    //         where("createdAt", ">=", twentyFourHoursAgo),
    //         where("userId", "in", queryableFollowing)
    //     );
    // }, [firestore, following]);

    // const { data: stories, isLoading, error } = useCollection<Story>(storiesQuery);

    // useEffect(() => {
    //   if (error) {
    //     console.error("Error fetching stories:", error);
    //   }
    // }, [error]);

    // const groupedStories = useMemo(() => groupStoriesByUser(stories || []), [stories]);
    
    // // Create an ordered list of story groups based on the `following` array to maintain order
    // const storyGroups = useMemo(() => {
    //     if (!following || !groupedStories) return [];
    //     // Map over the `following` list to preserve the order and pick the corresponding story group.
    //     return following
    //         .map(userId => groupedStories[userId])
    //         .filter(Boolean); // Filter out users who have no stories
    // }, [groupedStories, following]);
    
    // const isDataLoading = isUserLoading || following === null || (following.length > 0 && isLoading);

    if (isUserLoading) {
        return (
            <Carousel opts={{ align: "start", direction: "rtl" }} className="w-full">
                <CarouselContent>
                    {[...Array(5)].map((_, index) => (
                        <CarouselItem key={index} className="basis-1/3 md:basis-1/4 lg:basis-1/5">
                            <div className="p-1">
                                <Skeleton className="aspect-[9/16] w-full rounded-lg" />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        );
    }
  
    if (!user) {
        return null;
    }

  return (
    <Card className="p-2">
        <Carousel opts={{ align: "start", direction: "rtl", dragFree: true }} className="w-full">
            <CarouselContent className="-ms-2">
                <CarouselItem className="basis-1/3 md:basis-1/4 lg:basis-1/5 ps-2">
                    <div className="p-0 h-full">
                      <Link href="/home/stories/create" className="block h-full">
                        <Card className="relative aspect-[9/16] w-full overflow-hidden rounded-lg group flex flex-col items-center justify-end bg-background hover:bg-muted/80 transition-colors h-full">
                            <div className="relative w-full h-3/4">
                                {(user.photoURL) ? (
                                <Image src={user.photoURL} alt="Add story" fill className="object-cover"/>
                                ) : (
                                <div className="w-full h-full bg-muted"></div>
                                )}
                            </div>

                            <CardFooter className="p-2 text-center bg-card w-full h-1/4 flex flex-col justify-end">
                                <p className="text-xs font-semibold text-foreground truncate">إنشاء قصة</p>
                            </CardFooter>
                            
                            <div className="absolute top-3/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center border-4 border-card">
                                    <Plus className="h-6 w-6 text-primary-foreground" />
                                </div>
                            </div>
                        </Card>
                      </Link>
                    </div>
                </CarouselItem>
                {/* {isDataLoading ? (
                     [...Array(4)].map((_, index) => (
                        <CarouselItem key={index} className="basis-1/3 md:basis-1/4 lg:basis-1/5 ps-2">
                            <div className="p-1">
                                <Skeleton className="aspect-[9/16] w-full rounded-lg" />
                            </div>
                        </CarouselItem>
                    ))
                ) : storyGroups.map((userStories) => {
                    if (!userStories || userStories.length === 0) return null;
                    const firstStory = userStories[0];
                    if (!firstStory) return null;
                    
                    // Don't show the user's own story group here if they have no stories other than the "create" button
                    if (firstStory.userId === user.uid && userStories.length === 0) return null;


                    // Find the first story of the user to link to
                    const linkToStoryId = firstStory.id;

                    return (
                        <CarouselItem key={firstStory.userId} className="basis-1/3 md:basis-1/4 lg:basis-1/5 ps-2">
                            <div className="p-0">
                            <Link href={`/home/stories/${linkToStoryId}`}>
                                <Card className="relative aspect-[9/16] w-full overflow-hidden rounded-lg group">
                                    {firstStory.type === 'image' && firstStory.contentUrl ? (
                                        <Image
                                            src={firstStory.contentUrl}
                                            alt={firstStory.user.name || ''}
                                            fill
                                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            data-ai-hint="story photo"
                                        />
                                    ) : (
                                        <div className={cn("w-full h-full flex items-center justify-center", firstStory.backgroundColor)}>
                                            <p className="text-white font-bold text-lg text-center p-2 break-words line-clamp-3">
                                                {firstStory.text}
                                            </p>
                                        </div>
                                    )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <Avatar className="absolute top-3 right-3 h-10 w-10 border-4 border-primary">
                                    <AvatarImage src={firstStory.user.avatarUrl || undefined} />
                                    <AvatarFallback>{firstStory.user.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <p className="absolute bottom-2 left-0 right-0 text-center text-xs font-semibold text-white drop-shadow-md px-1 truncate">{firstStory.user.name}</p>
                                </Card>
                            </Link>
                            </div>
                        </CarouselItem>
                    )
                })} */}
            </CarouselContent>
        </Carousel>
    </Card>
  );
}
