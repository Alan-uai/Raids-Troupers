import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Anunciar uma nova Raid')
    .addStringOption(option =>
      option.setName('nivel')
        .setDescription('Nível da Raid')
        .setRequired(true)
        .addChoices(
          { name: 'Level 200', value: '200' },
          { name: 'Level 600', value: '600' },
          { name: 'Level 1200', value: '1200' },
          { name: 'Level 1500', value: '1500' },
          { name: 'Level 1700', value: '1700' }
        ))
    .addStringOption(option =>
      option.setName('dificuldade')
        .setDescription('Dificuldade da Raid')
        .setRequired(true)
        .addChoices(
            { name: 'Fácil', value: 'Fácil' },
            { name: 'Média', value: 'Média' },
            { name: 'Difícil', value: 'Difícil' }
        )),

  async execute(interaction) {
    const nivel = interaction.options.getString('nivel');
    const dificuldade = interaction.options.getString('dificuldade');
    const user = interaction.user;

    const robloxUsername = user.username;
    const raidChannelId = '1395591154208084049'; 
    const channel = interaction.client.channels.cache.get(raidChannelId);

    if (!channel) {
      console.error(`Canal com ID ${raidChannelId} não encontrado.`);
      return await interaction.reply({
        content: 'Não encontrei o canal para anunciar a raid. Avise um administrador!',
        ephemeral: true
      });
    }

    // Delete existing raid announcements from this user
    try {
      const messages = await channel.messages.fetch({ limit: 50 });
      const userRaidMessages = messages.filter(msg => 
        msg.embeds.length > 0 && 
        msg.embeds[0].footer && 
        msg.embeds[0].footer.text.includes(user.username)
      );
      
      for (const msg of userRaidMessages.values()) {
        try {
          if (msg.thread) {
            await msg.thread.delete();
          }
          await msg.delete();
        } catch (deleteErr) {
          console.log(`Não foi possível deletar mensagem anterior: ${deleteErr.message}`);
        }
      }
    } catch (fetchErr) {
      console.log(`Erro ao buscar mensagens anteriores: ${fetchErr.message}`);
    }

    const embed = new EmbedBuilder()
      .setTitle("📢 Novo Pedido de Ajuda em Raid!")
      .setDescription(`Gostaria de uma ajuda para superar a Raid **${nivel}** na dificuldade **${dificuldade}**.\n\nFicarei grato!`)
      .setColor("#FF0000")
      .addFields({ name: 'Membros na Equipe', value: `1/5`, inline: true })
      .setFooter({ text: `Solicitado por ${user.username}`, iconURL: user.displayAvatarURL() })
      .setTimestamp();

    // Create the message first, then update the button with the message ID
    try {
      const sentMessage = await channel.send({ embeds: [embed], components: [] });
      
      // Now create the buttons with the actual message ID
      const joinButtonId = `raid_join_${user.id}_${sentMessage.id}`;
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel("🔗 Add no Roblox")
            .setStyle(ButtonStyle.Link)
            .setURL(`https://www.roblox.com/users/profile?username=${encodeURIComponent(robloxUsername)}`),
          new ButtonBuilder()
            .setLabel("Chamar Pessoal")
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/users/${user.id}`),
          new ButtonBuilder()
            .setCustomId(joinButtonId)
            .setLabel("Juntar-se à Raid")
            .setStyle(ButtonStyle.Success)
            .setEmoji('🤝')
        );

      // Update the message with buttons
      await sentMessage.edit({ embeds: [embed], components: [row] });
      
      await interaction.reply({
        content: `Mandei pros Hunters, vai lá ver <#${raidChannelId}> 😏`,
        ephemeral: true
      });
    } catch (err) {
      console.error("Erro ao enviar a mensagem para o canal:", err);
      await interaction.reply({
        content: 'Não consegui enviar o anúncio no canal de raids. Verifique minhas permissões!',
        ephemeral: true
      });
    }
  }
};
