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
        ))
    .addStringOption(option =>
        option.setName('tipo-chat')
            .setDescription('Escolha o tipo de canal de discussão para a raid (padrão: Texto)')
            .setRequired(false)
            .addChoices(
                { name: 'Texto', value: 'texto' },
                { name: 'Voz', value: 'voz' }
            )),
    
  async execute(interaction) {
    await interaction.reply({
      content: "Pensando no seu caso...🤔💡",
      ephemeral: true
    });

    const nivel = interaction.options.getString('nivel');
    const dificuldade = interaction.options.getString('dificuldade');
    const user = interaction.user;

    const robloxUsername = user.username;

    // customId: action_subAction_requesterId
    const joinButtonId = `raid_join_${user.id}`;

    const embed = new EmbedBuilder()
      .setTitle("📢 Novo Pedido de Ajuda em Raid!")
      .setDescription(`Gostaria de uma ajuda para superar a Raid **${nivel}** na dificuldade **${dificuldade}**.\n\nFicarei grato!`)
      .setColor("#FF0000")
      .addFields({ name: 'Membros na Equipe', value: `1/5`, inline: true })
      .setFooter({ text: `Solicitado por ${user.username}`, iconURL: user.displayAvatarURL() })
      .setTimestamp();
      
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

    const raidChannelId = '1395591154208084049'; 
    const channel = interaction.client.channels.cache.get(raidChannelId);
    
    if (channel) {
      try {
        await channel.send({ embeds: [embed], components: [row] });
        await interaction.editReply({
          content: `Mandei pros Hunters, vai lá ver <#${raidChannelId}> 😏`
        });
      } catch (err) {
        console.error("Erro ao enviar a mensagem para o canal:", err);
        await interaction.editReply({
          content: 'Não consegui enviar o anúncio no canal de raids. Verifique minhas permissões!'
        });
      }
    } else {
      console.error(`Canal com ID ${raidChannelId} não encontrado.`);
      await interaction.editReply({
        content: 'Não encontrei o canal para anunciar a raid. Avise um administrador!'
      });
    }
  }
};