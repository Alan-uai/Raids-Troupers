// src/ai/flows/generate-raid-announcement.ts
'use server';

/**
 * @fileOverview A flow that generates a raid announcement message given a prompt.
 *
 * - generateRaidAnnouncement - A function that generates the raid announcement message.
 * - GenerateRaidAnnouncementInput - The input type for the generateRaidAnnouncement function.
 * - GenerateRaidAnnouncementOutput - The return type for the generateRaidAnnouncement function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRaidAnnouncementInputSchema = z.object({
  prompt: z.string().describe('A prompt to generate the raid announcement message.'),
});
export type GenerateRaidAnnouncementInput = z.infer<typeof GenerateRaidAnnouncementInputSchema>;

const GenerateRaidAnnouncementOutputSchema = z.object({
  announcement: z.string().describe('The generated raid announcement message.'),
});
export type GenerateRaidAnnouncementOutput = z.infer<typeof GenerateRaidAnnouncementOutputSchema>;

export async function generateRaidAnnouncement(input: GenerateRaidAnnouncementInput): Promise<GenerateRaidAnnouncementOutput> {
  return generateRaidAnnouncementFlow(input);
}

const generateRaidAnnouncementPrompt = ai.definePrompt({
  name: 'generateRaidAnnouncementPrompt',
  input: {schema: GenerateRaidAnnouncementInputSchema},
  output: {schema: GenerateRaidAnnouncementOutputSchema},
  prompt: `Generate a raid announcement message based on the following prompt: {{{prompt}}}`,
});

const generateRaidAnnouncementFlow = ai.defineFlow(
  {
    name: 'generateRaidAnnouncementFlow',
    inputSchema: GenerateRaidAnnouncementInputSchema,
    outputSchema: GenerateRaidAnnouncementOutputSchema,
  },
  async input => {
    const {output} = await generateRaidAnnouncementPrompt(input);
    return output!;
  }
);
