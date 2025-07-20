import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { shopItems } from '../shop-items.js';
import { getTranslator } from '../i18n.js';

export default {
  data: new SlashCommandBuilder()
    .setName('loja')
    .setDescription('Mostra os itens disponíveis para compra.')
    .setDescriptionLocalizations({ "en-US": "Shows the items available for purchase." }),
  async execute(interaction, { userStats }) {
    const t = await getTranslator(interaction.user.id, userStats);

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle(t('shop_title'))
      .setDescription(t('shop_description'))
      .setTimestamp();

    shopItems.forEach(item => {
      embed.addFields({
        name: t(`item_${item.id}_name`),
        value: `**${t('price')}:** ${item.price} Troup Coins\n**ID:** \`${item.id}\``,
        inline: true,
      });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
