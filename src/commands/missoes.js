import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { missions as missionPool } from '../missions.js';
import { getTranslator } from '../i18n.js';

export default {
  data: new SlashCommandBuilder()
    .setName('missoes')
    .setDescription('Veja suas missões ativas.')
    .setDescriptionLocalizations({ "en-US": "See your active missions." }),
  async execute(interaction, { userMissions, userStats }) {
    const t = await getTranslator(interaction.user.id, userStats);
    const userId = interaction.user.id;
    const activeMissions = userMissions.get(userId);

    if (!activeMissions || activeMissions.length === 0) {
      return await interaction.reply({ content: t('missions_none_active'), ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle(t('missions_embed_title', { username: interaction.user.username }))
      .setDescription(t('missions_embed_description'));

    activeMissions.forEach(missionProgress => {
      const missionDetails = missionPool.find(m => m.id === missionProgress.id);
      if (missionDetails) {
        embed.addFields({
          name: `${t(`mission_${missionDetails.id}_description`)}`,
          value: `**${t('progress')}:** ${missionProgress.progress} / ${missionDetails.goal}\n**${t('reward')}:** ${missionDetails.reward.xp} XP & ${missionDetails.reward.coins} TC`,
          inline: false,
        });
      }
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
