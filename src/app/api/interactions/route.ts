// src/app/api/interactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { createRaidAnnouncementFromInteraction } from '@/services/discord-service';
import { askChatbot } from '@/ai/flows/general-chatbot';

async function handleFollowup(interactionToken: string, content: string) {
    const url = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${interactionToken}/messages/@original`;
    await fetch(url, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
    });
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  const rawBody = await req.text();

  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!signature || !timestamp || !publicKey) {
    return new NextResponse('Bad request', { status: 400 });
  }

  const isValid = verifyKey(rawBody, signature, timestamp, publicKey);

  if (!isValid) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === 1) { // PING
    return NextResponse.json({ type: 1 }); // PONG
  }

  if (interaction.type === 2) { // APPLICATION_COMMAND
    const { name, options, token: interactionToken } = interaction.data;
    const user = interaction.member.user;

    if (name === 'raid') {
      const levelOption = options.find((opt: any) => opt.name === 'level_ou_nome');
      const difficultyOption = options.find((opt: any) => opt.name === 'dificuldade');

      const level = levelOption ? levelOption.value : 'Não especificado';
      const difficulty = difficultyOption ? difficultyOption.value : 'Não especificada';
      const userNickname = user.global_name || user.username;
      const userAvatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
      // This is a placeholder, as we can't get a Roblox URL from Discord directly.
      const robloxProfileUrl = 'https://www.roblox.com';

      // We defer the response while we send the message to the channel.
      createRaidAnnouncementFromInteraction({
          level,
          difficulty,
          userNickname,
          userAvatar,
          robloxProfileUrl,
      });

      // Acknowledge the interaction immediately with a deferred response.
      // This tells Discord "I got it, I'm working on it."
      return NextResponse.json({
        type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
      });
    }

    if (name === 'cap') {
      const questionOption = options.find((opt: any) => opt.name === 'pergunta');
      const question = questionOption ? questionOption.value : 'No question provided.';
      
      // Defer response
      const responsePromise = (async () => {
          try {
              const result = await askChatbot({ question });
              await handleFollowup(interaction.token, result.answer);
          } catch (e) {
              console.error(e);
              await handleFollowup(interaction.token, 'Desculpe, não consegui obter uma resposta. Tente novamente.');
          }
      })();

      return NextResponse.json({
          type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
      });
    }
  }

  return new NextResponse('OK');
}
