import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getTranslator } from '../i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clan_convocar')
        .setDescription('[Líder] Envia um anúncio para o canal do seu clã.')
        .setDescriptionLocalizations({ "en-US": "[Leader] Sends an announcement to your clan's channel." })
        .addStringOption(option =>
            option.setName('mensagem')
                .setDescription('A mensagem que você quer anunciar para o seu clã.')
                .setDescriptionLocalizations({ "en-US": "The message you want to announce to your clan." })
                .setRequired(true)
                .setMaxLength(1024)),
    async execute(interaction, { userStats, clans }) {
        const t = await getTranslator(interaction.user.id);
        
        const leaderId = interaction.user.id;
        const message = interaction.options.getString('mensagem');

        const leaderStats = userStats.get(leaderId);
        if (!leaderStats || !leaderStats.clanId) {
            return await interaction.reply({ content: t('clan_command_not_in_clan'), ephemeral: true });
        }

        const clan = Array.from(clans.values()).find(c => c.id === leaderStats.clanId);
        if (!clan) {
            // Se o clã não for encontrado por algum motivo, limpa o clanId do usuário.
            leaderStats.clanId = null;
            userStats.set(leaderId, leaderStats);
            return await interaction.reply({ content: t('clan_command_clan_not_found'), ephemeral: true });
        }

        if (clan.leader !== leaderId) {
            return await interaction.reply({ content: t('clan_command_not_leader'), ephemeral: true });
        }

        if (!clan.channelId) {
            return await interaction.reply({ content: t('clan_summon_no_channel'), ephemeral: true });
        }

        try {
            const clanChannel = await interaction.client.channels.fetch(clan.channelId);
            const embed = new EmbedBuilder()
                .setColor(clan.color || '#FFA500')
                .setTitle(t('clan_summon_embed_title'))
                .setDescription(message)
                .setAuthor({ name: t('clan_summon_embed_author', { username: interaction.user.username }), iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();
            
            await clanChannel.send({ content: `<@&${clan.roleId}>`, embeds: [embed] });
            
            await interaction.reply({ content: t('clan_summon_success', { channelId: clan.channelId }), ephemeral: true });

        } catch (error) {
            console.error(`Error sending clan summons for clan ${clan.name}:`, error);
            await interaction.reply({ content: t('clan_summon_error'), ephemeral: true });
        }
    },
};
