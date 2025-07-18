'use server';

import { Client, GatewayIntentBits, TextChannel, EmbedBuilder } from 'discord.js';

interface SendToDiscordParams {
  level: string;
  difficulty: string;
  userNickname: string;
  userAvatar: string;
  robloxProfileUrl: string;
}

export async function sendToDiscord(params: SendToDiscordParams): Promise<{ success: boolean; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;

  if (!token) {
    console.error('DISCORD_BOT_TOKEN is not configured.');
    return { success: false, error: 'Token do bot do Discord não configurado.' };
  }
  if (!channelId) {
    console.error('DISCORD_CHANNEL_ID is not configured.');
    return { success: false, error: 'ID do canal do Discord não configurado.' };
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  try {
    await new Promise<void>((resolve, reject) => {
      client.once('ready', () => {
        console.log(`Logged in as ${client.user?.tag}!`);
        resolve();
      });
      client.once('error', (err) => {
        console.error('Discord client error:', err);
        reject(err);
      });
      
      const timeout = setTimeout(() => reject(new Error('Login timeout')), 10000);

      client.login(token).then(() => clearTimeout(timeout)).catch(reject);
    });

    const channel = await client.channels.fetch(channelId);

    if (!channel || !(channel instanceof TextChannel)) {
       await client.destroy();
      return { success: false, error: 'Canal não encontrado ou não é um canal de texto.' };
    }

    const embed = new EmbedBuilder()
      .setTitle(`Anúncio de Raid de ${params.userNickname}`)
      .setURL(params.robloxProfileUrl)
      .setDescription(`Gostaria de uma ajuda para superar a Raid **lvl ${params.level}** na dificuldade **${params.difficulty}**.\n\nFicarei grato!`)
      .setColor(0x666699) // Deep Indigo
      .setThumbnail(params.userAvatar)
      .setFooter({ text: 'RaidAnnouncer Bot' })
      .setTimestamp();
      
    await channel.send({ embeds: [embed] });

    await client.destroy();
    return { success: true };
  } catch (error) {
    console.error('Falha ao enviar mensagem para o Discord:', error);
    if(client.isReady()) {
      await client.destroy();
    }
    if (error instanceof Error) {
        return { success: false, error: `Falha ao enviar mensagem para o Discord: ${error.message}` };
    }
    return { success: false, error: 'Falha ao enviar mensagem para o Discord.' };
  }
}
