import { AttachmentBuilder, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { generateProfileImage } from '../profile-generator.js';
import { getTranslator } from '../i18n.js';
import { assignMissions, postMissionList } from '../mission-system.js';
import { data } from './perfil.data.js';
import { milestones } from '../milestones.js';

const PROFILE_CATEGORY_ID = '1395589412661887068';

async function createOrUpdateProfile(interaction, { userStats, userProfiles, userItems, clans, userMissions, client }) {
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;
    const t = await getTranslator(interaction.user.id, userStats);
    
    await interaction.deferReply({ ephemeral: true });

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
        return await interaction.editReply({ content: t('profile_user_not_found'), ephemeral: true });
    }

    // --- Garante que o usuário tem dados básicos ---
    if (!userStats.has(targetUser.id)) {
        const userLocale = targetUser.locale || 'pt-BR';
        const initialStats = { level: 1, xp: 0, coins: 100, class: null, clanId: null, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0, reputation: 0, totalRatings: 0, locale: userLocale, autoCollectMissions: false, completedMilestones: {} };
        userStats.set(targetUser.id, initialStats);
    }
    if (!userItems.has(targetUser.id)) {
        const initialItems = { inventory: [], equippedBackground: 'default', equippedTitle: 'default', equippedBorder: null };
        userItems.set(targetUser.id, initialItems);
    }
    if (!userMissions.has(targetUser.id)) {
        assignMissions(targetUser.id, userMissions, userStats.get(targetUser.id));
    }

    // Se o perfil (canal) NÃO existe, cria tudo.
    if (!userProfiles.has(targetUser.id)) {
        if (!isSelf) {
            return await interaction.editReply({ content: t('profile_create_not_self'), ephemeral: true });
        }
        
        const category = interaction.guild.channels.cache.get(PROFILE_CATEGORY_ID);
        if (!category || category.type !== ChannelType.GuildCategory) {
            console.error(`Category with ID ${PROFILE_CATEGORY_ID} not found or is not a category.`);
            return await interaction.editReply({ content: t('profile_creation_error_category'), ephemeral: true });
        }

        try {
            const channel = await interaction.guild.channels.create({
                name: member.displayName,
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.CreatePublicThreads, PermissionsBitField.Flags.CreatePrivateThreads, PermissionsBitField.Flags.SendMessagesInThreads] },
                    { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory] },
                    { id: interaction.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageThreads] }
                ],
            });

            const stats = userStats.get(member.id);
            const items = userItems.get(member.id);
            const profileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
            const attachment = new AttachmentBuilder(profileImageBuffer, { name: 'profile-card.png' });
            
            await channel.send({ content: t('welcome_new_user', { user: member }) });
            const profileMessage = await channel.send({ files: [attachment] });

            const profileActionsEmbed = new EmbedBuilder()
                .setColor('#2c2f33')
                .setTitle(t('profile_actions_title'))
                .setDescription(t('profile_actions_description'));

            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`profile_equip_${member.id}`).setLabel(t('equip_item_button')).setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
                    new ButtonBuilder().setCustomId(`profile_class_${member.id}`).setLabel(t('choose_class_button')).setStyle(ButtonStyle.Secondary).setEmoji('⚔️')
                );

            await channel.send({ embeds: [profileActionsEmbed], components: [actionRow] });

            userProfiles.set(member.id, {
                channelId: channel.id,
                messageId: profileMessage.id
            });
            
            const missionsThread = await channel.threads.create({ name: t('missions_thread_title'), autoArchiveDuration: 10080, reason: t('missions_thread_reason', { username: member.displayName }) });
            await postMissionList(missionsThread, member.id, 'daily', { userMissions, userStats });

            const milestoneThread = await channel.threads.create({ name: t('milestones_thread_title'), autoArchiveDuration: 10080, reason: t('milestones_thread_reason', { username: member.displayName }) });
            for (const milestone of milestones) {
                const embed = new EmbedBuilder()
                    .setTitle(t(`milestone_${milestone.id}_title`))
                    .setDescription(t(`milestone_${milestone.id}_description`))
                    .addFields({ name: t('progress'), value: `0 / ${milestone.goal}`})
                    .setColor('#F1C40F');
                await milestoneThread.send({ embeds: [embed] });
            }

            const exclusiveShopThread = await channel.threads.create({ name: t('exclusive_shop_thread_title'), autoArchiveDuration: 10080, reason: t('exclusive_shop_thread_reason', { username: member.displayName }) });
            await exclusiveShopThread.send({ content: t('exclusive_shop_thread_description') });

            await interaction.editReply({ content: t('profile_creation_success', { channelId: channel.id }), ephemeral: true });

        } catch (error) {
            console.error(`Failed to create channel or profile for ${member.displayName}:`, error);
            userStats.delete(member.id);
            userItems.delete(member.id);
            userMissions.delete(member.id);
            await interaction.editReply({ content: t('profile_creation_error_generic'), ephemeral: true });
        }

    } else { 
        try {
            const stats = userStats.get(targetUser.id);
            const items = userItems.get(targetUser.id);
            const profileInfo = userProfiles.get(targetUser.id);

            const profileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
            const attachment = new AttachmentBuilder(profileImageBuffer, { name: 'profile-card.png' });
            
            const profileChannel = await client.channels.fetch(profileInfo.channelId);
            const profileMessage = await profileChannel.messages.fetch(profileInfo.messageId);
            await profileMessage.edit({ files: [attachment] });

            await interaction.editReply({ content: t('profile_show', { channelId: profileInfo.channelId }), ephemeral: true });

        } catch (error) {
            console.error(`Failed to show/update profile for ${member.displayName}:`, error);
            await interaction.editReply({ content: t('profile_show_error'), ephemeral: true });
        }
    }
}

export default {
    data: data,
    execute: createOrUpdateProfile,
};
