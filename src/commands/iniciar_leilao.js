// src/commands/iniciar_leilao.js
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';
import { rareItems } from '../rare-items.js';

export default {
  data: new SlashCommandBuilder()
    .setName('iniciar_leilao')
    .setDescription('[Admin] Inicia um leilão para um item raro.')
    .addStringOption(option =>
      option.setName('item_id')
        .setDescription('O ID do item raro para leiloar.')
        .setRequired(true))
    .addIntegerOption(option =>
        option.setName('duracao_minutos')
            .setDescription('A duração do leilão em minutos.')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(interaction, { activeAuctions }) {
    const itemId = interaction.options.getString('item_id');
    const durationMinutes = interaction.options.getInteger('duracao_minutos');
    const auctionChannelId = '1396200543665651752'; // Canal #leiloes (substitua pelo seu ID)

    const itemToAuction = rareItems.find(item => item.id === itemId);

    if (!itemToAuction) {
      return await interaction.reply({ content: '❌ Esse item raro não existe.', ephemeral: true });
    }

    if (activeAuctions.has('current_auction')) {
        return await interaction.reply({ content: '❌ Já existe um leilão ativo.', ephemeral: true });
    }

    const endTime = new Date(Date.now() + durationMinutes * 60000);

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🌟 Leilão de Item Raro Iniciado! 🌟`)
      .setDescription(`**${itemToAuction.name}** está agora em leilão!`)
      .setImage(itemToAuction.url)
      .addFields(
        { name: 'Como Participar?', value: 'Use o comando `/dar_lance <valor>` para fazer seu lance.\nO maior lance ao final do tempo vence!' },
        { name: 'Lance Mínimo', value: `${itemToAuction.min_bid} TC`, inline: true },
        { name: 'Término do Leilão', value: `<t:${Math.floor(endTime.getTime() / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: 'Boa sorte a todos os participantes!' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`auction_bid_button_${itemId}`)
                .setLabel('Dar Lance')
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
            bids: new Map() // Armazena { userId: amount }
        });
        
        // Agendar o fim do leilão
        setTimeout(() => {
            // Lógica para finalizar o leilão será adicionada no index.js
            // Por agora, apenas removemos o leilão ativo
             console.log(`Leilão para ${itemToAuction.name} deveria terminar agora.`);
        }, durationMinutes * 60000);


        await interaction.reply({ content: `✅ Leilão para **${itemToAuction.name}** iniciado no canal <#${auctionChannelId}> com sucesso!`, ephemeral: true });

    } catch (error) {
        console.error("Erro ao iniciar leilão:", error);
        await interaction.reply({ content: '❌ Ocorreu um erro ao tentar iniciar o leilão. Verifique o ID do canal.', ephemeral: true });
    }
  },
};
