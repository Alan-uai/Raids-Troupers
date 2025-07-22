
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, StringSelectMenuBuilder } from 'discord.js';
import { allItems } from './items.js';

const shopStorage = new Map();

function getNextUpdate(hours) {
    const now = new Date();
    const nextUpdate = new Date(now);
    nextUpdate.setUTCHours(Math.ceil(now.getUTCHours() / hours) * hours, 0, 0, 0);
    if (nextUpdate <= now) {
        nextUpdate.setUTCHours(nextUpdate.getUTCHours() + hours);
    }
    return nextUpdate;
}

function updateShopInventory(locale, nextUpdateTime) {
    console.log(`Updating shop inventory for ${locale}...`);
    const now = new Date();
    let shopItems = [];

    const yearDay = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    
    if (yearDay === 1) {
        const kardecPool = allItems.filter(i => i.source === 'shop' && i.rarity === 'Kardec');
        if (kardecPool.length > 0) shopItems.push(kardecPool[Math.floor(Math.random() * kardecPool.length)]);
    } else if (now.getUTCHours() % 24 < 3) {
        const mythicPool = allItems.filter(i => i.source === 'shop' && i.rarity.includes('Místico'));
        if (mythicPool.length > 0) shopItems.push(mythicPool[Math.floor(Math.random() * mythicPool.length)]);
    } else if (now.getUTCHours() % 12 < 3) {
        const legendaryPool = allItems.filter(i => i.source === 'shop' && i.rarity.includes('Lendário'));
        if (legendaryPool.length > 0) shopItems.push(legendaryPool[Math.floor(Math.random() * legendaryPool.length)]);
    } else if (now.getUTCHours() % 6 < 3) {
        const rarePool = allItems.filter(i => i.source === 'shop' && i.rarity.includes('Raro'));
        if (rarePool.length > 0) shopItems.push(rarePool[Math.floor(Math.random() * rarePool.length)]);
    }

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

function getShopItems(locale) {
    const rotationHours = 3;
    const nextUpdateTime = getNextUpdate(rotationHours).getTime();
    
    if (!shopStorage.has(locale) || shopStorage.get(locale).nextUpdate <= Date.now()) {
        updateShopInventory(locale, nextUpdateTime);
    }
    return shopStorage.get(locale)?.items || [];
}

function formatTime(ms) {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export async function postOrUpdateShopMessage(client, t, channelId, locale, updateItems = true) {
    const shopChannel = await client.channels.fetch(channelId).catch(() => null);
    if (!shopChannel || shopChannel.type !== ChannelType.GuildText) {
        console.error(`Shop channel ${channelId} for locale ${locale} not found or is not a text channel.`);
        return;
    }

    let shopData = shopStorage.get(locale) || {};
    
    if (updateItems) {
        const messages = await shopChannel.messages.fetch({ limit: 10 }).catch(() => new Map());
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
                const itemName = t(`item_${item.id}_name`) || item.name;
                const bonusText = item.bonus ? `(+${item.bonus}% XP)` : '';
                embed.addFields({
                    name: `**${itemName}**`,
                    value: `*${t('price')}: ${item.price} TC ${bonusText}*`,
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
            
        const row = new ActionRowBuilder().addComponents(selectMenu);
            
        let sentMainMessage = shopData.mainMessageId ? await shopChannel.messages.fetch(shopData.mainMessageId).catch(() => null) : null;
        
        if (sentMainMessage) {
            await sentMainMessage.edit({ embeds: [embed], components: [row] });
        } else {
            await shopChannel.bulkDelete(messages.filter(m => m.author.id === client.user.id)).catch(() => {});
            const newMainMessage = await shopChannel.send({ embeds: [embed], components: [row] });
            shopData.mainMessageId = newMainMessage.id;
        }
    }
    
    // Timer message handling
    const nextUpdate = getNextUpdate(3);
    const timeRemaining = nextUpdate.getTime() - Date.now();
    const timerText = t('shop_footer_rotation', { time: formatTime(timeRemaining) });
    
    const timerEmbed = new EmbedBuilder()
      .setColor('#3498DB')
      .setDescription(`**${timerText}**`);

    let sentTimerMessage = shopData.timerMessageId ? await shopChannel.messages.fetch(shopData.timerMessageId).catch(() => null) : null;

    if (sentTimerMessage) {
        await sentTimerMessage.edit({ embeds: [timerEmbed] }).catch(e => {
            if (e.code === 10008) { 
              console.warn(`Timer message for ${locale} was deleted. It will be recreated.`);
              shopData.timerMessageId = null;
            } else {
              console.error(`Failed to edit timer message for ${locale}:`, e.message);
            }
        });
    } 
    
    if (!sentTimerMessage) {
        const newTimerMessage = await shopChannel.send({ embeds: [timerEmbed] });
        shopData.timerMessageId = newTimerMessage.id;
    }
    
    shopStorage.set(locale, shopData);
}
