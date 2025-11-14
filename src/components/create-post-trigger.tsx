
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type User as UserType } from "@/lib/types";
import { getCurrentUserProfile } from "@/services/user-service";
import { Skeleton } from "./ui/skeleton";

export function CreatePostTrigger() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [userData, setUserData] = useState<UserType | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getCurrentUserProfile().then(profile => {
        if (profile) {
          setUserData(profile as UserType);
        }
        setIsDataLoading(false);
      });
    } else if (!isUserLoading) {
       setIsDataLoading(false);
    }
  }, [user, isUserLoading]);

  if (isUserLoading || isDataLoading) {
    return (
        <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
                <Skeleton className="h-10 w-full rounded-full" />
            </div>
        </div>
    );
  }

  if (!user || !userData) {
    return null;
  }

  const username = userData.username;
  const displayName = userData.name;

  return (
    <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
      <Link href={`/home/profile/${username}`}>
        <Avatar>
          <AvatarImage alt={displayName || ""} />
          <AvatarFallback>{displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
        </Avatar>
      </Link>
      <div 
        className="flex-1 cursor-pointer"
        onClick={() => router.push('/home/create-post')}
      >
         <div className="w-full rounded-full bg-muted px-4 py-2 text-muted-foreground hover:bg-secondary transition-colors">
            {`بماذا تفكر يا ${displayName?.split(' ')[0] || ''}؟`}
         </div>
      </div>
    </div>
  );
}
