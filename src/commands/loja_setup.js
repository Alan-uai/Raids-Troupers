import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, StringSelectMenuBuilder } from 'discord.js';
import { allItems } from '../items.js';
import { getTranslator } from '../i18n.js';

const SHOP_CHANNEL_ID_PT = '1396416240263630868';
const SHOP_CHANNEL_ID_EN = '1396725532913303612';
const shopStorage = new Map(); // Armazenará os itens atualmente na loja para cada localidade

function getShopItems(locale) {
    if (!shopStorage.has(locale) || shopStorage.get(locale).lastUpdate < Date.now() - 3 * 60 * 60 * 1000) {
        updateShopInventory(locale);
    }
    return shopStorage.get(locale).items;
}

function updateShopInventory(locale) {
    console.log(`Updating shop inventory for ${locale}...`);
    const now = new Date();
    let shopItems = [];

    // Lógica para itens raros/lendários/místicos baseada no tempo
    const hour = now.getUTCHours();
    if (hour % 24 === 0) { // A cada 24h
        const mythicPool = allItems.filter(i => i.source === 'shop' && i.rarity.includes('Místico'));
        if (mythicPool.length > 0) shopItems.push(mythicPool[Math.floor(Math.random() * mythicPool.length)]);
    } else if (hour % 12 === 0) { // A cada 12h
        const legendaryPool = allItems.filter(i => i.source === 'shop' && i.rarity.includes('Lendário'));
        if (legendaryPool.length > 0) shopItems.push(legendaryPool[Math.floor(Math.random() * legendaryPool.length)]);
    } else if (hour % 6 === 0) { // A cada 6h
        const rarePool = allItems.filter(i => i.source === 'shop' && i.rarity.includes('Raro'));
        if (rarePool.length > 0) shopItems.push(rarePool[Math.floor(Math.random() * rarePool.length)]);
    }

    // Lógica para item Kardec (anual)
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    if (dayOfYear === 1) { // 1º de Janeiro
        const kardecPool = allItems.filter(i => i.source === 'shop' && i.rarity === 'Kardec');
        if (kardecPool.length > 0) shopItems.push(kardecPool[Math.floor(Math.random() * kardecPool.length)]);
    }


    // Preenche o resto com itens comuns/incomuns
    const regularPool = allItems.filter(item => item.source === 'shop' && !item.rarity.includes('Raro') && !item.rarity.includes('Lendário') && !item.rarity.includes('Místico') && item.rarity !== 'Kardec');
    while (shopItems.length < 5 && regularPool.length > 0) {
        const randomIndex = Math.floor(Math.random() * regularPool.length);
        const selectedItem = regularPool.splice(randomIndex, 1)[0];
        if (!shopItems.some(i => i.id === selectedItem.id)) {
            shopItems.push(selectedItem);
        }
    }

    shopStorage.set(locale, {
        items: shopItems,
        lastUpdate: Date.now()
    });
}


async function postOrUpdateShopMessage(client, t, channelId, locale) {
    const shopChannel = await client.channels.fetch(channelId).catch(() => null);
    if (!shopChannel || shopChannel.type !== ChannelType.GuildText) {
        console.error(`Shop channel ${channelId} for locale ${locale} not found or is not a text channel.`);
        return { success: false, channelId };
    }

    const shopItems = getShopItems(locale);

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle(t('shop_title'))
      .setDescription(t('shop_description'))
      .setTimestamp()
      .setFooter({ text: t('shop_footer_rotation') });

    if (shopItems.length === 0) {
        embed.setDescription(t('shop_empty'));
    } else {
        shopItems.forEach(item => {
            embed.addFields({
                name: `${t(`item_${item.id}_name`)} - ${item.price} TC`,
                value: `*${t(`item_${item.id}_description`)}*\n**${t('rarity')}:** ${item.rarity}`,
                inline: false,
            });
        });
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('shop_select_item')
        .setPlaceholder(t('shop_select_placeholder'))
        .setDisabled(shopItems.length === 0);

    if (shopItems.length > 0) {
         selectMenu.addOptions(
            shopItems.map(item => ({
                label: t(`item_${item.id}_name`),
                description: t('shop_select_item_desc', { price: item.price }),
                value: item.id,
            }))
        );
    } else {
        selectMenu.addOptions([{ label: 'empty', value: 'empty' }]);
    }
    

    const buyButton = new ButtonBuilder()
        .setCustomId('shop_buy_button')
        .setLabel(t('shop_buy_button_label'))
        .setStyle(ButtonStyle.Success)
        .setEmoji('🛒')
        .setDisabled(shopItems.length === 0);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const buttonRow = new ActionRowBuilder().addComponents(buyButton);

    try {
        const messages = await shopChannel.messages.fetch({ limit: 10 });
        const botMessage = messages.find(m => m.author.id === client.user.id);

        if (botMessage) {
            await botMessage.edit({ embeds: [embed], components: [row, buttonRow] });
        } else {
            await shopChannel.send({ embeds: [embed], components: [row, buttonRow] });
        }
        return { success: true, channelId };
    } catch (error) {
        console.error(`Failed to update or send shop message to ${channelId}:`, error);
        return { success: false, channelId };
    }
}


export default {
  data: new SlashCommandBuilder()
    .setName('loja_setup')
    .setDescription('[Admin] Configura ou atualiza as mensagens das lojas no servidor.')
    .setDescriptionLocalizations({ "en-US": "[Admin] Sets up or updates the shop messages on the server." })
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(interaction) {
    const t_pt = await getTranslator(interaction.user.id, null, 'pt-BR');
    
    await interaction.reply({ content: t_pt('shop_updating_message'), ephemeral: true });
    
    // Update shops immediately
    const t_en = await getTranslator(interaction.user.id, null, 'en-US');
    const ptResult = await postOrUpdateShopMessage(interaction.client, t_pt, SHOP_CHANNEL_ID_PT, 'pt-BR');
    const enResult = await postOrUpdateShopMessage(interaction.client, t_en, SHOP_CHANNEL_ID_EN, 'en-US');
    
    let feedback = '';
    if (ptResult.success && enResult.success) {
        feedback = t_pt('shop_updated_all');
    } else {
        feedback = 'Houve problemas ao atualizar as lojas:\n';
        if (!ptResult.success) feedback += `- Falha ao atualizar a loja PT-BR no canal <#${ptResult.channelId}>.\n`;
        if (!enResult.success) feedback += `- Falha ao atualizar a loja EN-US no canal <#${enResult.channelId}>.`;
    }

    await interaction.followUp({ content: feedback, ephemeral: true });

    // Set interval to update shops periodically
    setInterval(async () => {
        console.log("Running periodic shop update...");
        await postOrUpdateShopMessage(interaction.client, t_pt, SHOP_CHANNEL_ID_PT, 'pt-BR');
        await postOrUpdateShopMessage(interaction.client, t_en, SHOP_CHANNEL_ID_EN, 'en-US');
    }, 3 * 60 * 60 * 1000); // 3 hours
  },
  postOrUpdateShopMessage,
};
