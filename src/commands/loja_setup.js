import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, StringSelectMenuBuilder } from 'discord.js';
import { allItems } from '../items.js';
import { getTranslator } from '../i18n.js';

const SHOP_CHANNEL_ID = '1396416240263630868';
let shopMessageId = null; 

async function updateShopMessage(client, t) {
    const shopChannel = await client.channels.fetch(SHOP_CHANNEL_ID).catch(() => null);
    if (!shopChannel || shopChannel.type !== ChannelType.GuildText) {
        console.error('Shop channel not found or is not a text channel.');
        return;
    }

    const shopItems = allItems.filter(item => item.source === 'shop');

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle(t('shop_title'))
      .setDescription(t('shop_description'))
      .setTimestamp();

    shopItems.forEach(item => {
        embed.addFields({
            name: `${t(`item_${item.id}_name`)} - ${item.price} TC`,
            value: `\`\`\`${t(`item_${item.id}_description`)}\`\`\``,
            inline: false,
        });
    });
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('shop_select_item')
        .setPlaceholder(t('shop_select_placeholder'))
        .addOptions(
            shopItems.map(item => ({
                label: t(`item_${item.id}_name`),
                description: t('shop_select_item_desc', { price: item.price }),
                value: item.id,
            }))
        );

    const buyButton = new ButtonBuilder()
        .setCustomId('shop_buy_button')
        .setLabel(t('shop_buy_button_label'))
        .setStyle(ButtonStyle.Success)
        .setEmoji('🛒');

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const buttonRow = new ActionRowBuilder().addComponents(buyButton);


    try {
        const messages = await shopChannel.messages.fetch({ limit: 10 });
        const botMessage = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].title === t('shop_title'));

        if (botMessage) {
            shopMessageId = botMessage.id;
            await botMessage.edit({ embeds: [embed], components: [row, buttonRow] });
        } else {
            const newMessage = await shopChannel.send({ embeds: [embed], components: [row, buttonRow] });
            shopMessageId = newMessage.id;
        }
    } catch (error) {
        console.error("Failed to update or send shop message:", error);
    }
}


export default {
  data: new SlashCommandBuilder()
    .setName('loja_setup')
    .setDescription('[Admin] Configura ou atualiza a mensagem da loja no canal dedicado.')
    .setDescriptionLocalizations({ "en-US": "[Admin] Sets up or updates the shop message in the dedicated channel." })
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(interaction) {
    const t = await getTranslator(interaction.user.id, null);
    await interaction.reply({ content: t('shop_updating_message'), ephemeral: true });
    await updateShopMessage(interaction.client, t);
  },
  updateShopMessage, 
};

    