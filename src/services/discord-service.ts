'use server';

import type { EmbedBuilder } from 'discord.js';

interface SendToDiscordParams {
  level: string;
  difficulty: string;
  userNickname: string;
  userAvatar: string;
  robloxProfileUrl: string;
}

// This function can be kept as it is, as it's just building a JSON object.
// We just need to ensure discord.js types are available without the full library.
// The EmbedBuilder from discord.js is just a helper, we can create the object directly.
function createRaidEmbed(params: SendToDiscordParams) {
  return {
    title: `Anúncio de Raid de ${params.userNickname}`,
    url: params.robloxProfileUrl,
    description: `Gostaria de uma ajuda para superar a Raid **lvl ${params.level}** na dificuldade **${params.difficulty}**.\n\nFicarei grato!`,
    color: 0x666699, // Deep Indigo
    thumbnail: {
      url: params.userAvatar,
    },
    footer: {
      text: 'Raid Troupers',
    },
    timestamp: new Date().toISOString(),
  };
}

async function postToWebhook(embed: any) {
  const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${process.env.DISCORD_BOT_TOKEN}`;
  const announcementsChannelId = "1395591154208084049";

  const response = await fetch(`${webhookUrl}?channel_id=${announcementsChannelId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Failed to send message to Discord via webhook:', errorData);
    throw new Error(`Failed to send message to Discord: ${JSON.stringify(errorData)}`);
  }
}

export async function sendToDiscord(params: SendToDiscordParams): Promise<{ success: boolean; error?: string }> {
  try {
    const embed = createRaidEmbed(params);
    
    // We can't use webhooks for this as the bot token is not a webhook token.
    // We will post directly to the channel using the bot token.
    const channelId = "1395591154208084049"; // announcements channel
    const url = `https://discord.com/api/v10/channels/${channelId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Falha ao enviar mensagem para o Discord:', errorText);
      return { success: false, error: `Falha ao enviar mensagem para o Discord: ${errorText}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Falha ao enviar mensagem para o Discord:', error);
    if (error instanceof Error) {
        return { success: false, error: `Falha ao enviar mensagem para o Discord: ${error.message}` };
    }
    return { success: false, error: 'Falha ao enviar mensagem para o Discord.' };
  }
}

export async function createRaidAnnouncementFromInteraction(params: SendToDiscordParams): Promise<{ success: boolean; error?: string }> {
   try {
    const embed = createRaidEmbed(params);
    const channelId = "1395591154208084049"; // announcements channel
    const url = `https://discord.com/api/v10/channels/${channelId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send raid announcement:', errorText);
      return { success: false, error: 'Failed to send raid announcement.' };
    }
     return { success: true };
  } catch (error) {
    console.error('Failed to send raid announcement:', error);
     return { success: false, error: 'Failed to send raid announcement.' };
  }
}