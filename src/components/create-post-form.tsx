"use client";

import { ImageIcon, Paperclip, Smile } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function CreatePostForm() {
    const user = {
        name: "آلاء محمد",
        avatarUrl: "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxzdHVkZW50JTIwcG9ydHJhaXR8ZW58MHx8fHwxNzYyOTA4ODYzfDA&ixlib=rb-4.1.0&q=80&w=1080",
    };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Avatar className="hidden sm:block">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="w-full space-y-4">
            <Textarea
              placeholder="بماذا تفكر يا آلاء؟"
              className="border-0 focus-visible:ring-0 ring-offset-0 text-lg"
              rows={3}
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2 text-muted-foreground">
                <Button variant="ghost" size="icon">
                  <ImageIcon className="h-5 w-5" />
                  <span className="sr-only">Add image</span>
                </Button>
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-5 w-5" />
                  <span className="sr-only">Attach file</span>
                </Button>
                <Button variant="ghost" size="icon">
                  <Smile className="h-5 w-5" />
                  <span className="sr-only">Add emoji</span>
                </Button>
              </div>
              <Button>نشر</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
