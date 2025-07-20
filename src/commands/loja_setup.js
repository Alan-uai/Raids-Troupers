
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } from 'discord.js';
import { shopItems } from '../shop-items.js';
import { getTranslator } from '../i18n.js';

const SHOP_CHANNEL_ID = '1396416240263630868';
let shopMessageId = null; 

async function updateShopMessage(client, t) {
    const shopChannel = await client.channels.fetch(SHOP_CHANNEL_ID).catch(() => null);
    if (!shopChannel || shopChannel.type !== ChannelType.GuildText) {
        console.error('Shop channel not found or is not a text channel.');
        return;
    }

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle(t('shop_title'))
      .setDescription(t('shop_description'))
      .setTimestamp();

    shopItems.forEach(item => {
        embed.addFields({
            name: `${t(`item_${item.id}_name`)} - ${item.price} TC`,
            value: `*${t(`item_${item.id}_description`)}*`,
            inline: false,
        });
    });

    const rows = [];
    let currentRow = new ActionRowBuilder();

    shopItems.forEach((item, index) => {
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
        const messages = await shopChannel.messages.fetch({ limit: 10 });
        const botMessage = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].title === t('shop_title'));

        if (botMessage) {
            shopMessageId = botMessage.id;
            await botMessage.edit({ embeds: [embed], components: rows });
        } else {
            const newMessage = await shopChannel.send({ embeds: [embed], components: rows });
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
