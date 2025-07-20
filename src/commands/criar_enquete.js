import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } from 'discord.js';
import { getTranslator } from '../i18n.js';
import clanPollHandler from './clan_enquete.js';

// Reutiliza o mapa de votos do clan_enquete para centralizar o estado das enquetes
const pollVotes = clanPollHandler.pollVotes;

export default {
    data: new SlashCommandBuilder()
        .setName('criar_enquete')
        .setDescription('[Admin] Cria uma enquete em um canal específico.')
        .setDescriptionLocalizations({ "en-US": "[Admin] Creates a poll in a specific channel." })
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('O título ou a pergunta da sua enquete.')
                .setDescriptionLocalizations({ "en-US": "The title or question for your poll." })
                .setRequired(true)
                .setMaxLength(256))
        .addStringOption(option =>
            option.setName('opcoes')
                .setDescription('As opções da enquete, separadas por vírgula (ex: Sim, Não). Máx 5.')
                .setDescriptionLocalizations({ "en-US": "The poll options, separated by commas (e.g., Yes, No). Max 5." })
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('O canal onde a enquete será enviada.')
                .setDescriptionLocalizations({ "en-US": "The channel where the poll will be sent." })
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)),
    async execute(interaction) {
        const t = await getTranslator(interaction.user.id, null);
        
        const title = interaction.options.getString('titulo');
        const optionsString = interaction.options.getString('opcoes');
        const channel = interaction.options.getChannel('canal');
        const options = optionsString.split(',').map(o => o.trim()).filter(o => o);

        if (options.length < 2 || options.length > 5) {
            return await interaction.reply({ content: t('poll_options_error_2_to_5'), ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral: true });

        try {
            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle(title)
                .setDescription(t('poll_description_initial'))
                .setAuthor({ name: t('poll_author', { username: interaction.user.username }), iconURL: interaction.user.displayAvatarURL() })
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            
            const pollMessage = await channel.send({ embeds: [embed] });

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

            await interaction.editReply({ content: t('poll_admin_success', { channelId: channel.id }), ephemeral: true });

        } catch (error) {
            console.error('Error creating admin poll:', error);
            await interaction.editReply({ content: t('poll_admin_error'), ephemeral: true });
        }
    }
};
