"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { askChatbot } from "@/ai/flows/general-chatbot";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bot, Loader2, SendHoriz, User } from "lucide-react";

const chatSchema = z.object({
  message: z.string().min(1, "Message cannot be empty."),
});

type ChatFormValues = z.infer<typeof chatSchema>;

type Message = {
  role: "user" | "bot";
  text: string;
};

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const form = useForm<ChatFormValues>({
    resolver: zodResolver(chatSchema),
    defaultValues: {
      message: "",
    },
  });

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  async function onSubmit(values: ChatFormValues) {
    const userMessage: Message = { role: "user", text: values.message };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    form.reset();

    try {
      const result = await askChatbot({ question: values.message });
      const botMessage: Message = { role: "bot", text: result.answer };
      setMessages((prev) => [...prev, botMessage]);
    } catch (e) {
      const errorMessage: Message = {
        role: "bot",
        text: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="h-[calc(100vh-8rem)] flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline">Game Assistant</CardTitle>
        <CardDescription>Ask me anything about Fruit Reborn!</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-4",
                  message.role === "user" ? "justify-end" : ""
                )}
              >
                {message.role === "bot" && (
                  <Avatar className="w-8 h-8 border-2 border-primary">
                    <AvatarFallback><Bot className="text-primary" /></AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-md p-3 rounded-lg",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                </div>
                 {message.role === "user" && (
                  <Avatar className="w-8 h-8">
                     <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
               <div className="flex items-start gap-4">
                   <Avatar className="w-8 h-8 border-2 border-primary">
                    <AvatarFallback><Bot className="text-primary" /></AvatarFallback>
                  </Avatar>
                   <div className="max-w-md p-3 rounded-lg bg-muted flex items-center">
                       <Loader2 className="h-5 w-5 animate-spin text-primary" />
                   </div>
               </div>
            )}
          </div>
        </ScrollArea>
        <div className="mt-auto pt-4 border-t">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex items-start gap-2"
            >
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        placeholder="Ask about raid strategies..."
                        autoComplete="off"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="icon" disabled={isLoading}>
                <SendHoriz />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
