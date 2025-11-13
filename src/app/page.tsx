
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";

const onboardingSteps = [
  {
    image: "https://storage.googleapis.com/proud-graph-429913-h3-assets/community_illustration.svg",
    imageHint: "community connection",
    title: "مرحباً بك في مجمع الطلاب السوري",
    description:
      "منصة اجتماعية وتعليمية مخصصة للطلاب السوريين للتواصل، مشاركة المعرفة، والحصول على الدعم.",
  },
  {
    image: "https://storage.googleapis.com/proud-graph-429913-h3-assets/ai_features_illustration.svg",
    imageHint: "ai features",
    title: "ميزات ذكاء اصطناعي مبتكرة",
    description:
      "استفد من أدوات الذكاء الاصطناعي لتلخيص الموارد التعليمية، والحصول على المساعدة في دراستك، والمزيد.",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const isLastStep = step === onboardingSteps.length - 1;

  const handleNext = () => {
    if (!isLastStep) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const currentStep = onboardingSteps[step];

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="mx-auto w-full max-w-md overflow-hidden">
        <div className="relative h-64 w-full bg-white p-4">
          <Image
            src={currentStep.image}
            alt={currentStep.title}
            data-ai-hint={currentStep.imageHint}
            fill
            className="object-contain"
            priority
          />
        </div>
        <CardContent className="p-8 text-center">
          <h2 className="mb-2 text-2xl font-bold font-headline">
            {currentStep.title}
          </h2>
          <p className="text-muted-foreground">{currentStep.description}</p>

          <div className="mt-8 flex items-center justify-center space-x-2">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full ${
                  step === index ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            {step > 0 ? (
                <Button variant="outline" onClick={handlePrev}>
                    <ArrowLeft className="me-2" />
                    السابق
                </Button>
            ) : <div />}

            {isLastStep ? (
              <Button asChild className="col-start-2">
                <Link href="/login">ابدأ الآن</Link>
              </Button>
            ) : (
              <Button onClick={handleNext} className={step === 0 ? "col-span-2" : ""}>
                التالي
                <ArrowRight className="ms-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
