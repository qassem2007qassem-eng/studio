
import Link from "next/link";
import { PlusCircle, BookText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "./ui/card";

export function MainNav() {
  const navLinks = [
    { href: "/home/stories/create", label: "إنشاء قصة", icon: PlusCircle },
    { href: "/home/summarize", label: "ملخص الموارد", icon: BookText },
    { href: "/home/settings", label: "الإعدادات", icon: Settings },
  ];

  return (
    <Card className="p-4">
      <nav className="flex flex-col gap-2">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "justify-start gap-3"
            )}
          >
            <link.icon className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{link.label}</span>
          </Link>
        ))}
      </nav>
    </Card>
  );
}
