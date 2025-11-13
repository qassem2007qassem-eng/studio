
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

export function StoriesCarousel() {
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();

    const storiesCollection = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'stories');
    }, [firestore]);

    const storiesQuery = useMemoFirebase(() => {
        if (!storiesCollection || isUserLoading || !user) return null;
        const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
        return query(storiesCollection, where("createdAt", ">=", twentyFourHoursAgo), orderBy("createdAt", "desc"));
    }, [storiesCollection, isUserLoading, user]);

    const { data: stories, isLoading } = useCollection<Story>(storiesQuery);

    if (isUserLoading) {
        return (
            <Carousel opts={{ align: "start", direction: "rtl" }} className="w-full">
                <CarouselContent>
                    {[...Array(5)].map((_, index) => (
                        <CarouselItem key={index} className="basis-1/4 md:basis-1/5 lg:basis-1/6">
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
                                {user.photoURL ? (
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
                {stories?.map((story) => (
                <CarouselItem key={story.id} className="basis-1/3 md:basis-1/4 lg:basis-1/5 ps-2">
                    <div className="p-0">
                    <Link href={`/home/stories/${story.id}`}>
                        <Card className="relative aspect-[9/16] w-full overflow-hidden rounded-lg group">
                        <Image
                            src={story.contentUrl}
                            alt={story.user.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            data-ai-hint="story photo"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <Avatar className="absolute top-3 right-3 h-10 w-10 border-4 border-primary">
                            <AvatarImage src={story.user.avatarUrl} />
                            <AvatarFallback>{story.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <p className="absolute bottom-2 left-0 right-0 text-center text-xs font-semibold text-white drop-shadow-md px-1 truncate">{story.user.name}</p>
                        </Card>
                    </Link>
                    </div>
                </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
    </Card>
  );
}
