
"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const onboardingStep = {
  image: "https://l.top4top.io/p_36040oexf1.jpg",
  imageHint: "students social educational",
  title: "مرحباً بك في مجمع الطلاب السوري",
  description:
    "منصة اجتماعية وتعليمية مخصصة للطلاب السوريين للتواصل، مشاركة المعرفة، والحصول على الدعم.",
};

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="mx-auto w-full max-w-md overflow-hidden">
        <div className="relative h-64 w-full bg-muted">
          <Image
            src={onboardingStep.image}
            alt={onboardingStep.title}
            data-ai-hint={onboardingStep.imageHint}
            fill
            className="object-cover"
            priority
          />
        </div>
        <CardContent className="p-8 text-center">
          <h2 className="mb-2 text-2xl font-bold font-headline">
            {onboardingStep.title}
          </h2>
          <p className="text-muted-foreground">{onboardingStep.description}</p>
          <Button asChild className="mt-8 w-full">
            <Link href="/login">ابدأ الآن</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
