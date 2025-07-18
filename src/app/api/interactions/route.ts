// src/app/api/interactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { sendRaidAnnouncement } from '@/services/discord-service';
import { askChatbot } from '@/ai/flows/general-chatbot';

async function handleFollowup(interactionToken: string, content: string, ephemeral = false) {
    const url = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${interactionToken}`;
    try {
        const body: any = {
            content: content,
        };
        if (ephemeral) {
            body.flags = 1 << 6; // Ephemeral flag
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            console.error(`Followup failed: ${res.status}`, await res.text());
        }
    } catch(e) {
        console.error("Error in handleFollowup", e);
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

    if (name === 'raid') {
      const levelOption = options.find((opt: any) => opt.name === 'level_ou_nome');
      const difficultyOption = options.find((opt: any) => opt.name === 'dificuldade');

      const level = levelOption ? levelOption.value : 'Não especificado';
      const difficulty = difficultyOption ? difficultyOption.value : 'Não especificada';
      const userNickname = user.global_name || user.username;
      const userAvatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
      const robloxProfileUrl = `https://www.roblox.com/users/${user.id}/profile`;
      
      (async () => {
         await sendRaidAnnouncement({
             level,
             difficulty,
             userNickname,
             userAvatar,
             robloxProfileUrl,
         });
         // The original interaction response is now ephemeral, so the followup must be too.
         // We must use a POST to `/webhooks/{application_id}/{interaction_token}` to create a new ephemeral followup.
         await handleFollowup(interactionToken, 'Anúncio de raid enviado com sucesso!', true);
       })();

      // Respond with a deferred ephemeral message
      return NextResponse.json({
        type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          flags: 1 << 6, // Ephemeral flag
        },
      });
    }

    if (name === 'cap') {
      const questionOption = options.find((opt: any) => opt.name === 'pergunta');
      const question = questionOption ? questionOption.value : 'No question provided.';
      
      (async () => {
          try {
              const result = await askChatbot({ question });
              // PATCH /webhooks/{application_id}/{interaction_token}/messages/@original
              const url = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${interactionToken}/messages/@original`;
              await fetch(url, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content: result.answer }),
              });
          } catch (e) {
              console.error(e);
              const url = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${interactionToken}/messages/@original`;
              await fetch(url, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content: 'Desculpe, não consegui obter uma resposta. Tente novamente.' }),
              });
          }
      })();

      return NextResponse.json({
          type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
      });
    }
  }

  return NextResponse.json({error: 'Unhandled interaction type'}, {status: 400});
}
