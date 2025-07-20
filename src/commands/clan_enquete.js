import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getTranslator } from '../i18n.js';

// Mapa para rastrear quem já votou em qual enquete
const pollVotes = new Map();

export default {
    data: new SlashCommandBuilder()
        .setName('clan_enquete')
        .setDescription('[Líder] Cria uma enquete no canal do seu clã.')
        .setDescriptionLocalizations({ "en-US": "[Leader] Creates a poll in your clan's channel." })
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('O título ou a pergunta da sua enquete.')
                .setDescriptionLocalizations({ "en-US": "The title or question for your poll." })
                .setRequired(true)
                .setMaxLength(256))
        .addStringOption(option =>
            option.setName('opcoes')
                .setDescription('As opções da enquete, separadas por vírgula (ex: Sim, Não, Talvez). Máx 5.')
                .setDescriptionLocalizations({ "en-US": "The poll options, separated by commas (e.g., Yes, No, Maybe). Max 5." })
                .setRequired(true)),
    async execute(interaction, { userStats, clans, client }) {
        const t = await getTranslator(interaction.user.id, userStats);
        
        const leaderId = interaction.user.id;
        const title = interaction.options.getString('titulo');
        const optionsString = interaction.options.getString('opcoes');
        const options = optionsString.split(',').map(o => o.trim()).filter(o => o);

        if (options.length < 2 || options.length > 5) {
            return await interaction.reply({ content: t('poll_options_error_2_to_5'), ephemeral: true });
        }

        const leaderStats = userStats.get(leaderId);
        if (!leaderStats || !leaderStats.clanId) {
            return await interaction.reply({ content: t('clan_command_not_in_clan'), ephemeral: true });
        }

        const clan = Array.from(clans.values()).find(c => c.id === leaderStats.clanId);
        if (!clan) {
            leaderStats.clanId = null;
            userStats.set(leaderId, leaderStats);
            return await interaction.reply({ content: t('clan_command_clan_not_found'), ephemeral: true });
        }

        if (clan.leader !== leaderId) {
            return await interaction.reply({ content: t('clan_command_not_leader'), ephemeral: true });
        }

        if (!clan.channelId) {
            return await interaction.reply({ content: t('poll_clan_no_channel'), ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral: true });

        try {
            const clanChannel = await client.channels.fetch(clan.channelId);

            const embed = new EmbedBuilder()
                .setColor(clan.color || '#3498DB')
                .setTitle(title)
                .setDescription(t('poll_description_initial'))
                .setAuthor({ name: t('poll_author', { username: interaction.user.username }), iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();
            
            const pollMessage = await clanChannel.send({ embeds: [embed] });

            pollVotes.set(pollMessage.id, {
                voters: new Map(), // userId -> optionIndex
                counts: new Array(options.length).fill(0)
            });

            const rows = [];
            let currentRow = new ActionRowBuilder();

            options.forEach((option, index) => {
                const button = new ButtonBuilder()
                    .setCustomId(`poll_vote_${pollMessage.id}_${index}`)
                    .setLabel(`${option} (0)`)
                    .setStyle(ButtonStyle.Secondary);
                
                if(currentRow.components.length >= 5) {
                    rows.push(currentRow);
                    currentRow = new ActionRowBuilder();
                }
                currentRow.addComponents(button);
            });
            rows.push(currentRow);

            await pollMessage.edit({ components: rows });
            
            await interaction.editReply({ content: t('poll_clan_success', { channelId: clan.channelId }), ephemeral: true });

        } catch (error) {
            console.error(`Error creating clan poll for clan ${clan.name}:`, error);
            await interaction.editReply({ content: t('poll_clan_error'), ephemeral: true });
        }
    },
    pollVotes
};
