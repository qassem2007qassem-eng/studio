
import Image from "next/image";
import Link from "next/link";
import { mockStories, mockUsers } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StoryPage({ params }: { params: { id: string } }) {
    // In a real app, you'd fetch the story by ID.
    // For now, we'll find it in the mock data.
    const story = mockStories.find(s => s.id === params.id);
    const user = mockUsers.find(u => u.name === story?.user.name);

    if (!story || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
                <div className="text-center">
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
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="relative aspect-[9/16] w-full max-w-md h-full max-h-[90vh] rounded-2xl overflow-hidden bg-muted">
                <Image
                    src={story.imageUrl}
                    alt={`Story by ${story.user.name}`}
                    fill
                    className="object-cover"
                />

                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/50 to-transparent">
                    <div className="h-1 bg-white/30 rounded-full w-full mb-2">
                         <Progress value={33} className="h-1 [&>div]:bg-white" />
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

                {/* Optional: Story content text if it exists */}
                {/* <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-center text-2xl font-bold drop-shadow-lg">
                    <p>النص هنا</p>
                </div> */}
            </div>
        </div>
    );
}

