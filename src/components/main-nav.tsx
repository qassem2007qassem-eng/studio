
import Link from "next/link";
import { Home, User, BookText, Settings, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "./ui/card";

export function MainNav() {
  const user = getCurrentUser();
  const navLinks = [
    { href: "/home", label: "الصفحة الرئيسية", icon: Home },
    { href: `/home/profile/${user.username}`, label: "الملف الشخصي", icon: User },
    { href: "/home/summarize", label: "ملخص الموارد", icon: BookText },
    { href: "/home/search", label: "بحث", icon: Search },
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
