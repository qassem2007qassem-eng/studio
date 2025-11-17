
"use client";

import { useFormState, useFormStatus } from 'react-dom';
import { handleSummarize, type FormState } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const initialState: FormState = {
    summary: null,
    error: null,
};

function SubmitButton() {  
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : 'تلخيص'}
    </Button>
  );
}

export function SummarizeForm() {
  const [state, formAction] = useFormState(handleSummarize, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.error) {
        toast({
            title: "خطأ في التلخيص",
            description: state.error,
            variant: "destructive",
        });
    }
  }, [state.error, toast]);


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>تلخيص الموارد التعليمية</CardTitle>
          <CardDescription>
            أدخل رابطًا لمورد تعليمي (مقالة، تدوينة، إلخ) وسيقوم الذكاء الاصطناعي بتلخيص المفاهيم الأساسية لك.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="url">رابط المصدر</Label>
                <Input name="url" id="url" type="url" placeholder="https://example.com/article" required />
              </div>
          </CardContent>
          <CardFooter>
            <SubmitButton />
          </CardFooter>
        </form>
      </Card>
      
      {state.summary && (
        <Card>
            <CardHeader>
                <CardTitle>الخلاصة</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="whitespace-pre-wrap">{state.summary}</p>
            </CardContent>
        </Card>
      )}
    </>
  );
}
