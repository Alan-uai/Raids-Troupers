"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { generateRaidAnnouncement } from "@/ai/flows/generate-raid-announcement";
import { sendToDiscord } from "@/services/discord-service";
import { Bot, Loader2, User, Sparkles, AlertCircle, Send } from "lucide-react";
import Image from "next/image";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  level: z.string().min(1, "Level is required."),
  difficulty: z.string().min(1, "Difficulty is required."),
  prompt: z.string().min(10, "Prompt must be at least 10 characters."),
});

type FormValues = z.infer<typeof formSchema>;

type AnnouncementData = {
  text: string;
  level: string;
  difficulty: string;
};

export default function RaidAnnouncer() {
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      level: "",
      difficulty: "",
      prompt: "Looking for players to join a raid. We need a good team to clear it quickly!",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setError(null);
    setAnnouncement(null);
    try {
      const fullPrompt = `Raid Level: ${values.level}, Difficulty: ${values.difficulty}. Prompt: ${values.prompt}`;
      const result = await generateRaidAnnouncement({ prompt: fullPrompt });
      setAnnouncement({
        text: result.announcement,
        level: values.level,
        difficulty: values.difficulty,
      });
    } catch (e) {
      setError("Failed to generate announcement. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendToDiscord() {
    if (!announcement) return;

    setIsSending(true);
    const result = await sendToDiscord({
      level: announcement.level,
      difficulty: announcement.difficulty,
      userNickname: 'Raid Master', // Placeholder
      userAvatar: 'https://placehold.co/100x100.png', // Placeholder
      robloxProfileUrl: 'https://www.roblox.com', // Placeholder
    });
    setIsSending(false);

    if (result.success) {
      toast({
        title: "Sucesso!",
        description: "Anúncio enviado para o Discord.",
        variant: "default",
      });
    } else {
      toast({
        title: "Erro",
        description: result.error || "Falha ao enviar anúncio para o Discord.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Raid Announcement Generator</CardTitle>
          <CardDescription>
            Fill in the raid details and let AI craft the perfect announcement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raid Level</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Hard" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Announcement Prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Looking for strong players for a quick run..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide some context for the AI to generate the announcement.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Announcement
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight font-headline">Preview</h2>
        {error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        {isLoading && (
            <Card className="flex items-center justify-center p-10">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Generating your announcement...</p>
                </div>
            </Card>
        )}
        {announcement ? (
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-start gap-4">
               <Avatar className="w-12 h-12 border-2 border-primary">
                  <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="warrior avatar" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-primary font-bold">Raid Master</CardTitle>
                        <Badge variant="secondary">Player</Badge>
                    </div>
                    <CardDescription className="text-xs">
                        Posted just now in #announcements
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <p className="whitespace-pre-wrap">{announcement.text}</p>
                <Separator className="my-4"/>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleSendToDiscord} disabled={isSending}>
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2"/>} Announce on Discord
                    </Button>
                </div>
            </CardContent>
          </Card>
        ) : !isLoading && !error && (
            <Card className="flex items-center justify-center p-10 border-dashed">
                 <div className="text-center text-muted-foreground">
                    <p>Your generated announcement will appear here.</p>
                </div>
            </Card>
        )}
      </div>
    </div>
  );
}
