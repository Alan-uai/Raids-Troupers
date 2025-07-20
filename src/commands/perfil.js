
import { SlashCommandBuilder, AttachmentBuilder, ChannelType, PermissionsBitField } from 'discord.js';
import { generateProfileImage } from '../profile-generator.js';
import { getTranslator } from '../i18n.js';
import { assignMissions } from '../mission-system.js';

export default {
    data: new SlashCommandBuilder()
        .setName('perfil')
        .setDescription('Mostra seu perfil ou cria um se ele não existir.')
        .setDescriptionLocalizations({ "en-US": "Shows your profile or creates one if it doesn't exist." }),
    async execute(interaction, { userStats, userProfiles, userItems, clans, userMissions }) {
        const userId = interaction.user.id;
        const member = interaction.member;
        const t = await getTranslator(userId, userStats);
        
        await interaction.deferReply({ ephemeral: true });

        // Se o perfil já existe, apenas mostre a imagem para o usuário.
        if (userProfiles.has(userId)) {
            const stats = userStats.get(userId);
            const items = userItems.get(userId);
            const profileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
            const attachment = new AttachmentBuilder(profileImageBuffer, { name: 'profile-card.png' });
            
            return await interaction.editReply({ content: t('profile_show'), files: [attachment], ephemeral: true });
        }

        // Se o perfil NÃO existe, crie tudo.
        const categoryId = '1395589412661887068';
        const guild = interaction.guild;
        const category = guild.channels.cache.get(categoryId);

        if (!category || category.type !== ChannelType.GuildCategory) {
            console.error(`Category with ID ${categoryId} not found or is not a category.`);
            return await interaction.editReply({ content: t('profile_creation_error_category'), ephemeral: true });
        }

        try {
            const userLocale = member.user.locale || 'pt-BR';

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

            const profileMessage = await channel.send({
                content: t('welcome_new_user', { user: member }),
                files: [attachment]
            });
            
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
