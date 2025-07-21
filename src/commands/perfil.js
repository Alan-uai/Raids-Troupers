import { AttachmentBuilder, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { generateProfileImage } from '../profile-generator.js';
import { getTranslator } from '../i18n.js';
import { assignMissions } from '../mission-system.js';
import { data } from './perfil.data.js';
import { missions as missionPool } from '../missions.js';
import { milestones } from '../milestones.js';

const PROFILE_CATEGORY_ID = '1395589412661887068';

async function createOrUpdateProfile(interaction, { userStats, userProfiles, userItems, clans, userMissions }) {
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
        // Apenas o próprio usuário pode criar seu perfil
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
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory], deny: [PermissionsBitField.Flags.SendMessages] },
                    { id: interaction.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageThreads] }
                ],
            });

            const stats = userStats.get(member.id);
            const items = userItems.get(member.id);
            const profileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
            const attachment = new AttachmentBuilder(profileImageBuffer, { name: 'profile-card.png' });
            
            await channel.send({ content: t('welcome_new_user', { user: member }) });
            const profileMessage = await channel.send({ files: [attachment] });
            
            userProfiles.set(member.id, {
                channelId: channel.id,
                messageId: profileMessage.id
            });
            
            // --- Tópico de Missões Diárias ---
            const dailyMissionThread = await channel.threads.create({ name: t('daily_missions_thread_title'), autoArchiveDuration: 10080, reason: t('missions_thread_reason', { username: member.displayName }) });
            const autoCollectRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`mission_autocollect_toggle_${member.id}`).setLabel(t('missions_autocollect_button')).setStyle(ButtonStyle.Secondary).setEmoji('⚙️'));
            await dailyMissionThread.send({ content: t('missions_autocollect_description'), components: [autoCollectRow] });
            
            const activeMissions = userMissions.get(member.id) || {};
            for (const missionProgress of activeMissions.daily) {
                const missionDetails = missionPool.find(m => m.id === missionProgress.id);
                if (missionDetails) {
                    const rewardText = `${missionDetails.reward.xp} XP & ${missionDetails.reward.coins} TC`;
                    const missionEmbed = new EmbedBuilder().setTitle(t(`mission_${missionDetails.id}_title`)).setDescription(t(`mission_${missionDetails.id}_description`)).addFields({name: t('progress'), value: `${missionProgress.progress} / ${missionDetails.goal}`, inline: true}, {name: t('reward'), value: rewardText, inline: true}).setColor('#3498DB').setFooter({text: `ID: ${missionDetails.id}`});
                    const missionMessage = await dailyMissionThread.send({ embeds: [missionEmbed] });
                    missionProgress.messageId = missionMessage.id;
                }
            }
            userMissions.set(member.id, activeMissions);

             // --- Tópico de Missão Semanal ---
            const weeklyMissionThread = await channel.threads.create({ name: t('weekly_mission_thread_title'), autoArchiveDuration: 10080, reason: t('missions_thread_reason', { username: member.displayName }) });
            const weeklyMission = activeMissions.weekly;
            if (weeklyMission) {
                const missionDetails = missionPool.find(m => m.id === weeklyMission.id);
                if(missionDetails) {
                    const rewardText = `Item: ${t(`item_${missionDetails.reward.item}_name`)}`;
                    const missionEmbed = new EmbedBuilder().setTitle(t(`mission_${missionDetails.id}_title`)).setDescription(t(`mission_${missionDetails.id}_description`)).addFields({name: t('progress'), value: `${weeklyMission.progress} / ${missionDetails.goal}`, inline: true}, {name: t('reward'), value: rewardText, inline: true}).setColor('#9B59B6').setFooter({text: `ID: ${missionDetails.id}`});
                    const collectButton = new ButtonBuilder().setCustomId(`mission_collect_weekly_${member.id}`).setLabel(t('missions_collect_button')).setStyle(ButtonStyle.Success).setEmoji('🏆').setDisabled(weeklyMission.progress < missionDetails.goal);
                    const row = new ActionRowBuilder().addComponents(collectButton);
                    const missionMessage = await weeklyMissionThread.send({ embeds: [missionEmbed], components: [row] });
                    weeklyMission.messageId = missionMessage.id;
                }
            }
            
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
            // Reverter criação de dados se o canal falhar
            userStats.delete(member.id);
            userItems.delete(member.id);
            userMissions.delete(member.id);
            await interaction.editReply({ content: t('profile_creation_error_generic'), ephemeral: true });
        }

    } else { // Perfil já existe, apenas atualiza e mostra
        try {
            const stats = userStats.get(targetUser.id);
            const items = userItems.get(targetUser.id);
            const profileInfo = userProfiles.get(targetUser.id);

            // Atualiza a imagem no canal do perfil
            const profileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
            const attachment = new AttachmentBuilder(profileImageBuffer, { name: 'profile-card.png' });
            
            const profileChannel = await interaction.client.channels.fetch(profileInfo.channelId);
            const profileMessage = await profileChannel.messages.fetch(profileInfo.messageId);
            await profileMessage.edit({ files: [attachment] });

            // Envia a resposta efêmera para o usuário que usou o comando
            await interaction.editReply({ content: t('profile_show', { channelId: profileInfo.channelId }), ephemeral: true });
            
            // Mostra os botões de ação apenas se for o próprio usuário
            if(isSelf) {
                const actionRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`equip_item_${targetUser.id}`).setLabel(t('equip_item_button')).setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
                        new ButtonBuilder().setCustomId(`select_milestone_${targetUser.id}`).setLabel(t('select_milestone_button')).setStyle(ButtonStyle.Secondary).setEmoji('🌟')
                    );
                await interaction.followUp({ components: [actionRow], ephemeral: true });
            }

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
