import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getTranslator } from '../i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('sugestao')
        .setDescription('Envie uma sugestão para o bot ou servidor.')
        .setDescriptionLocalizations({ "en-US": "Send a suggestion for the bot or server." })
        .addStringOption(option =>
            option.setName('sugestao')
                .setDescription('Descreva sua sugestão detalhadamente.')
                .setDescriptionLocalizations({ "en-US": "Describe your suggestion in detail." })
                .setRequired(true))
        .addStringOption(option =>
            option.setName('tags')
                .setDescription('Adicione tags para categorizar (ex: comando, clã, perfil).')
                .setDescriptionLocalizations({ "en-US": "Add tags to categorize (e.g., command, clan, profile)." })
                .setRequired(false)),
    async execute(interaction) {
        const t = await getTranslator(interaction.user.id, null);
        const suggestion = interaction.options.getString('sugestao');
        const tags = interaction.options.getString('tags');
        const suggestionChannelId = '1396653561026318389';
        
        await interaction.deferReply({ ephemeral: true });

        try {
            const channel = await interaction.client.channels.fetch(suggestionChannelId);

            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setAuthor({ name: t('suggestion_from', { username: interaction.user.username }), iconURL: interaction.user.displayAvatarURL() })
                .setTitle(t('suggestion_title'))
                .setDescription(suggestion)
                .addFields({ name: 'Votos', value: 'Aprovar: 0\nReprovar: 0', inline: true })
                .setTimestamp();
            
            if (tags) {
                embed.addFields({ name: 'Tags', value: tags, inline: true });
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('suggestion_approve')
                        .setLabel(t('suggestion_approve_button'))
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('👍'),
                    new ButtonBuilder()
                        .setCustomId('suggestion_reject')
                        .setLabel(t('suggestion_reject_button'))
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('👎')
                );

            await channel.send({ embeds: [embed], components: [row] });

            await interaction.editReply({ content: t('suggestion_success', { channelId: suggestionChannelId }), ephemeral: true });

        } catch (error) {
            console.error('Error sending suggestion:', error);
            await interaction.editReply({ content: t('suggestion_error'), ephemeral: true });
        }
    }
};
