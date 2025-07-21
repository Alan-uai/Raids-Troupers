
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, StringSelectMenuBuilder } from 'discord.js';
import { allItems } from '../items.js';
import { getTranslator } from '../i18n.js';

const SHOP_CHANNEL_ID_PT = '1396416240263630868';
const SHOP_CHANNEL_ID_EN = '1396725532913303612';
const shopStorage = new Map(); // Armazenará os itens e mensagens da loja para cada localidade

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
    return shopStorage.get(locale)?.items || [];
}

function updateShopInventory(locale, nextUpdateTime) {
    console.log(`Updating shop inventory for ${locale}...`);
    const now = new Date();
    let shopItems = [];

    const yearDay = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    
    // Lógica para itens raros/lendários/místicos baseada no tempo
    if (yearDay === 1) { // 1º de Janeiro (Ano Novo)
        const kardecPool = allItems.filter(i => i.source === 'shop' && i.rarity === 'Kardec');
        if (kardecPool.length > 0) shopItems.push(kardecPool[Math.floor(Math.random() * kardecPool.length)]);
    }
    else if (now.getUTCHours() % 24 < 3) { // A cada 24h, nas primeiras 3h do ciclo
        const mythicPool = allItems.filter(i => i.source === 'shop' && i.rarity.includes('Místico'));
        if (mythicPool.length > 0) shopItems.push(mythicPool[Math.floor(Math.random() * mythicPool.length)]);
    } else if (now.getUTCHours() % 12 < 3) { // A cada 12h
        const legendaryPool = allItems.filter(i => i.source === 'shop' && i.rarity.includes('Lendário'));
        if (legendaryPool.length > 0) shopItems.push(legendaryPool[Math.floor(Math.random() * legendaryPool.length)]);
    } else if (now.getUTCHours() % 6 < 3) { // A cada 6h
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

    const currentData = shopStorage.get(locale) || {};
    shopStorage.set(locale, { ...currentData, items: shopItems, nextUpdate: nextUpdateTime });
}

function formatTime(ms) {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}


async function postOrUpdateShopMessage(client, t, channelId, locale, updateItems = true) {
    const shopChannel = await client.channels.fetch(channelId).catch(() => null);
    if (!shopChannel || shopChannel.type !== ChannelType.GuildText) {
        console.error(`Shop channel ${channelId} for locale ${locale} not found or is not a text channel.`);
        return { success: false, channelId };
    }

    let shopData = shopStorage.get(locale) || {};

    if (updateItems) {
        const messages = await shopChannel.messages.fetch({ limit: 10 }).catch(() => []);
        const botMessages = messages.filter(m => m.author.id === client.user.id);
        const mainMessage = botMessages.find(m => m.embeds[0]?.title === t('shop_title'));
        const timerMessage = botMessages.find(m => m.embeds[0]?.description?.includes(t('shop_footer_rotation_raw')));
        shopData.mainMessageId = mainMessage?.id;
        shopData.timerMessageId = timerMessage?.id;

        const shopItems = getShopItems(locale);
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
            .setDisabled(shopItems.length === 0)
            .addOptions(
                shopItems.length > 0 ?
                shopItems.map(item => ({
                    label: t(`item_${item.id}_name`) || item.name,
                    description: t('shop_select_item_desc', { price: item.price }),
                    value: item.id,
                })) : [{ label: 'empty', value: 'empty' }]
            );

        const buyButton = new ButtonBuilder()
            .setCustomId('shop_buy_button')
            .setLabel(t('shop_buy_button_label'))
            .setStyle(ButtonStyle.Success)
            .setEmoji('🛒')
            .setDisabled(shopItems.length === 0);
            
        const row = new ActionRowBuilder().addComponents(selectMenu, buyButton);
            
        let sentMainMessage;
        if (shopData.mainMessageId) {
            sentMainMessage = await shopChannel.messages.fetch(shopData.mainMessageId).catch(() => null);
        }
        
        if (sentMainMessage) {
            await sentMainMessage.edit({ embeds: [embed], components: [row] });
        } else {
            const messagesToDelete = (await shopChannel.messages.fetch({ limit: 50 }).catch(() => [])).filter(m => m.author.id === client.user.id);
            if (messagesToDelete.size > 0) await shopChannel.bulkDelete(messagesToDelete).catch(() => {});
            
            const newMainMessage = await shopChannel.send({ embeds: [embed], components: [row] });
            shopData.mainMessageId = newMainMessage.id;
        }
    }
    
    // Timer message handling
    const nextUpdate = getNextUpdate(3);
    const timeRemaining = nextUpdate.getTime() - Date.now();
    const timerEmbed = new EmbedBuilder()
      .setColor('#3498DB')
      .setDescription(t('shop_footer_rotation', { time: formatTime(timeRemaining) }));

    let sentTimerMessage;
    if(shopData.timerMessageId) {
        sentTimerMessage = await shopChannel.messages.fetch(shopData.timerMessageId).catch(() => null);
    }

    if (sentTimerMessage) {
        await sentTimerMessage.edit({ embeds: [timerEmbed] }).catch(e => {
            if (e.code === 10008) { // Unknown Message
              console.warn(`Timer message for ${locale} was deleted. It will be recreated.`);
              shopData.timerMessageId = null; // Mark as deleted to recreate it
            } else {
              console.error(`Failed to edit timer message for ${locale}:`, e.message);
            }
        });
    } 
    
    if (!shopData.timerMessageId && sentTimerMessage === null) { // Recreate if it was deleted or never existed
        const newTimerMessage = await shopChannel.send({ embeds: [timerEmbed] });
        shopData.timerMessageId = newTimerMessage.id;
    }
    
    shopStorage.set(locale, shopData);
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
    
    // Initial post/update of item listings
    const ptResult = await postOrUpdateShopMessage(interaction.client, t_pt, SHOP_CHANNEL_ID_PT, 'pt-BR', true);
    const enResult = await postOrUpdateShopMessage(interaction.client, t_en, SHOP_CHANNEL_ID_EN, 'en-US', true);
    
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
     if (interaction.client.shopUpdateInterval) {
        clearInterval(interaction.client.shopUpdateInterval);
    }
    interaction.client.shopUpdateInterval = setInterval(async () => {
        console.log("Running periodic shop item update...");
        await postOrUpdateShopMessage(interaction.client, await getTranslator(null, null, 'pt-BR'), SHOP_CHANNEL_ID_PT, 'pt-BR', true).catch(e => console.error("Error updating PT items:", e));
        await postOrUpdateShopMessage(interaction.client, await getTranslator(null, null, 'en-US'), SHOP_CHANNEL_ID_EN, 'en-US', true).catch(e => console.error("Error updating EN items:", e));
    }, 3 * 60 * 60 * 1000); // 3 hours
    
     // Clear any existing timer interval to prevent duplicates
    if (interaction.client.shopTimerInterval) {
        clearInterval(interaction.client.shopTimerInterval);
    }
    
     // Set interval to update timers periodically
    interaction.client.shopTimerInterval = setInterval(async () => {
        await postOrUpdateShopMessage(interaction.client, await getTranslator(null, null, 'pt-BR'), SHOP_CHANNEL_ID_PT, 'pt-BR', false).catch(e => console.error("Error updating PT timer:", e));
        await postOrUpdateShopMessage(interaction.client, await getTranslator(null, null, 'en-US'), SHOP_CHANNEL_ID_EN, 'en-US', false).catch(e => console.error("Error updating EN timer:", e));
    }, 1000); // 1 second
  },
  postOrUpdateShopMessage,
};

    