import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { classes } from '../classes.js';

export default {
  data: new SlashCommandBuilder()
    .setName('classes')
    .setDescription('Mostra as especializações disponíveis.'),
  async execute(interaction, { userStats }) {
    const userId = interaction.user.id;
    const stats = userStats.get(userId);

    if (!stats || stats.level < 5) {
      return await interaction.reply({ content: '⚔️ Você precisa atingir o nível 5 para escolher uma classe.', ephemeral: true });
    }

    if (stats.class) {
        const currentClass = classes.find(c => c.id === stats.class);
        return await interaction.reply({ content: `🛡️ Você já é um ${currentClass.name}! No momento, não é possível trocar de classe.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#D2AC47')
      .setTitle('🛡️ Escolha sua Especialização')
      .setDescription('Ao atingir o nível 5, você pode escolher um caminho. Use `/escolher_classe <id_da_classe>` para fazer sua escolha.\n\n');

    classes.forEach(cls => {
      embed.addFields({
        name: `${cls.icon} ${cls.name}`,
        value: `${cls.description}\n**ID:** \`${cls.id}\``,
        inline: false,
      });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
