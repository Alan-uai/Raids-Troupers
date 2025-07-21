import { AttachmentBuilder, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { generateProfileImage } from '../profile-generator.js';
import { getTranslator } from '../i18n.js';
import { assignMissions, postMissionList } from '../mission-system.js';
import { data } from './perfil.data.js';
import { milestones } from '../milestones.js';
import { createMilestoneEmbed } from '../milestone-system.js';

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
        const initialStats = { 
            level: 1, xp: 0, coins: 100, class: null, clanId: null, raidsCreated: 0, raidsHelped: 0, 
            kickedOthers: 0, wasKicked: 0, reputation: 0, totalRatings: 0, locale: userLocale, 
            autoCollectMissions: false, completedMilestones: {}, clanJoinDate: null, daysInClan: 0
        };
        userStats.set(targetUser.id, initialStats);
        
        // Atribui cargo de idioma
        try {
            const langRoleName = userLocale.startsWith('pt') ? 'Br' : 'En';
            const role = interaction.guild.roles.cache.find(r => r.name === langRoleName);
            if (role) {
                await member.roles.add(role);
            }
        } catch (e) {
            console.error(`Failed to assign language role to ${member.displayName}:`, e);
        }
    }
    if (!userItems.has(targetUser.id)) {
        const initialItems = { inventory: [], equippedGear: {}, equippedCosmetics: {} };
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
                topic: `Canal de perfil para ${member.user.tag}. ID do usuário: ${member.id}`,
                permissionOverwrites: [
                    { 
                        id: interaction.guild.id, // @everyone
                        deny: [PermissionsBitField.Flags.ViewChannel] 
                    },
                    { 
                      id: member.id, 
                      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
                      deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.CreatePublicThreads, PermissionsBitField.Flags.CreatePrivateThreads, PermissionsBitField.Flags.SendMessagesInThreads, PermissionsBitField.Flags.ManageMessages]
                    },
                    { 
                      id: interaction.client.user.id, 
                      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageThreads, PermissionsBitField.Flags.ReadMessageHistory] 
                    }
                ],
            });
            
            await channel.send({ content: t('welcome_new_user', { user: member }) });

            const stats = userStats.get(member.id);
            const items = userItems.get(member.id);
            const profileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
            const attachment = new AttachmentBuilder(profileImageBuffer, { name: 'profile-card.png' });
            
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
            
            // Criação dos Tópicos Privados
            const missionThread = await channel.threads.create({ name: t('missions_thread_title'), autoArchiveDuration: 10080, reason: t('missions_thread_reason', { username: member.displayName }) });
            await postMissionList(missionThread, member.id, 'daily', { userMissions, userStats, client });

            const milestoneThread = await channel.threads.create({ name: t('milestones_thread_title'), autoArchiveDuration: 10080, reason: t('milestones_thread_reason', { username: member.displayName }) });
            for (const milestone of milestones) {
                 if (milestone.id === 'secret_mastery' || milestone.type === 'PLACEHOLDER') continue;
                 const statsForMilestone = userStats.get(member.id) || {};
                 statsForMilestone.userId = member.id; // Garante que o userId está presente para os customIds
                 const itemsForMilestone = userItems.get(member.id);
                 const milestoneData = await createMilestoneEmbed(milestone, statsForMilestone, itemsForMilestone, 'general', t);
                 if(milestoneData) {
                    const message = await milestoneThread.send({ embeds: [milestoneData.embed], components: [milestoneData.row] });
                    // Armazena o ID da mensagem para futuras atualizações
                    const userStatsData = userStats.get(member.id);
                    if (!userStatsData.completedMilestones) userStatsData.completedMilestones = {};
                    userStatsData.completedMilestones[milestone.id] = { ...(userStatsData.completedMilestones[milestone.id] || {}), messageId: message.id };
                    userStats.set(member.id, userStatsData);
                 }
            }

            const exclusiveShopThread = await channel.threads.create({ name: t('exclusive_shop_thread_title'), autoArchiveDuration: 10080, reason: t('exclusive_shop_thread_reason', { username: member.displayName }) });
            await exclusiveShopThread.send({ content: t('exclusive_shop_thread_description') });

            await interaction.editReply({ content: t('profile_creation_success', { channelId: channel.id }), ephemeral: true });

        } catch (error) {
            console.error(`Failed to create channel or profile for ${member.displayName}:`, error);
            // Rollback simples em caso de erro para evitar perfis parciais
            userProfiles.delete(member.id);
            await interaction.editReply({ content: t('profile_creation_error_generic'), ephemeral: true }).catch(()=>{});
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