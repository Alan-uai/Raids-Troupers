import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { missions as missionPool } from '../missions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('missoes')
    .setDescription('Veja suas missões ativas.'),
  async execute(interaction, { userMissions }) {
    const userId = interaction.user.id;
    const activeMissions = userMissions.get(userId);

    if (!activeMissions || activeMissions.length === 0) {
      return await interaction.reply({ content: 'Você não tem nenhuma missão ativa no momento.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle(`📜 Missões de ${interaction.user.username}`)
      .setDescription('Complete essas tarefas para ganhar recompensas!');

    activeMissions.forEach(missionProgress => {
      const missionDetails = missionPool.find(m => m.id === missionProgress.id);
      if (missionDetails) {
        embed.addFields({
          name: `${missionDetails.description}`,
          value: `**Progresso:** ${missionProgress.progress} / ${missionDetails.goal}\n**Recompensa:** ${missionDetails.reward.xp} XP e ${missionDetails.reward.coins} TC`,
          inline: false,
        });
      }
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
