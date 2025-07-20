import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from 'discord.js';
import { getTranslator } from '../i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('anunciar_update')
        .setDescription('[Admin] Posta o anúncio de atualização no canal designado.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        const t = await getTranslator(interaction.user.id, null);
        const announcementChannelId = '1396617630345072742';

        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle(t('update_announcement_title'))
            .setDescription(t('update_announcement_intro'))
            .addFields(
                { name: `\n${t('update_announcement_profiles_title')}`, value: t('update_announcement_profiles_desc') },
                { name: `\n${t('update_announcement_missions_title')}`, value: t('update_announcement_missions_desc') },
                { name: `\n${t('update_announcement_clans_title')}`, value: t('update_announcement_clans_desc') },
                { name: `\n${t('update_announcement_shop_title')}`, value: t('update_announcement_shop_desc') },
                { name: `\n${t('update_announcement_items_title')}`, value: t('update_announcement_items_desc') },
                { name: '\n\u200B', value: t('update_announcement_outro') }
            )
            .setTimestamp()
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });
        
        try {
            const channel = await interaction.client.channels.fetch(announcementChannelId);
            await channel.send({ content: "@everyone", embeds: [embed] });
            await interaction.reply({ content: t('update_announcement_success', { channelId: announcementChannelId }), ephemeral: true });
        } catch (error) {
            console.error('Failed to send update announcement:', error);
            await interaction.reply({ content: 'Failed to send announcement. Check channel ID and my permissions.', ephemeral: true });
        }
    }
};
