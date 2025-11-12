'use server';

/**
 * @fileOverview Summarizes educational resources from a given URL.
 *
 * - summarizeResource - A function that takes a URL and returns a summary of the content.
 * - SummarizeResourceInput - The input type for the summarizeResource function (just the URL).
 * - SummarizeResourceOutput - The return type for the summarizeResource function (the summary string).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {extractContent} from '@/services/page-scraper';

const SummarizeResourceInputSchema = z.object({
  url: z.string().url().describe('URL of the educational resource to summarize.'),
});
export type SummarizeResourceInput = z.infer<typeof SummarizeResourceInputSchema>;

const SummarizeResourceOutputSchema = z.object({
  summary: z.string().describe('A summary of the educational resource.'),
});
export type SummarizeResourceOutput = z.infer<typeof SummarizeResourceOutputSchema>;

export async function summarizeResource(input: SummarizeResourceInput): Promise<SummarizeResourceOutput> {
  return summarizeResourceFlow(input);
}

const summarizeResourcePrompt = ai.definePrompt({
  name: 'summarizeResourcePrompt',
  input: {schema: SummarizeResourceInputSchema},
  output: {schema: SummarizeResourceOutputSchema},
  prompt: `You are an expert summarizer of educational content.  Summarize the content from the following web page, extracting the core concepts.  The content is:

{{content}}`,
});

const summarizeResourceFlow = ai.defineFlow(
  {
    name: 'summarizeResourceFlow',
    inputSchema: SummarizeResourceInputSchema,
    outputSchema: SummarizeResourceOutputSchema,
  },
  async input => {
    const content = await extractContent(input.url);
    const {output} = await summarizeResourcePrompt({content});
    return output!;
  }
);
