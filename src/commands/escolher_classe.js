import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { classes } from '../classes.js';
import { generateProfileImage } from '../profile-generator.js';

export default {
  data: new SlashCommandBuilder()
    .setName('escolher_classe')
    .setDescription('Escolha sua especialização de combate.')
    .addStringOption(option =>
      option.setName('id_da_classe')
        .setDescription('O ID da classe que você deseja seguir.')
        .setRequired(true)),
  async execute(interaction, { userStats, userItems, userProfiles }) {
    await interaction.deferReply({ ephemeral: true });

    const classId = interaction.options.getString('id_da_classe');
    const userId = interaction.user.id;
    const stats = userStats.get(userId);

    if (!stats || stats.level < 5) {
      return await interaction.editReply({ content: '⚔️ Você ainda não atingiu o nível 5 para escolher uma classe.', ephemeral: true });
    }

    if (stats.class) {
      return await interaction.editReply({ content: '🛡️ Você já escolheu sua classe e não pode mudá-la.', ephemeral: true });
    }

    const chosenClass = classes.find(c => c.id === classId);

    if (!chosenClass) {
      return await interaction.editReply({ content: '❌ Essa classe não existe. Use `/classes` para ver as opções.', ephemeral: true });
    }

    // Atribuir a classe
    stats.class = chosenClass.id;
    userStats.set(userId, stats);

    await interaction.editReply({ content: `✅ Parabéns! Você agora é um **${chosenClass.name}**. Seu perfil foi atualizado para refletir sua nova especialização.` });

    // Atualizar a imagem do perfil para mostrar a nova classe
    const profileInfo = userProfiles.get(userId);
    if (profileInfo?.channelId && profileInfo?.messageId) {
        try {
            const member = await interaction.guild.members.fetch(userId);
            const items = userItems.get(userId) || { inventory: [], equippedBackground: 'default' };

            const newProfileImageBuffer = await generateProfileImage(member, stats, items.equippedBackground);
            const newAttachment = new AttachmentBuilder(newProfileImageBuffer, { name: 'profile-card.png' });

            const profileChannel = await interaction.client.channels.fetch(profileInfo.channelId);
            const profileMessage = await profileChannel.messages.fetch(profileInfo.messageId);
            
            await profileMessage.edit({ files: [newAttachment] });

        } catch (updateError) {
            console.error(`Falha ao editar a imagem de perfil para ${userId} após escolher classe:`, updateError);
        }
    }
  },
};
