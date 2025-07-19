import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { shopItems } from '../shop-items.js';

export default {
  data: new SlashCommandBuilder()
    .setName('inventario')
    .setDescription('Veja os itens que você possui.'),
  async execute(interaction, { userItems }) {
    const userId = interaction.user.id;
    const items = userItems.get(userId);

    if (!items || items.inventory.length === 0) {
      return await interaction.reply({ content: '🎒 Seu inventário está vazio.', ephemeral: true });
    }

    const equippedItemUrl = items.equippedBackground;
    
    const inventoryList = items.inventory.map(itemId => {
        const itemDetails = shopItems.find(shopItem => shopItem.id === itemId);
        const name = itemDetails ? itemDetails.name : 'Item Desconhecido';
        const equippedIndicator = equippedItemUrl === itemDetails?.url ? '✅ Equipado' : '';
        return `**${name}** (ID: \`${itemId}\`) ${equippedIndicator}`;
    }).join('\n');

    const embed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle(`🎒 Inventário de ${interaction.user.username}`)
        .setDescription(inventoryList || 'Nenhum item encontrado.')
        .setFooter({text: 'Use /equipar <item_id> para usar um item.'});

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
