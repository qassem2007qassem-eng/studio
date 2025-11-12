
import Image from "next/image";
import { PlusCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Link from "next/link";

export function StoriesCarousel() {
    const currentUser = {
        avatarUrl: "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxzdHVkZW50JTIwcG9ydHJhaXR8ZW58MHx8fHwxNzYyOTA4ODYzfDA&ixlib=rb-4.1.0&q=80&w=1080",
    };
    const mockStories: any[] = [];
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
                    <Image src={currentUser.avatarUrl} alt="Add story" fill className="object-cover"/>
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
        {mockStories.map((story) => (
          <CarouselItem key={story.id} className="basis-1/4 md:basis-1/5 lg:basis-1/6">
            <div className="p-1">
              <Link href={`/home/stories/${story.id}`}>
                <Card className="relative aspect-[9/16] w-full overflow-hidden rounded-lg group">
                  <Image
                    src={story.imageUrl}
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
