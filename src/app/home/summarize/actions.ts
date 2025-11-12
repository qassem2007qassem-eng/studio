"use server";
import { summarizeResource, SummarizeResourceInput } from '@/ai/flows/summarize-educational-resources';
import { z } from 'zod';

const schema = z.object({
  url: z.string().url({ message: 'الرجاء إدخال رابط صحيح.' }),
});

export type FormState = {
  summary: string | null;
  error: string | null;
}

export async function handleSummarize(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = schema.safeParse({
    url: formData.get('url'),
  });

  if (!validatedFields.success) {
    return {
        summary: null,
        error: validatedFields.error.flatten().fieldErrors.url?.[0] || 'حدث خطأ غير متوقع.'
    };
  }

  try {
    const result = await summarizeResource(validatedFields.data);
    if(result.summary) {
        return { summary: result.summary, error: null };
    }
    return { summary: null, error: 'لم نتمكن من تلخيص هذا المصدر. حاول مرة أخرى.' };
  } catch (e) {
    console.error(e);
    return { summary: null, error: 'حدث خطأ أثناء الاتصال بالخادم. الرجاء المحاولة مرة أخرى.' };
  }
}
