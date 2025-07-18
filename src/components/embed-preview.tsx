// src/components/embed-preview.tsx

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

interface EmbedPreviewProps {
  level: string;
  difficulty: string;
  userNickname: string;
  userAvatar: string;
  robloxProfileUrl: string;
}

export function EmbedPreview({
  level,
  difficulty,
  userNickname,
  userAvatar,
  robloxProfileUrl,
}: EmbedPreviewProps) {
  // Simulates the Discord embed look
  return (
    <div className="flex w-full max-w-lg rounded bg-[#2B2D31] p-4 pl-5 border-l-4 border-[#666699]">
      <div className="flex flex-col gap-2 w-full">
        {/* Author section */}
        <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
                <AvatarImage src={userAvatar} data-ai-hint="warrior avatar" />
                <AvatarFallback>{userNickname.charAt(0)}</AvatarFallback>
            </Avatar>
            <Link href={robloxProfileUrl} target="_blank" className="text-white font-semibold hover:underline text-sm">
                Anúncio de Raid de {userNickname}
            </Link>
        </div>

        {/* Description */}
        <div className="text-[#dcddde] text-sm">
            <p>
                Gostaria de uma ajuda para superar a Raid <strong className="font-semibold text-white">lvl {level}</strong> na dificuldade <strong className="font-semibold text-white">{difficulty}</strong>.
            </p>
            <p className="mt-2">
                Ficarei grato!
            </p>
        </div>
        
        {/* Footer */}
        <div className="text-[#949aa4] text-xs pt-2">
            RaidAnnouncer Bot
        </div>
      </div>
    </div>
  );
}
