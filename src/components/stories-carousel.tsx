
'use client';

import Image from "next/image";
import { PlusCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Link from "next/link";
import { useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, where, Timestamp } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { type Story } from "@/lib/types";

export function StoriesCarousel() {
    const { user, isUserLoading } = useUser();
    const { firestore } = useFirebase();

    const storiesCollection = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'stories');
    }, [firestore]);

    // IMPORTANT: Do not run the query until auth state is determined and a user is present.
    const storiesQuery = useMemoFirebase(() => {
        if (!storiesCollection || isUserLoading || !user) {
            return null; // Return null if user is not yet authenticated or firestore is not ready
        }
        const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
        return query(storiesCollection, where("createdAt", ">=", twentyFourHoursAgo), orderBy("createdAt", "desc"));
    }, [storiesCollection, isUserLoading, user]);

    const { data: stories, isLoading } = useCollection<Story>(storiesQuery);

  
  if (isUserLoading) {
    // You might want to show a loading skeleton here
    return null;
  }
  
  if (!user) {
    return null;
  }

  return (
    <Carousel
      opts={{
        align: "start",
        direction: "rtl",
      }}
      className="w-full"
    >
      <CarouselContent>
        <CarouselItem className="basis-1/4 md:basis-1/5 lg:basis-1/6">
            <div className="p-1">
              <Link href="/home/stories/create" className="block">
                <Card className="relative aspect-[9/16] w-full overflow-hidden rounded-lg group flex flex-col items-center justify-end bg-background hover:bg-muted/80 transition-colors">
                    {user.photoURL ? (
                      <Image src={user.photoURL} alt="Add story" fill className="object-cover"/>
                    ) : (
                      <div className="w-full h-full bg-muted"></div>
                    )}
                    <div className="absolute inset-0 bg-black/30"></div>
                    <div className="relative z-10 p-2 w-full text-center bg-background/80 backdrop-blur-sm">
                         <p className="text-xs font-semibold text-foreground truncate">إضافة قصة</p>
                    </div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                            <PlusCircle className="h-6 w-6 text-primary-foreground" />
                        </div>
                    </div>
                </Card>
              </Link>
            </div>
          </CarouselItem>
        {stories?.map((story) => (
          <CarouselItem key={story.id} className="basis-1/4 md:basis-1/5 lg:basis-1/6">
            <div className="p-1">
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
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    <Avatar className="h-8 w-8 border-2 border-primary">
                      <AvatarImage src={story.user.avatarUrl} />
                      <AvatarFallback>{story.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                   <p className="absolute bottom-3 left-3 text-xs font-semibold text-white drop-shadow-md">{story.user.name}</p>
                </Card>
              </Link>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}


