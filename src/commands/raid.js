import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { checkMissionCompletion } from '../mission-system.js';

// Map para armazenar o ID da última mensagem de raid de cada usuário
const userLastRaidMessage = new Map();

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

  async execute(interaction, { userStats, userMissions }) { // Pass userStats and userMissions here
    // Responder imediatamente para evitar timeout
    await interaction.deferReply({ ephemeral: true });

    const nivel = interaction.options.getString('nivel');
    const dificuldade = interaction.options.getString('dificuldade');
    const user = interaction.user;

    const member = await interaction.guild.members.fetch(user.id);
    const robloxUsername = member.displayName || user.username;
    const raidChannelId = '1395591154208084049'; 
    const channel = interaction.client.channels.cache.get(raidChannelId);

    if (!channel) {
      console.error(`Canal com ID ${raidChannelId} não encontrado.`);
      return await interaction.editReply({
        content: 'Não encontrei o canal para anunciar a raid. Avise um administrador!'
      });
    }

    // Delete existing raid announcement from this user (processo assíncrono em background)
    const deletePromise = (async () => {
      const lastMessageId = userLastRaidMessage.get(user.id);
      if (lastMessageId) {
        try {
          const lastMessage = await channel.messages.fetch(lastMessageId).catch(() => null);
          if (lastMessage) {
            if (lastMessage.thread) {
              await lastMessage.thread.delete().catch(() => {});
            }
            await lastMessage.delete().catch(() => {});
          }
          // Remover o ID antigo do mapa
          userLastRaidMessage.delete(user.id);
        } catch (deleteErr) {
          console.log(`Erro ao deletar mensagem anterior: ${deleteErr.message}`);
          // Limpar ID inválido do mapa
          userLastRaidMessage.delete(user.id);
        }
      }
    })();

    // Não aguardar a conclusão da deleção para prosseguir

    const embed = new EmbedBuilder()
      .setTitle("📢 Novo Pedido de Ajuda em **__Raid__**!")
      .setDescription(`Gostaria de uma ajuda para superar a **__Raid__ __${nivel}__** na dificuldade **__${dificuldade}__**.\n\n__Ficarei grato!__`)
      .setColor("#FF0000")
      .addFields({ name: '👥 Membros na Equipe', value: `**1/5**`, inline: true })
      .setFooter({ text: `Solicitado por ${member.displayName || user.username}`, iconURL: user.displayAvatarURL() })
      .setTimestamp();

    // Create the message first, then update the button with the message ID
    try {
      const sentMessage = await channel.send({ embeds: [embed], components: [] });

      // Now create the buttons with the actual message ID
      const joinButtonId = `raid_join_${user.id}_${sentMessage.id}`;

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel("Add")
            .setEmoji('👤')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://www.roblox.com/users/profile?username=${encodeURIComponent(robloxUsername)}`),
          new ButtonBuilder()
            .setLabel("DM")
            .setEmoji('✉️')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/users/${user.id}`),
          new ButtonBuilder()
            .setCustomId(joinButtonId)
            .setLabel("Entrar")
            .setStyle(ButtonStyle.Success)
            .setEmoji('🤝')
        );

      // Update the message with buttons
      await sentMessage.edit({ embeds: [embed], components: [row] });

      // Armazenar o ID da nova mensagem para este usuário
      userLastRaidMessage.set(user.id, sentMessage.id);
      
      // Update stats for raid created
      const stats = userStats.get(user.id) || { level: 1, xp: 0, coins: 0, class: null, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0, reputation: 0, totalRatings: 0 };
      stats.raidsCreated += 1;
      userStats.set(user.id, stats);
      
      // Check for mission completion
      await checkMissionCompletion(interaction.user, 'RAID_CREATED', interaction.channel, { userStats, userMissions });

      await interaction.editReply({
        content: `Mandei pros Hunters, vai lá ver <#${raidChannelId}> 😏`
      });
    } catch (err) {
      console.error("Erro ao enviar a mensagem para o canal:", err);
      await interaction.editReply({
        content: 'Não consegui enviar o anúncio no canal de raids. Verifique minhas permissões!'
      });
    }
  }
};
