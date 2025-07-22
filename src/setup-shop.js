import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, StringSelectMenuBuilder } from 'discord.js';
import dotenv from 'dotenv';
import { allItems } from './items.js';
import { getTranslator } from './i18n.js';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const SHOP_CHANNEL_ID_PT = '1396416240263630868';
const SHOP_CHANNEL_ID_EN = '1396725532913303612';
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
    let seconds = totalSeconds % 60;

    if (ms > 10000) { // More than 10 seconds remaining, lock seconds to 00
        seconds = 0;
    }

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

async function postOrUpdateShop(client, t, channelId, locale, updateItems = true) {
    const shopChannel = await client.channels.fetch(channelId).catch(() => null);
    if (!shopChannel || shopChannel.type !== ChannelType.GuildText) {
        console.error(`Shop channel ${channelId} for locale ${locale} not found or is not a text channel.`);
        return;
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

        if (shopItems.length > 0) {
            shopItems.forEach(item => {
                embed.addFields({
                    name: `${t(`item_${item.id}_name`) || item.name} - ${item.price} TC`,
                    value: `**${t('rarity')}:** ${item.rarity}`,
                    inline: false,
                });
            });
        } else {
            embed.setDescription(t('shop_empty'));
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('shop_select_item')
            .setPlaceholder(t('shop_select_placeholder_buy'))
            .setDisabled(shopItems.length === 0)
            .addOptions(
                shopItems.length > 0 ?
                shopItems.map(item => ({
                    label: t(`item_${item.id}_name`) || item.name,
                    description: t('shop_select_item_desc', { price: item.price }),
                    value: item.id,
                })) : [{ label: 'empty', value: 'empty' }]
            );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
            
        let sentMainMessage = shopData.mainMessageId ? await shopChannel.messages.fetch(shopData.mainMessageId).catch(() => null) : null;
        
        if (sentMainMessage) {
            await sentMainMessage.edit({ embeds: [embed], components: [selectRow] });
        } else {
            await shopChannel.bulkDelete(messages.filter(m => m.author.id === client.user.id)).catch(() => {});
            const newMainMessage = await shopChannel.send({ embeds: [embed], components: [selectRow] });
            shopData.mainMessageId = newMainMessage.id;
        }
    }
    
    // Timer message handling
    const nextUpdate = getNextUpdate(3);
    const timeRemaining = nextUpdate.getTime() - Date.now();
    const timerText = t('shop_footer_rotation', { time: formatTime(timeRemaining) }).replace('.', '');

    const timerEmbed = new EmbedBuilder().setColor('#3498DB');
    
    timerEmbed.setDescription(`**${t('shop_footer_rotation_raw')} ${timerText}**`);
    
    let sentTimerMessage = shopData.timerMessageId ? await shopChannel.messages.fetch(shopData.timerMessageId).catch(() => null) : null;

    if (sentTimerMessage) {
        await sentTimerMessage.edit({ embeds: [timerEmbed] }).catch(() => { shopData.timerMessageId = null; });
    } else {
        const newTimerMessage = await shopChannel.send({ embeds: [timerEmbed] });
        shopData.timerMessageId = newTimerMessage.id;
    }
    
    shopStorage.set(locale, shopData);
}

async function runShop() {
    console.log("Setting up shop...");
    const t_pt = await getTranslator(null, null, 'pt-BR');
    const t_en = await getTranslator(null, null, 'en-US');

    // Initial post/update
    await postOrUpdateShop(client, t_pt, SHOP_CHANNEL_ID_PT, 'pt-BR', true);
    await postOrUpdateShop(client, t_en, SHOP_CHANNEL_ID_EN, 'en-US', true);

    // Interval for item rotation and timer update
    setInterval(async () => {
        console.log("Running periodic shop update...");
        const t_pt = await getTranslator(null, null, 'pt-BR'); // Re-fetch translators in case of locale changes
        const t_en = await getTranslator(null, null, 'en-US');
        await postOrUpdateShop(client, t_pt, SHOP_CHANNEL_ID_PT, 'pt-BR', false).catch(e => console.error("Error updating PT shop:", e));
        await postOrUpdateShop(client, t_en, SHOP_CHANNEL_ID_EN, 'en-US', false).catch(e => console.error("Error updating EN shop:", e));
    }, 60000); // 1 minute

    // Interval for item rotation (every 3 hours)
    setInterval(async () => {
        console.log("Running periodic shop item rotation...");
        const t_pt = await getTranslator(null, null, 'pt-BR'); // Re-fetch translators in case of locale changes
        const t_en = await getTranslator(null, null, 'en-US');
        await postOrUpdateShop(client, t_pt, SHOP_CHANNEL_ID_PT, 'pt-BR', true).catch(e => console.error("Error updating PT items:", e));
        await postOrUpdateShop(client, t_en, SHOP_CHANNEL_ID_EN, 'en-US', true).catch(e => console.error("Error updating EN items:", e));
    }, 3 * 60 * 60 * 1000); // 3 hours
}

client.once('ready', async () => {
    console.log('Client ready, setting up shop.');
    await runShop();
    console.log('Shop setup script finished. The process will exit.');
});

client.login(process.env.DISCORD_TOKEN);
