import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { shopItems } from '../shop-items.js';
import { getTranslator } from '../i18n.js';

export default {
  data: new SlashCommandBuilder()
    .setName('comprar')
    .setDescription('Compre um item da loja.')
    .setDescriptionLocalizations({ "en-US": "Buy an item from the shop." })
    .addStringOption(option =>
      option.setName('item_id')
        .setDescription('O ID do item que você deseja comprar.')
        .setDescriptionLocalizations({ "en-US": "The ID of the item you want to buy." })
        .setRequired(true)),
  async execute(interaction, { userStats, userItems }) {
    const t = await getTranslator(interaction.user.id, userStats);
    const itemId = interaction.options.getString('item_id');
    const userId = interaction.user.id;

    const itemToBuy = shopItems.find(item => item.id === itemId);

    if (!itemToBuy) {
      return await interaction.reply({ content: t('buy_item_not_exist'), ephemeral: true });
    }

    const stats = userStats.get(userId);
    const items = userItems.get(userId) || { inventory: [], equippedBackground: 'default', equippedTitle: 'default' };

    if (items.inventory.includes(itemId)) {
      return await interaction.reply({ content: t('buy_already_own'), ephemeral: true });
    }

    if (!stats || stats.coins < itemToBuy.price) {
      return await interaction.reply({ content: t('buy_not_enough_coins', { price: itemToBuy.price }), ephemeral: true });
    }

    stats.coins -= itemToBuy.price;
    items.inventory.push(itemId);

    userStats.set(userId, stats);
    userItems.set(userId, items);

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(t('buy_success_title'))
        .setDescription(t('buy_success_description', { itemName: t(`item_${itemToBuy.id}_name`), price: itemToBuy.price }))
        .addFields({ name: t('new_balance'), value: `${stats.coins} TC` })
        .setFooter({ text: t('buy_success_footer') });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
