// src/app/api/interactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { sendRaidAnnouncement } from '@/services/discord-service';
import { askChatbot } from '@/ai/flows/general-chatbot';

async function handleFollowup(interactionToken: string, messageData: any) {
  const url = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${interactionToken}/messages/@original`;
  try {
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData),
    });
  } catch (e) {
    console.error('Failed to send followup message:', e);
  }
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

    // Acknowledge the interaction immediately with a deferred ephemeral message
    const thinkingResponse = NextResponse.json({
        type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
        data: {
            content: "Pensando no seu caso...🤔💡",
            flags: 1 << 6, // Ephemeral flag
        }
    });

    if (name === 'raid') {
      const levelOption = options.find((opt: any) => opt.name === 'level_ou_nome');
      const difficultyOption = options.find((opt: any) => opt.name === 'dificuldade');
      const robloxProfileOption = options.find((opt: any) => opt.name === 'roblox_profile_url');

      const level = levelOption ? levelOption.value : 'Não especificado';
      const difficulty = difficultyOption ? difficultyOption.value : 'Não especificada';
      const userNickname = user.global_name || user.username;
      const userAvatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
      const robloxProfileUrl = robloxProfileOption ? robloxProfileOption.value : `https://www.roblox.com/users/${user.id}/profile`;

      // Execute task in background
      (async () => {
        try {
          await sendRaidAnnouncement({
             level,
             difficulty,
             userNickname,
             userAvatar,
             robloxProfileUrl,
          });
          await handleFollowup(interactionToken, { content: 'Anúncio de raid enviado com sucesso!' });
        } catch (e) {
          console.error(e);
          await handleFollowup(interactionToken, { content: 'Ocorreu um erro ao enviar o anúncio. Tente novamente.' });
        }
      })();
      
      return thinkingResponse;
    }

    if (name === 'cap') {
      const questionOption = options.find((opt: any) => opt.name === 'pergunta');
      const question = questionOption ? questionOption.value : 'No question provided.';
      
      (async () => {
          try {
              const result = await askChatbot({ question });
              await handleFollowup(interactionToken, { content: result.answer });
          } catch (e) {
              console.error(e);
              await handleFollowup(interactionToken, { content: 'Desculpe, não consegui obter uma resposta. Tente novamente.' });
          }
      })();

      return thinkingResponse;
    }
  }

  return NextResponse.json({error: 'Unhandled interaction type'}, {status: 400});
}