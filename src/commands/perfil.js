import { AttachmentBuilder, ChannelType, PermissionsBitField } from 'discord.js';
import { generateProfileImage } from '../profile-generator.js';
import { getTranslator } from '../i18n.js';
import { assignMissions } from '../mission-system.js';
import { data } from './perfil.data.js';

export default {
    data: data,
    async execute(interaction, { userStats, userProfiles, userItems, clans, userMissions }) {
        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id);
        const t = await getTranslator(interaction.user.id, userStats);
        
        await interaction.deferReply({ ephemeral: true });

        const profileInfo = userProfiles.get(targetUser.id);

        // Se o perfil já existe, apenas atualiza e mostra a imagem.
        if (profileInfo) {
            try {
                const stats = userStats.get(targetUser.id);
                const items = userItems.get(targetUser.id);
                const profileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
                const attachment = new AttachmentBuilder(profileImageBuffer, { name: 'profile-card.png' });
                
                const profileChannel = await interaction.client.channels.fetch(profileInfo.channelId);
                const profileMessage = await profileChannel.messages.fetch(profileInfo.messageId);

                await profileMessage.edit({ files: [attachment] });
                
                return await interaction.editReply({ content: t('profile_show'), files: [attachment], ephemeral: true });

            } catch (error) {
                console.error(`Failed to update profile for ${member.displayName}:`, error);
                // Se a mensagem antiga não for encontrada, podemos prosseguir para criar uma nova.
            }
        }

        // Se o perfil NÃO existe ou a atualização falhou, crie tudo.
        const categoryId = '1395589412661887068';
        const guild = interaction.guild;
        const category = guild.channels.cache.get(categoryId);

        if (!category || category.type !== ChannelType.GuildCategory) {
            console.error(`Category with ID ${categoryId} not found or is not a category.`);
            return await interaction.editReply({ content: t('profile_creation_error_category'), ephemeral: true });
        }

        try {
            const userLocale = targetUser.locale || 'pt-BR';

            const channel = await guild.channels.create({
                name: member.displayName,
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] },
                ],
            });

            const stats = { level: 1, xp: 0, coins: 100, class: null, clanId: null, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0, reputation: 0, totalRatings: 0, locale: userLocale };
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

            await interaction.editReply({ content: t('profile_creation_success', { channelId: channel.id }), ephemeral: true });

        } catch (error) {
            console.error(`Failed to create channel or profile for ${member.displayName}:`, error);
            await interaction.editReply({ content: t('profile_creation_error_generic'), ephemeral: true });
        }
    },
};
