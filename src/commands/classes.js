import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { classes } from '../classes.js';
import { getTranslator } from '../i18n.js';

export default {
  data: new SlashCommandBuilder()
    .setName('classes')
    .setDescription('Mostra as especializações disponíveis.')
    .setDescriptionLocalizations({ "en-US": "Shows the available specializations." }),
  async execute(interaction, { userStats }) {
    const t = await getTranslator(interaction.user.id, userStats);
    const userId = interaction.user.id;
    const stats = userStats.get(userId);

    if (!stats || stats.level < 5) {
      return await interaction.reply({ content: t('classes_level_too_low'), ephemeral: true });
    }

    if (stats.class) {
        const currentClass = classes.find(c => c.id === stats.class);
        return await interaction.reply({ content: t('classes_already_chosen', { className: t(`class_${currentClass.id}_name`) }), ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#D2AC47')
      .setTitle(t('classes_embed_title'))
      .setDescription(t('classes_embed_description'));

    classes.forEach(cls => {
      embed.addFields({
        name: `${cls.icon} ${t(`class_${cls.id}_name`)}`,
        value: `${t(`class_${cls.id}_description`)}\n**ID:** \`${cls.id}\``,
        inline: false,
      });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
