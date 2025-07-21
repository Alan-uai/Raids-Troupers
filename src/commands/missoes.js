import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { missions as missionPool } from '../missions.js';
import { getTranslator } from '../i18n.js';

export default {
  data: new SlashCommandBuilder()
    .setName('missoes')
    .setDescription('Veja suas missões ativas.')
    .setDescriptionLocalizations({ "en-US": "See your active missions." })
    .addStringOption(option => 
        option.setName('categoria')
            .setDescription('Escolha qual categoria de missões ver.')
            .setDescriptionLocalizations({ "en-US": "Choose which mission category to see." })
            .setRequired(true)
            .addChoices(
                { name: 'Diárias', value: 'daily' },
                { name: 'Semanais', value: 'weekly' }
            )),
  async execute(interaction, { userMissions, userStats }) {
    const t = await getTranslator(interaction.user.id, userStats);
    const userId = interaction.user.id;
    const category = interaction.options.getString('categoria');
    const activeMissionsData = userMissions.get(userId);

    const missionsToShow = activeMissionsData ? activeMissionsData[category] : [];

    if (!missionsToShow || missionsToShow.length === 0) {
      return await interaction.reply({ content: t('missions_none_active_category', { category: t(category) }), ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle(t('missions_embed_title_category', { username: interaction.user.username, category: t(category) }))
      .setDescription(t('missions_embed_description'));

    missionsToShow.forEach(missionProgress => {
      const missionDetails = missionPool.find(m => m.id === missionProgress.id);
      if (missionDetails) {
        let rewardText;
        const reward = missionProgress.reward || missionDetails.reward;
        if (reward.item) {
            const itemDetails = allItems.find(i => i.id === reward.item);
            rewardText = itemDetails ? `Item: **${t(`item_${itemDetails.id}_name`)}**` : '**Item Secreto**';
        } else {
            rewardText = `**${reward.xp || 0}** XP & **${reward.coins || 0}** TC`;
        }
        
        embed.addFields({
          name: `${t(`mission_${missionDetails.id}_title`)}`,
          value: `*${t(`mission_${missionDetails.id}_description`)}*\n**${t('progress')}:** ${missionProgress.progress} / ${missionProgress.goal}\n**${t('reward')}:** ${rewardText}`,
          inline: false,
        });
      }
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
