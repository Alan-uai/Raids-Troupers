import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from 'discord.js';
import { getTranslator } from '../i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('buscar_sugestoes')
        .setDescription('[Admin] Busca as sugestões mais populares.')
        .setDescriptionLocalizations({ "en-US": "[Admin] Searches for the most popular suggestions." })
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(option =>
            option.setName('tag')
                .setDescription('Filtra sugestões por uma tag específica.')
                .setDescriptionLocalizations({ "en-US": "Filters suggestions by a specific tag." })
                .setRequired(false)),
    async execute(interaction) {
        const t = await getTranslator(interaction.user.id, null);
        const tag = interaction.options.getString('tag');
        const suggestionChannelId = '1396653561026318389';
        
        await interaction.deferReply({ ephemeral: true });

        try {
            const channel = await interaction.client.channels.fetch(suggestionChannelId);
            const messages = await channel.messages.fetch({ limit: 100 });

            let suggestions = [];
            for (const message of messages.values()) {
                if (message.author.id !== interaction.client.user.id || !message.embeds[0]) continue;
                
                const embed = message.embeds[0];
                const votesField = embed.fields.find(f => f.name === 'Votos');
                const tagsField = embed.fields.find(f => f.name === 'Tags');

                if (!votesField) continue;
                if (tag && (!tagsField || !tagsField.value.toLowerCase().includes(tag.toLowerCase()))) continue;

                const approveMatch = votesField.value.match(/Aprovar: (\d+)/);
                const rejectMatch = votesField.value.match(/Reprovar: (\d+)/);
                const approves = approveMatch ? parseInt(approveMatch[1], 10) : 0;
                
                suggestions.push({
                    approves,
                    content: embed.description,
                    author: embed.author.name,
                    url: message.url
                });
            }

            suggestions.sort((a, b) => b.approves - a.approves);
            suggestions = suggestions.slice(0, 10); // Pega o top 10

            if (suggestions.length === 0) {
                return await interaction.editReply({ content: t('search_suggestions_not_found'), ephemeral: true });
            }

            const resultEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle(t('search_suggestions_title', { tag: tag || 'Todas' }))
                .setTimestamp();
            
            suggestions.forEach((sugg, index) => {
                resultEmbed.addFields({
                    name: `#${index + 1} - ${sugg.author} (+${sugg.approves})`,
                    value: `[Ir para Sugestão](${sugg.url})\n> ${sugg.content.substring(0, 150)}...`
                });
            });

            await interaction.editReply({ embeds: [resultEmbed], ephemeral: true });

        } catch (error) {
            console.error('Error searching suggestions:', error);
            await interaction.editReply({ content: t('search_suggestions_error'), ephemeral: true });
        }
    }
};
