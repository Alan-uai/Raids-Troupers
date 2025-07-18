// src/app/api/interactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { createRaidEmbed } from '@/services/discord-service';
import { Client, TextChannel, GatewayIntentBits } from 'discord.js';

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
    const { name, options } = interaction.data;
    const user = interaction.member.user;

    if (name === 'raid') {
      const levelOption = options.find((opt: any) => opt.name === 'level');
      const difficultyOption = options.find((opt: any) => opt.name === 'dificuldade');

      const level = levelOption ? levelOption.value : 'Não especificado';
      const difficulty = difficultyOption ? difficultyOption.value : 'Não especificada';
      const userNickname = user.global_name || user.username;
      const userAvatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
      // This is a placeholder, as we can't get a Roblox URL from Discord directly.
      const robloxProfileUrl = 'https://www.roblox.com';

      // Respond to the interaction to avoid a timeout
      // Defer the response while we send the message to the channel
      const responsePromise = new Promise(async (resolve) => {
          const client = new Client({ intents: [GatewayIntentBits.Guilds] });
          const token = process.env.DISCORD_BOT_TOKEN;
          const channelId = process.env.DISCORD_CHANNEL_ID;

          if (!token || !channelId) {
              console.error('Discord bot token or channel ID is not configured.');
              resolve(null);
              return;
          }

          try {
              await client.login(token);
              const channel = await client.channels.fetch(channelId);
              if (channel && channel instanceof TextChannel) {
                  const embed = createRaidEmbed({
                      level,
                      difficulty,
                      userNickname,
                      userAvatar,
                      robloxProfileUrl,
                  });
                  await channel.send({ embeds: [embed] });
              }
          } catch (error) {
              console.error('Failed to send raid announcement:', error);
          } finally {
              if (client.isReady()) {
                  await client.destroy();
              }
              resolve(null);
          }
      });

      return NextResponse.json({
        type: 4, // ChannelMessageWithSource
        data: {
          content: `Anúncio de raid criado com sucesso no canal de anúncios!`,
          flags: 1 << 6 // Ephemeral message
        },
      });
    }
  }

  return new NextResponse('OK');
}
