
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirebase, useUser } from "@/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type User as UserType } from "@/lib/types";
import { doc, getDoc } from "firebase/firestore";

export function CreatePostTrigger() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();
  const [userData, setUserData] = useState<UserType | null>(null);

  useEffect(() => {
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then((doc) => {
        if (doc.exists()) {
          setUserData(doc.data() as UserType);
        }
      });
    }
  }, [user, firestore]);

  if (!user || !userData) {
    return null;
  }

  const username = userData.username;

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

    