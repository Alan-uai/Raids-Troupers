import { SlashCommandBuilder } from 'discord.js';
import { getTranslator } from '../i18n.js';

export default {
  data: new SlashCommandBuilder()
    .setName('dar_lance')
    .setDescription('Faça um lance no leilão ativo.')
    .setDescriptionLocalizations({ "en-US": "Place a bid in the active auction." })
    .addIntegerOption(option =>
      option.setName('valor')
        .setDescription('A quantidade de Troup Coins que você deseja ofertar.')
        .setDescriptionLocalizations({ "en-US": "The amount of Troup Coins you want to bid." })
        .setRequired(true)),
  async execute(interaction, { activeAuctions, userStats }) {
    const t = await getTranslator(interaction.user.id, userStats);
    const bidAmount = interaction.options.getInteger('valor');
    const userId = interaction.user.id;

    const auction = activeAuctions.get('current_auction');

    if (!auction) {
      return await interaction.reply({ content: t('bid_no_active_auction'), ephemeral: true });
    }

    if (new Date() > auction.endTime) {
      return await interaction.reply({ content: t('bid_auction_ended'), ephemeral: true });
    }
    
    const item = auction.item;
    if (bidAmount < item.min_bid) {
        return await interaction.reply({ content: t('bid_too_low', { min_bid: item.min_bid }), ephemeral: true });
    }

    const stats = userStats.get(userId);
    if (!stats || stats.coins < bidAmount) {
      return await interaction.reply({ content: t('bid_not_enough_coins'), ephemeral: true });
    }

    const currentBids = auction.bids;
    const highestBidEntry = [...currentBids.entries()].sort((a, b) => b[1] - a[1])[0];
    const highestBid = highestBidEntry ? highestBidEntry[1] : 0;
    
    if (bidAmount <= highestBid) {
        return await interaction.reply({ content: t('bid_must_be_higher', { highestBid }), ephemeral: true });
    }

    currentBids.set(userId, bidAmount);
    
    await interaction.reply({ content: t('bid_success', { bidAmount, itemName: t(`item_${item.id}_name`) }), ephemeral: true });
  },
};
