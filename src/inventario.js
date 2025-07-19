import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { shopItems } from '../shop-items.js';
import { rareItems } from '../rare-items.js';

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

    const equippedBackgroundUrl = items.equippedBackground;
    const equippedTitleName = items.equippedTitle;

    const allItems = [...shopItems, ...rareItems];
    
    const inventoryList = items.inventory.map(itemId => {
        const itemDetails = allItems.find(item => item.id === itemId);
        if (!itemDetails) return `**Item Desconhecido** (ID: \`${itemId}\`)`;
        
        const name = itemDetails.name;
        let equippedIndicator = '';

        if (itemDetails.type === 'background' && equippedBackgroundUrl === itemDetails.url) {
            equippedIndicator = '✅ Fundo Equipado';
        } else if (itemDetails.type === 'title' && equippedTitleName === itemDetails.name) {
            equippedIndicator = '✅ Título Equipado';
        }

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
