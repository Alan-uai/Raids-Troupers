'use server';

interface RaidAnnouncementParams {
  level: string;
  difficulty: string;
  userNickname: string;
  userAvatar: string;
  robloxProfileUrl: string;
}

function createRaidEmbed(params: RaidAnnouncementParams) {
  return {
    author: {
        name: `Anúncio de Raid de ${params.userNickname}`,
        url: params.robloxProfileUrl,
        icon_url: params.userAvatar,
    },
    description: `Gostaria de uma ajuda para superar a Raid **lvl ${params.level}** na dificuldade **${params.difficulty}**.\n\nFicarei grato!`,
    color: 0x666699, // Deep Indigo
    footer: {
      text: 'Raid Troupers',
    },
    timestamp: new Date().toISOString(),
  };
}

async function postToWebhook(embed: any) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
      throw new Error('DISCORD_WEBHOOK_URL environment variable is not set.');
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error('Failed to send message to Discord via webhook:', errorData);
        throw new Error(`Failed to send message to Discord: ${errorData}`);
    }
    // Webhooks return 204 No Content on success, so we don't need to parse JSON.
    return { ok: response.ok, status: response.status };
}

export async function sendRaidAnnouncement(params: RaidAnnouncementParams): Promise<{ success: boolean; error?: string }> {
  try {
    const embed = createRaidEmbed(params);
    await postToWebhook(embed);
    return { success: true };
  } catch (error) {
    console.error('Falha ao enviar mensagem para o Discord:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Falha ao enviar mensagem para o Discord: ${errorMessage}` };
  }
}
