import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { shopItems } from '../shop-items.js';

export default {
  data: new SlashCommandBuilder()
    .setName('comprar')
    .setDescription('Compre um item da loja.')
    .addStringOption(option =>
      option.setName('item_id')
        .setDescription('O ID do item que você deseja comprar.')
        .setRequired(true)),
  async execute(interaction, { userStats, userItems }) {
    const itemId = interaction.options.getString('item_id');
    const userId = interaction.user.id;

    const itemToBuy = shopItems.find(item => item.id === itemId);

    if (!itemToBuy) {
      return await interaction.reply({ content: '❌ Esse item não existe na loja.', ephemeral: true });
    }

    const stats = userStats.get(userId);
    const items = userItems.get(userId) || { inventory: [], equippedBackground: 'default' };

    if (items.inventory.includes(itemId)) {
      return await interaction.reply({ content: '🤔 Você já possui este item.', ephemeral: true });
    }

    if (!stats || stats.coins < itemToBuy.price) {
      return await interaction.reply({ content: `💰 Você não tem Troup Coins suficientes! Você precisa de ${itemToBuy.price} TC.`, ephemeral: true });
    }

    // Deduzir moedas e adicionar item
    stats.coins -= itemToBuy.price;
    items.inventory.push(itemId);

    userStats.set(userId, stats);
    userItems.set(userId, items);

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Compra Realizada com Sucesso!')
        .setDescription(`Você comprou **${itemToBuy.name}** por ${itemToBuy.price} TC!`)
        .addFields({ name: 'Novo Saldo', value: `${stats.coins} TC` })
        .setFooter({ text: 'Use /equipar para usar seu novo item!' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
