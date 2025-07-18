'use server';

import { Client, GatewayIntentBits, TextChannel } from 'discord.js';

export async function sendToDiscord(message: string): Promise<{ success: boolean; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;

  if (!token) {
    return { success: false, error: 'Token do bot do Discord não configurado.' };
  }
  if (!channelId) {
    return { success: false, error: 'ID do canal do Discord não configurado.' };
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  try {
    await new Promise<void>((resolve, reject) => {
      client.once('ready', () => {
        resolve();
      });
      client.once('error', reject);
      client.login(token).catch(reject);
    });

    const channel = await client.channels.fetch(channelId);

    if (!channel || !(channel instanceof TextChannel)) {
       await client.destroy();
      return { success: false, error: 'Canal não encontrado ou não é um canal de texto.' };
    }

    await channel.send(message);
    await client.destroy();
    return { success: true };
  } catch (error) {
    console.error('Falha ao enviar mensagem para o Discord:', error);
    await client.destroy();
    if (error instanceof Error) {
        return { success: false, error: `Falha ao enviar mensagem para o Discord: ${error.message}` };
    }
    return { success: false, error: 'Falha ao enviar mensagem para o Discord.' };
  }
}
