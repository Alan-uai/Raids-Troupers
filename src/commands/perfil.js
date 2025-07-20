import { AttachmentBuilder, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { generateProfileImage } from '../profile-generator.js';
import { getTranslator } from '../i18n.js';
import { assignMissions } from '../mission-system.js';
import { data } from './perfil.data.js';
import { missions as missionPool } from '../missions.js';

const PROFILE_CATEGORY_ID = '1395589412661887068';

async function createOrUpdateProfile(interaction, targetUser, { userStats, userProfiles, userItems, clans, userMissions }) {
    const member = await interaction.guild.members.fetch(targetUser.id);
    const t = await getTranslator(interaction.user.id, userStats);
    
    // Defer a resposta para ter tempo de processar tudo
    await interaction.deferReply({ ephemeral: true });

    // Se o perfil já existe, apenas atualiza e mostra a imagem.
    if (userProfiles.has(targetUser.id)) {
        try {
            const stats = userStats.get(targetUser.id);
            const items = userItems.get(targetUser.id) || { inventory: [], equippedBackground: 'default', equippedTitle: 'default', equippedBorder: null };
            const profileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
            const attachment = new AttachmentBuilder(profileImageBuffer, { name: 'profile-card.png' });
            
            // Envia a imagem do perfil
            const profileMessage = await interaction.editReply({ content: t('profile_show'), files: [attachment], ephemeral: true });

            // Envia botões de ação separadamente
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`equip_item_${targetUser.id}`)
                        .setLabel(t('equip_item_button'))
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🛡️'),
                    new ButtonBuilder()
                        .setCustomId(`select_milestone_${targetUser.id}`)
                        .setLabel(t('select_milestone_button'))
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🌟')
                );
            await interaction.followUp({ components: [actionRow], ephemeral: true });

            return;

        } catch (error) {
            console.error(`Failed to show profile for ${member.displayName}:`, error);
            await interaction.editReply({ content: t('profile_creation_error_generic'), ephemeral: true });
            return;
        }
    }

    // Se o perfil NÃO existe, crie tudo.
    const category = interaction.guild.channels.cache.get(PROFILE_CATEGORY_ID);
    if (!category || category.type !== ChannelType.GuildCategory) {
        console.error(`Category with ID ${PROFILE_CATEGORY_ID} not found or is not a category.`);
        return await interaction.editReply({ content: t('profile_creation_error_category'), ephemeral: true });
    }

    try {
        const userLocale = targetUser.locale || 'pt-BR';

        const channel = await interaction.guild.channels.create({
            name: member.displayName,
            type: ChannelType.GuildText,
            parent: category,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] },
            ],
        });

        const stats = { level: 1, xp: 0, coins: 100, class: null, clanId: null, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0, reputation: 0, totalRatings: 0, locale: userLocale, autoCollectMissions: false };
        userStats.set(member.id, stats);

        const items = { inventory: [], equippedBackground: 'default', equippedTitle: 'default', equippedBorder: null };
        userItems.set(member.id, items);

        assignMissions(member.id, userMissions, stats); // Pass stats for intelligent assignment

        const profileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
        const attachment = new AttachmentBuilder(profileImageBuffer, { name: 'profile-card.png' });
        
        await channel.send({ content: t('welcome_new_user', { user: member }) });
        const profileMessage = await channel.send({ files: [attachment] });
        
        userProfiles.set(member.id, {
            channelId: channel.id,
            messageId: profileMessage.id
        });
        
        // --- Criação de Tópicos Privados ---

        // 1. Tópico de Missões
        const missionThread = await channel.threads.create({
            name: t('missions_thread_title'),
            autoArchiveDuration: 10080,
            reason: t('missions_thread_reason', { username: member.displayName }),
        });
        
        const autoCollectRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mission_autocollect_toggle_${member.id}`)
                .setLabel(t('missions_autocollect_button'))
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⚙️')
        );
        await missionThread.send({ content: t('missions_autocollect_description'), components: [autoCollectRow] });
        
        const activeMissions = userMissions.get(member.id) || [];
        for (const missionProgress of activeMissions) {
            const missionDetails = missionPool.find(m => m.id === missionProgress.id);
            if (missionDetails) {
                const rewardText = missionDetails.reward.item
                    ? `Item: ${t(`item_${missionDetails.reward.item}_name`)}`
                    : `${missionDetails.reward.xp} XP & ${missionDetails.reward.coins} TC`;

                const missionEmbed = new EmbedBuilder()
                    .setTitle(t(`mission_${missionDetails.id}_description`))
                    .setDescription(`**${t('progress')}:** ${missionProgress.progress} / ${missionDetails.goal}\n**${t('reward')}:** ${rewardText}`)
                    .setColor('#3498DB')
                    .setFooter({text: `ID: ${missionDetails.id}`});

                const collectButton = new ButtonBuilder()
                    .setCustomId(`mission_collect_${member.id}_${missionDetails.id}`)
                    .setLabel(t('missions_collect_button'))
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏆')
                    .setDisabled(missionProgress.progress < missionDetails.goal);
                    
                const row = new ActionRowBuilder().addComponents(collectButton);
                
                const missionMessage = await missionThread.send({ embeds: [missionEmbed], components: [row] });
                missionProgress.messageId = missionMessage.id;
            }
        }
        userMissions.set(member.id, activeMissions);

        // 2. Tópico de Marcos (Milestones) - Estrutura Inicial
        const milestoneThread = await channel.threads.create({
            name: t('milestones_thread_title'),
            autoArchiveDuration: 10080,
            reason: t('milestones_thread_reason', { username: member.displayName }),
        });
        await milestoneThread.send({ content: t('milestones_thread_description') });

        // 3. Tópico de Loja Exclusiva - Estrutura Inicial
        const exclusiveShopThread = await channel.threads.create({
            name: t('exclusive_shop_thread_title'),
            autoArchiveDuration: 10080,
            reason: t('exclusive_shop_thread_reason', { username: member.displayName }),
        });
        await exclusiveShopThread.send({ content: t('exclusive_shop_thread_description') });


        await interaction.editReply({ content: t('profile_creation_success', { channelId: channel.id }), ephemeral: true });

    } catch (error) {
        console.error(`Failed to create channel or profile for ${member.displayName}:`, error);
        await interaction.editReply({ content: t('profile_creation_error_generic'), ephemeral: true });
    }
}


export default {
    data: data,
    execute: createOrUpdateProfile,
};

    