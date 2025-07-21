import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, StringSelectMenuBuilder } from 'discord.js';
import { allItems } from '../items.js';
import { getTranslator } from '../i18n.js';

const SHOP_CHANNEL_ID_PT = '1396416240263630868';
const SHOP_CHANNEL_ID_EN = '1396725532913303612';
const shopStorage = new Map(); // Armazenará os itens atualmente na loja para cada localidade

function getNextUpdate(hours) {
    const now = new Date();
    const nextUpdate = new Date(now);
    nextUpdate.setUTCHours(Math.ceil(now.getUTCHours() / hours) * hours, 0, 0, 0);
    if (nextUpdate <= now) {
        nextUpdate.setUTCHours(nextUpdate.getUTCHours() + hours);
    }
    return nextUpdate;
}

function getShopItems(locale) {
    const rotationHours = 3;
    const nextUpdateTime = getNextUpdate(rotationHours).getTime();
    
    if (!shopStorage.has(locale) || shopStorage.get(locale).nextUpdate <= Date.now()) {
        updateShopInventory(locale, nextUpdateTime);
    }
    return shopStorage.get(locale).items;
}

function updateShopInventory(locale, nextUpdateTime) {
    console.log(`Updating shop inventory for ${locale}...`);
    const now = new Date();
    let shopItems = [];

    const hour = now.getUTCHours();
    // Lógica para itens raros/lendários/místicos baseada no tempo
    if (now.getFullYear() > 2024 && now.getMonth() === 0 && now.getDate() === 1) { // 1º de Janeiro do ano seguinte
        const kardecPool = allItems.filter(i => i.source === 'shop' && i.rarity === 'Kardec');
        if (kardecPool.length > 0) shopItems.push(kardecPool[Math.floor(Math.random() * kardecPool.length)]);
    }
    else if (hour % 24 === 0) { // A cada 24h
        const mythicPool = allItems.filter(i => i.source === 'shop' && i.rarity.includes('Místico'));
        if (mythicPool.length > 0) shopItems.push(mythicPool[Math.floor(Math.random() * mythicPool.length)]);
    } else if (hour % 12 === 0) { // A cada 12h
        const legendaryPool = allItems.filter(i => i.source === 'shop' && i.rarity.includes('Lendário'));
        if (legendaryPool.length > 0) shopItems.push(legendaryPool[Math.floor(Math.random() * legendaryPool.length)]);
    } else if (hour % 6 === 0) { // A cada 6h
        const rarePool = allItems.filter(i => i.source === 'shop' && i.rarity.includes('Raro'));
        if (rarePool.length > 0) shopItems.push(rarePool[Math.floor(Math.random() * rarePool.length)]);
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
        nextUpdate: nextUpdateTime,
    });
}


async function postOrUpdateShopMessage(client, t, channelId, locale, updateItems = true) {
    const shopChannel = await client.channels.fetch(channelId).catch(() => null);
    if (!shopChannel || shopChannel.type !== ChannelType.GuildText) {
        console.error(`Shop channel ${channelId} for locale ${locale} not found or is not a text channel.`);
        return { success: false, channelId };
    }

    const shopItems = getShopItems(locale);
    const nextUpdate = getNextUpdate(3);

    const timerEmbed = new EmbedBuilder()
      .setColor('#3498DB')
      .setDescription(t('shop_footer_rotation', { time: `<t:${Math.floor(nextUpdate.getTime() / 1000)}:R>` }));

    const messages = await shopChannel.messages.fetch({ limit: 10 }).catch(() => []);
    const botMessages = messages.filter(m => m.author.id === client.user.id);
    const mainMessage = botMessages.find(m => m.embeds[0]?.title === t('shop_title'));
    const timerMessage = botMessages.find(m => m.embeds[0]?.description.includes(t('shop_footer_rotation_raw')));

    if (updateItems) {
        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle(t('shop_title'))
          .setDescription(t('shop_description'))
          .setTimestamp();

        if (shopItems.length === 0) {
            embed.setDescription(t('shop_empty'));
        } else {
            shopItems.forEach(item => {
                embed.addFields({
                    name: `${t(`item_${item.id}_name`) || item.name} - ${item.price} TC`,
                    value: `*${t(`item_${item.id}_description`) || item.description}*\n**${t('rarity')}:** ${item.rarity}`,
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
                    label: t(`item_${item.id}_name`) || item.name,
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
            .setEmoji('🛒');
            
        const selectButton = new ButtonBuilder()
            .setCustomId('shop_select_button')
            .setLabel(t('shop_select_button_label'))
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🖱️');
            
        const menuRow = new ActionRowBuilder().addComponents(selectMenu);
        const buttonRow = new ActionRowBuilder().addComponents(selectButton, buyButton);
        const components = shopItems.length > 0 ? [menuRow, buttonRow] : [];
        
        if (mainMessage) {
            await mainMessage.edit({ embeds: [embed], components });
        } else {
            await shopChannel.send({ embeds: [embed], components });
        }
    }
    
    // Timer message handling
    if (timerMessage) {
        await timerMessage.edit({ embeds: [timerEmbed] });
    } else {
        await shopChannel.send({ embeds: [timerEmbed] });
    }
    
    return { success: true, channelId };
}


export default {
  data: new SlashCommandBuilder()
    .setName('loja_setup')
    .setDescription('[Admin] Configura ou atualiza as mensagens das lojas no servidor.')
    .setDescriptionLocalizations({ "en-US": "[Admin] Sets up or updates the shop messages on the server." })
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(interaction) {
    const t_pt = await getTranslator(interaction.user.id, null, 'pt-BR');
    const t_en = await getTranslator(interaction.user.id, null, 'en-US');
    
    await interaction.reply({ content: t_pt('shop_updating_message'), ephemeral: true });
    
    // Initial post/update
    const ptResult = await postOrUpdateShopMessage(interaction.client, t_pt, SHOP_CHANNEL_ID_PT, 'pt-BR');
    const enResult = await postOrUpdateShopMessage(interaction.client, t_en, SHOP_CHANNEL_ID_EN, 'en-US');
    
    let feedback = '';
    if (ptResult.success && enResult.success) {
        feedback = t_pt('shop_updated_all');
    } else {
        feedback = t_pt('shop_update_error_header');
        if (!ptResult.success) feedback += `- ${t_pt('shop_update_error_pt', {channelId: ptResult.channelId})}\n`;
        if (!enResult.success) feedback += `- ${t_pt('shop_update_error_en', {channelId: enResult.channelId})}`;
    }

    await interaction.followUp({ content: feedback, ephemeral: true });

    // Set interval to update item listings periodically
    if (!interaction.client.shopUpdateInterval) {
        interaction.client.shopUpdateInterval = setInterval(async () => {
            console.log("Running periodic shop item update...");
            await postOrUpdateShopMessage(interaction.client, t_pt, SHOP_CHANNEL_ID_PT, 'pt-BR', true);
            await postOrUpdateShopMessage(interaction.client, t_en, SHOP_CHANNEL_ID_EN, 'en-US', true);
        }, 3 * 60 * 60 * 1000); // 3 hours
    }
    
     // Set interval to update timers periodically
    if (!interaction.client.shopTimerInterval) {
        interaction.client.shopTimerInterval = setInterval(async () => {
            console.log("Running periodic shop timer update...");
            await postOrUpdateShopMessage(interaction.client, t_pt, SHOP_CHANNEL_ID_PT, 'pt-BR', false);
            await postOrUpdateShopMessage(interaction.client, t_en, SHOP_CHANNEL_ID_EN, 'en-US', false);
        }, 60000); // 1 minute
    }
  },
  postOrUpdateShopMessage,
};
