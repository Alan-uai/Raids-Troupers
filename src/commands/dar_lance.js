// src/commands/dar_lance.js
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('dar_lance')
    .setDescription('Faça um lance no leilão ativo.')
    .addIntegerOption(option =>
      option.setName('valor')
        .setDescription('A quantidade de Troup Coins que você deseja ofertar.')
        .setRequired(true)),
  async execute(interaction, { activeAuctions, userStats }) {
    const bidAmount = interaction.options.getInteger('valor');
    const userId = interaction.user.id;

    const auction = activeAuctions.get('current_auction');

    if (!auction) {
      return await interaction.reply({ content: '❌ Não há nenhum leilão ativo no momento.', ephemeral: true });
    }

    if (new Date() > auction.endTime) {
      return await interaction.reply({ content: '❌ Este leilão já terminou!', ephemeral: true });
    }
    
    const item = auction.item;
    if (bidAmount < item.min_bid) {
        return await interaction.reply({ content: `❌ Seu lance precisa ser de no mínimo ${item.min_bid} Troup Coins.`, ephemeral: true });
    }

    const stats = userStats.get(userId);
    if (!stats || stats.coins < bidAmount) {
      return await interaction.reply({ content: `💰 Você não tem Troup Coins suficientes para fazer esse lance.`, ephemeral: true });
    }

    const currentBids = auction.bids;
    const highestBidEntry = [...currentBids.entries()].sort((a, b) => b[1] - a[1])[0];
    const highestBid = highestBidEntry ? highestBidEntry[1] : 0;
    
    if (bidAmount <= highestBid) {
        return await interaction.reply({ content: `❌ Você precisa fazer um lance maior que o lance atual de ${highestBid} TC.`, ephemeral: true });
    }

    // Armazena o lance do usuário
    currentBids.set(userId, bidAmount);
    
    await interaction.reply({ content: `✅ Seu lance de **${bidAmount} TC** para **${item.name}** foi registrado com sucesso! Você será notificado se for o vencedor.`, ephemeral: true });
  },
};
