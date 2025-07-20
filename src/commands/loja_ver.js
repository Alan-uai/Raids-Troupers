import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { allItems } from '../items.js';
import { getTranslator } from '../i18n.js';

export default {
  data: new SlashCommandBuilder()
    .setName('loja')
    .setDescription('Mostra os itens disponíveis na loja.')
    .setDescriptionLocalizations({ "en-US": "Shows the available items in the shop." }),
  async execute(interaction, { userStats }) {
    const t = await getTranslator(interaction.user.id, userStats);
    const shopItems = allItems.filter(item => item.source === 'shop');

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle(t('shop_title'))
      .setDescription(t('shop_ephemeral_description'));

    shopItems.forEach(item => {
        embed.addFields({
            name: `${t(`item_${item.id}_name`)}`,
            value: `*${t(`item_${item.id}_description`)}*\n**${t('price')}:** ${item.price} TC\n**ID:** \`${item.id}\``,
            inline: true,
        });
    });
    
    embed.setFooter({ text: t('shop_ephemeral_footer') });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

    