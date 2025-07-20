import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
import { shopItems } from '../shop-items.js';
import { getTranslator } from '../i18n.js';

const SHOP_CHANNEL_ID = '1396416240263630868';
let shopMessageId = null;

async function updateShopMessage(interaction, t) {
    const shopChannel = await interaction.client.channels.fetch(SHOP_CHANNEL_ID).catch(() => null);
    if (!shopChannel || shopChannel.type !== ChannelType.GuildText) {
        if (interaction.isCommand()) {
            await interaction.reply({ content: t('shop_channel_not_found'), ephemeral: true });
        }
        return;
    }

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle(t('shop_title'))
      .setDescription(t('shop_description'))
      .setTimestamp();

    const rows = [];
    let currentRow = new ActionRowBuilder();

    shopItems.forEach((item, index) => {
        embed.addFields({
            name: `${t(`item_${item.id}_name`)} - ${item.price} TC`,
            value: `*${t(`item_${item.id}_description`)}*`,
            inline: true,
        });
        
        currentRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`buy_${item.id}`)
                .setLabel(t('buy_button_label', { itemName: t(`item_${item.id}_name`) }))
                .setStyle(ButtonStyle.Success)
                .setEmoji('🛒')
        );

        if (currentRow.components.length === 5 || index === shopItems.length - 1) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
    });

    try {
        if (shopMessageId) {
            const message = await shopChannel.messages.fetch(shopMessageId).catch(() => null);
            if (message) {
                await message.edit({ embeds: [embed], components: rows });
            } else {
                shopMessageId = null; // Message was deleted, create a new one
            }
        }
        
        if (!shopMessageId) {
            const messages = await shopChannel.messages.fetch({ limit: 10 });
            const botMessage = messages.find(m => m.author.id === interaction.client.user.id && m.embeds.length > 0 && m.embeds[0].title === t('shop_title'));

            if (botMessage) {
                shopMessageId = botMessage.id;
                await botMessage.edit({ embeds: [embed], components: rows });
            } else {
                const newMessage = await shopChannel.send({ embeds: [embed], components: rows });
                shopMessageId = newMessage.id;
            }
        }
        
        if (interaction.isCommand() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: t('shop_updated', { channelId: SHOP_CHANNEL_ID }), ephemeral: true });
        }
    } catch (error) {
        console.error("Failed to update shop message:", error);
    }
}


export default {
  data: new SlashCommandBuilder()
    .setName('loja')
    .setDescription('Atualiza a mensagem da loja no canal dedicado.')
    .setDescriptionLocalizations({ "en-US": "Updates the shop message in the dedicated channel." }),
  async execute(interaction, { userStats }) {
    const t = await getTranslator(interaction.user.id, userStats);
    await updateShopMessage(interaction, t);
  },
  updateShopMessage,
};
