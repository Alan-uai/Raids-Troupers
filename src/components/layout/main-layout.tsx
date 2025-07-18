// src/components/layout/main-layout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone, MessageCircle, Bot, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/settings", icon: Settings, label: "Configurações" },
  { href: "/raid-announcer", icon: Megaphone, label: "Raid Announcer" },
  { href: "/chatbot", icon: MessageCircle, label: "Chatbot" },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
            <Bot className="h-6 w-6 text-primary" />
            <span className="sr-only">RaidAnnouncer</span>
          </Link>
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "transition-colors hover:text-foreground",
                (pathname === item.href || (item.href === "/settings" && pathname === "/"))
                  ? "text-foreground font-bold"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {/* Mobile menu could be added here if needed */}
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
  );
}
