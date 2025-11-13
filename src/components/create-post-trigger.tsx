"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function CreatePostTrigger() {
  const { user } = useUser();
  const router = useRouter();

  if (!user) {
    return null;
  }

  const username = user.email?.split('@')[0]?.toLowerCase();

  return (
    <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
      <Link href={`/home/profile/${username}`}>
        <Avatar>
          <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} />
          <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
        </Avatar>
      </Link>
      <div 
        className="flex-1 cursor-pointer"
        onClick={() => router.push('/home/create-post')}
      >
         <div className="w-full rounded-full bg-muted px-4 py-2 text-muted-foreground hover:bg-secondary transition-colors">
            {`بماذا تفكر يا ${user.displayName?.split(' ')[0] || ''}؟`}
         </div>
      </div>
    </div>
  );
}
