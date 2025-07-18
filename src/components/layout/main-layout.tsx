"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone, MessageCircle, Bot } from "lucide-react";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                    <Bot className="size-6 text-primary" />
                </Link>
             </Button>
            <h1 className="text-lg font-semibold font-headline">RaidAnnouncer</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/"}
                tooltip="Raid Announcer"
              >
                <Link href="/">
                  <Megaphone />
                  <span>Raid Announcer</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/chatbot"}
                tooltip="Chatbot"
              >
                <Link href="/chatbot">
                  <MessageCircle />
                  <span>Chatbot</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sticky top-0 z-10 md:hidden">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold font-headline">RaidAnnouncer</h1>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
