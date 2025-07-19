import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Anunciar uma nova Raid')
    .addStringOption(option =>
      option.setName('nivel').setDescription('Nível da Raid').setRequired(true))
    .addStringOption(option =>
      option.setName('dificuldade').setDescription('Dificuldade').setRequired(true)),
    
  async execute(interaction) {
    await interaction.reply({
      content: "Pensando no seu caso...🤔💡",
      ephemeral: true
    });

    const nivel = interaction.options.getString('nivel');
    const dificuldade = interaction.options.getString('dificuldade');
    const user = interaction.user;

    // Nome de usuário do Roblox (usando o nome do Discord como padrão)
    const robloxUsername = user.username;

    const embed = new EmbedBuilder()
      .setTitle("📢 Novo Pedido de Ajuda em Raid!")
      .setDescription(`Gostaria de uma ajuda para superar a Raid **${nivel}** na dificuldade **${dificuldade}**.\n\nFicarei grato!`)
      .setColor("#FF0000")
      .setFooter({ text: `Solicitado por ${user.username}`, iconURL: user.displayAvatarURL() })
      .setTimestamp();
      
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel("🔗 Add no Roblox")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://www.roblox.com/users/profile?username=${encodeURIComponent(robloxUsername)}`),
        new ButtonBuilder()
          .setLabel("💬 Falar no Discord")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/users/${user.id}`)
      );

    const raidChannelId = '1395591154208084049';
    const channel = interaction.client.channels.cache.get(raidChannelId);
    
    if (channel) {
      try {
        await channel.send({ embeds: [embed], components: [row] });
        await interaction.followUp({
          content: `Mandei pros Hunters, vai lá ver <#${raidChannelId}> 😏`,
          ephemeral: true
        });
      } catch (err) {
        console.error("Erro ao enviar a mensagem para o canal:", err);
        await interaction.followUp({
          content: 'Não consegui enviar o anúncio no canal de raids. Verifique minhas permissões!',
          ephemeral: true
        });
      }
    } else {
      console.error(`Canal com ID ${raidChannelId} não encontrado.`);
      await interaction.followUp({
        content: 'Não encontrei o canal para anunciar a raid. Avise um administrador!',
        ephemeral: true
      });
    }
  }
};
