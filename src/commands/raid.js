import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { checkMissionCompletion } from '../mission-system.js';
import { getTranslator } from '../i18n.js';
import { data } from './raid.data.js';

const userLastRaidMessage = new Map();

export default {
  data: data,
  async execute(interaction, { userStats, userMissions, clans, userItems, userProfiles }) {
    await interaction.deferReply({ ephemeral: true });
    
    const t = await getTranslator(interaction.user.id, userStats);
    
    const nivel = interaction.options.getString('nivel');
    const dificuldade = interaction.options.getString('dificuldade');
    const user = interaction.user;

    const member = await interaction.guild.members.fetch(user.id);
    const robloxUsername = member.displayName || user.username;
    const raidChannelId = '1395591154208084049';
    const channel = interaction.client.channels.cache.get(raidChannelId);

    if (!channel) {
      console.error(`Channel with ID ${raidChannelId} not found.`);
      return await interaction.editReply({
        content: t('raid_channel_not_found')
      });
    }

    const deletePromise = (async () => {
      const lastMessageId = userLastRaidMessage.get(user.id);
      if (lastMessageId) {
        try {
          const lastMessage = await channel.messages.fetch(lastMessageId).catch(() => null);
          if (lastMessage) {
            if (lastMessage.thread) {
              await lastMessage.thread.delete().catch(() => {});
            }
            await lastMessage.delete().catch(() => {});
          }
          userLastRaidMessage.delete(user.id);
        } catch (deleteErr) {
          console.log(`Error deleting previous message: ${deleteErr.message}`);
          userLastRaidMessage.delete(user.id);
        }
      }
    })();

    const embed = new EmbedBuilder()
      .setTitle(t('raid_embed_title'))
      .setDescription(t('raid_embed_description', { nivel, dificuldade }))
      .setColor("#FF0000")
      .addFields({ name: `👥 ${t('team_members')}`, value: `**1/5**`, inline: true })
      .setFooter({ text: t('raid_embed_footer', { username: member.displayName || user.username }), iconURL: user.displayAvatarURL() })
      .setTimestamp();

    try {
      const sentMessage = await channel.send({ embeds: [embed], components: [] });

      const joinButtonId = `raid_join_${user.id}_${sentMessage.id}`;

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel("Add")
            .setEmoji('👤')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://www.roblox.com/users/profile?username=${encodeURIComponent(robloxUsername)}`),
          new ButtonBuilder()
            .setLabel("DM")
            .setEmoji('✉️')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/users/${user.id}`),
          new ButtonBuilder()
            .setCustomId(joinButtonId)
            .setLabel(t('join_button'))
            .setStyle(ButtonStyle.Success)
            .setEmoji('🤝')
        );

      await sentMessage.edit({ embeds: [embed], components: [row] });

      userLastRaidMessage.set(user.id, sentMessage.id);
      
      const stats = userStats.get(user.id) || { level: 1, xp: 0, coins: 0, class: null, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0, reputation: 0, totalRatings: 0, clanId: null, locale: 'pt-BR' };
      stats.raidsCreated += 1;
      userStats.set(user.id, stats);
      
      await checkMissionCompletion(interaction.user, 'RAID_CREATED', { userStats, userMissions, client: interaction.client, userProfiles, userItems, clans });

      await interaction.editReply({
        content: t('raid_reply_success', { channelId: raidChannelId })
      });
    } catch (err) {
      console.error("Error sending message to channel:", err);
      await interaction.editReply({
        content: t('raid_reply_error')
      });
    }
  }
};
