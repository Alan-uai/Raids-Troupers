import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { classes } from '../classes.js';
import { generateProfileImage } from '../profile-generator.js';
import { getTranslator } from '../i18n.js';

export default {
  data: new SlashCommandBuilder()
    .setName('escolher_classe')
    .setDescription('Escolha sua especialização de combate.')
    .setDescriptionLocalizations({ "en-US": "Choose your combat specialization." })
    .addStringOption(option =>
      option.setName('id_da_classe')
        .setDescription('O ID da classe que você deseja seguir.')
        .setDescriptionLocalizations({ "en-US": "The ID of the class you want to follow." })
        .setRequired(true)),
  async execute(interaction, { userStats, userItems, userProfiles, clans }) {
    const t = await getTranslator(interaction.user.id, userStats);
    await interaction.deferReply({ ephemeral: true });

    const classId = interaction.options.getString('id_da_classe');
    const userId = interaction.user.id;
    const stats = userStats.get(userId);

    if (!stats || stats.level < 5) {
      return await interaction.editReply({ content: t('classes_level_too_low'), ephemeral: true });
    }

    if (stats.class) {
      return await interaction.editReply({ content: t('classes_already_chosen_cannot_change'), ephemeral: true });
    }

    const chosenClass = classes.find(c => c.id === classId);

    if (!chosenClass) {
      return await interaction.editReply({ content: t('classes_not_exist'), ephemeral: true });
    }

    stats.class = chosenClass.id;
    userStats.set(userId, stats);

    await interaction.editReply({ content: t('classes_choice_success', { className: t(`class_${chosenClass.id}_name`) }) });

    const profileInfo = userProfiles.get(userId);
    if (profileInfo?.channelId && profileInfo?.messageId) {
        try {
            const member = await interaction.guild.members.fetch(userId);
            const items = userItems.get(userId) || { inventory: [], equippedBackground: 'default', equippedTitle: 'default' };

            const newProfileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
            const newAttachment = new AttachmentBuilder(newProfileImageBuffer, { name: 'profile-card.png' });

            const profileChannel = await interaction.client.channels.fetch(profileInfo.channelId);
            const profileMessage = await profileChannel.messages.fetch(profileInfo.messageId);
            
            await profileMessage.edit({ files: [newAttachment] });

        } catch (updateError) {
            console.error(`Failed to update profile image for ${userId} after choosing class:`, updateError);
        }
    }
  },
};
