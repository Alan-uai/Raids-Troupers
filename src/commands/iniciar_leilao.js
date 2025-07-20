import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';
import { rareItems } from '../rare-items.js';
import { getTranslator } from '../i18n.js';

export default {
  data: new SlashCommandBuilder()
    .setName('iniciar_leilao')
    .setDescription('[Admin] Inicia um leilão para um item raro.')
    .setDescriptionLocalizations({ "[en-US]": "[Admin] Starts an auction for a rare item." })
    .addStringOption(option =>
      option.setName('item_id')
        .setDescription('O ID do item raro para leiloar.')
        .setDescriptionLocalizations({ "[en-US]": "The ID of the rare item to auction." })
        .setRequired(true))
    .addIntegerOption(option =>
        option.setName('duracao_minutos')
            .setDescription('A duração do leilão em minutos.')
            .setDescriptionLocalizations({ "[en-US]": "The duration of the auction in minutes." })
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(interaction, { activeAuctions, userStats }) {
    // Admin command, can default to one language for replies or use guild locale if needed. For simplicity, using default.
    const t = await getTranslator(interaction.user.id, userStats); 
    const itemId = interaction.options.getString('item_id');
    const durationMinutes = interaction.options.getInteger('duracao_minutos');
    const auctionChannelId = '1396200543665651752'; 

    const itemToAuction = rareItems.find(item => item.id === itemId);

    if (!itemToAuction) {
      return await interaction.reply({ content: t('auction_admin_item_not_found'), ephemeral: true });
    }

    if (activeAuctions.has('current_auction')) {
        return await interaction.reply({ content: t('auction_admin_already_active'), ephemeral: true });
    }

    const endTime = new Date(Date.now() + durationMinutes * 60000);

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🌟 ${t('auction_embed_title')} 🌟`)
      .setDescription(t('auction_embed_description', { itemName: t(`item_${itemToAuction.id}_name`) }))
      .setImage(itemToAuction.url)
      .addFields(
        { name: t('auction_embed_how_to_bid'), value: t('auction_embed_how_to_bid_value') },
        { name: t('auction_embed_min_bid'), value: `${itemToAuction.min_bid} TC`, inline: true },
        { name: t('auction_embed_ends_in'), value: `<t:${Math.floor(endTime.getTime() / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: t('auction_embed_footer') });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`auction_bid_button_${itemId}`)
                .setLabel(t('bid_now_button'))
                .setStyle(ButtonStyle.Success)
                .setEmoji('💰')
        );

    try {
        const auctionChannel = await interaction.client.channels.fetch(auctionChannelId);
        const auctionMessage = await auctionChannel.send({ embeds: [embed], components: [row] });
        
        activeAuctions.set('current_auction', {
            item: itemToAuction,
            messageId: auctionMessage.id,
            channelId: auctionChannel.id,
            endTime: endTime,
            bids: new Map() 
        });
        
        console.log(`Auction for ${itemToAuction.name} scheduled to end at ${endTime}.`);


        await interaction.reply({ content: t('auction_admin_success', { itemName: t(`item_${itemToAuction.id}_name`), channelId: auctionChannelId }), ephemeral: true });

    } catch (error) {
        console.error("Error starting auction:", error);
        await interaction.reply({ content: t('auction_admin_error'), ephemeral: true });
    }
  },
};
