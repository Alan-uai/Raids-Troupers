import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { allItems, isCosmetic, isGear } from '../items.js';
import { getTranslator } from '../i18n.js';

export default {
  data: new SlashCommandBuilder()
    .setName('inventario')
    .setDescription('Veja os itens que você possui.')
    .setDescriptionLocalizations({ "en-US": "See the items you own." }),
  async execute(interaction, { userItems, userStats }) {
    const t = await getTranslator(interaction.user.id, userStats);
    const userId = interaction.user.id;
    const items = userItems.get(userId);

    if (!items || items.inventory.length === 0) {
      return await interaction.reply({ content: t('inventory_empty'), ephemeral: true });
    }
    
    const equippedCosmeticIds = Object.values(items.equippedCosmetics || {});
    const equippedGearIds = Object.values(items.equippedGear || {});
    const allEquippedIds = new Set([...equippedCosmeticIds, ...equippedGearIds]);


    const inventoryList = items.inventory.map(itemId => {
        const itemDetails = allItems.find(item => item.id === itemId);
        if (!itemDetails) return `**${t('unknown_item')}** (ID: \`${itemId}\`)`;
        
        const name = t(`item_${itemDetails.id}_name`) || itemDetails.name;
        let equippedIndicator = '';

        if (allEquippedIds.has(itemId)) {
             equippedIndicator = `✅ ${t('equipped')}`;
        }
        
        let bonusText = '';
        if(isGear(itemDetails) && itemDetails.bonus) {
            bonusText = ` (+${itemDetails.bonus}% XP)`;
        }

        return `**${name}**${bonusText} (ID: \`${itemId}\`) ${equippedIndicator}`;
    }).join('\n');

    const embed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle(t('inventory_title', { username: interaction.user.username }))
        .setDescription(inventoryList || t('no_items_found'))
        .setFooter({text: t('inventory_footer')});

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
