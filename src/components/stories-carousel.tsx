import Image from "next/image";
import { mockStories } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

export function StoriesCarousel() {
  return (
    <Carousel
      opts={{
        align: "start",
        direction: "rtl",
      }}
      className="w-full"
    >
      <CarouselContent>
        {mockStories.map((story) => (
          <CarouselItem key={story.id} className="basis-1/4 md:basis-1/5 lg:basis-1/6">
            <div className="p-1">
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
                  <p className="text-xs font-semibold text-white hidden md:block">{story.user.name}</p>
                </div>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
