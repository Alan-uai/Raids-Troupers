import { AttachmentBuilder, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { generateProfileImage } from '../profile-generator.js';
import { getTranslator } from '../i18n.js';
import { assignMissions } from '../mission-system.js';
import { data } from './perfil.data.js';
import { missions as missionPool } from '../missions.js';

const PROFILE_CATEGORY_ID = '1395589412661887068';

export default {
    data: data,
    async execute(interaction, { userStats, userProfiles, userItems, clans, userMissions }) {
        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id);
        const t = await getTranslator(interaction.user.id, userStats);
        
        await interaction.deferReply({ ephemeral: true });

        // Se o perfil já existe, apenas atualiza e mostra a imagem.
        if (userProfiles.has(targetUser.id)) {
            try {
                const stats = userStats.get(targetUser.id);
                const items = userItems.get(targetUser.id);
                const profileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
                const attachment = new AttachmentBuilder(profileImageBuffer, { name: 'profile-card.png' });
                
                return await interaction.editReply({ content: t('profile_show'), files: [attachment] });

            } catch (error) {
                console.error(`Failed to show profile for ${member.displayName}:`, error);
                await interaction.editReply({ content: t('profile_creation_error_generic'), ephemeral: true });
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

            const items = { inventory: [], equippedBackground: 'default', equippedTitle: 'default' };
            userItems.set(member.id, items);

            assignMissions(member.id, userMissions);

            const profileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
            const attachment = new AttachmentBuilder(profileImageBuffer, { name: 'profile-card.png' });
            
            await channel.send({ content: t('welcome_new_user', { user: member }) });
            const profileMessage = await channel.send({ files: [attachment] });
            
            userProfiles.set(member.id, {
                channelId: channel.id,
                messageId: profileMessage.id
            });
            
            // Cria o tópico de missões
            const missionThread = await channel.threads.create({
                name: t('missions_thread_title'),
                autoArchiveDuration: 10080, // 1 week
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
            
            // Posta as missões iniciais
            const activeMissions = userMissions.get(member.id) || [];
            for (const missionProgress of activeMissions) {
                const missionDetails = missionPool.find(m => m.id === missionProgress.id);
                if (missionDetails) {
                    const missionEmbed = new EmbedBuilder()
                        .setTitle(t(`mission_${missionDetails.id}_description`))
                        .setDescription(`**${t('progress')}:** ${missionProgress.progress} / ${missionDetails.goal}\n**${t('reward')}:** ${missionDetails.reward.xp} XP & ${missionDetails.reward.coins} TC`)
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
                    missionProgress.messageId = missionMessage.id; // Armazena o ID da mensagem da missão
                }
            }
            userMissions.set(member.id, activeMissions);


            await interaction.editReply({ content: t('profile_creation_success', { channelId: channel.id }), ephemeral: true });

        } catch (error) {
            console.error(`Failed to create channel or profile for ${member.displayName}:`, error);
            await interaction.editReply({ content: t('profile_creation_error_generic'), ephemeral: true });
        }
    },
};
