'use server';

/**
 * @fileOverview An AI chatbot for answering questions about the Fruit Reborn game.
 *
 * - askChatbot - A function that takes a question and returns an answer.
 * - AskChatbotInput - The input type for the askChatbot function.
 * - AskChatbotOutput - The return type for the askChatbot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AskChatbotInputSchema = z.object({
  question: z.string().describe('The question to ask the chatbot.'),
});
export type AskChatbotInput = z.infer<typeof AskChatbotInputSchema>;

const AskChatbotOutputSchema = z.object({
  answer: z.string().describe('The chatbot answer to the question.'),
});
export type AskChatbotOutput = z.infer<typeof AskChatbotOutputSchema>;

export async function askChatbot(input: AskChatbotInput): Promise<AskChatbotOutput> {
  return askChatbotFlow(input);
}

const gameInfoTool = ai.defineTool({
  name: 'getFruitRebornWiki',
  description: 'Retrieves information from the Fruit Reborn Wiki to answer questions about the game.',
  inputSchema: z.object({
    query: z.string().describe('The search query for the Fruit Reborn Wiki.'),
  }),
  outputSchema: z.string(),
}, async (input) => {
  // Placeholder implementation - replace with actual wiki retrieval logic
  return `Information from Fruit Reborn Wiki related to ${input.query}`;
});

const prompt = ai.definePrompt({
  name: 'askChatbotPrompt',
  tools: [gameInfoTool],
  input: {schema: AskChatbotInputSchema},
  output: {schema: AskChatbotOutputSchema},
  prompt: `You are a chatbot that answers questions about the Fruit Reborn game.

  Use the getFruitRebornWiki tool to get information about the game.

  Question: {{{question}}}
  `,
});

const askChatbotFlow = ai.defineFlow(
  {
    name: 'askChatbotFlow',
    inputSchema: AskChatbotInputSchema,
    outputSchema: AskChatbotOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
