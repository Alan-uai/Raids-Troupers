import { SlashCommandBuilder } from 'discord.js';
import { getTranslator } from '../i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clan_convidar')
        .setDescription('Convida um jogador para o seu clã.')
        .setDescriptionLocalizations({
            "en-US": "Invites a player to your clan."
        })
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('O jogador que você deseja convidar.')
                .setDescriptionLocalizations({ "en-US": "The player you want to invite." })
                .setRequired(true)),
    async execute(interaction, { userStats, clans, pendingInvites }) {
        const t = await getTranslator(interaction.user.id);
        
        const leaderId = interaction.user.id;
        const memberToInvite = interaction.options.getUser('usuario');

        if (memberToInvite.bot) {
            return await interaction.reply({ content: t('clan_invite_no_bots'), ephemeral: true });
        }

        if (memberToInvite.id === leaderId) {
            return await interaction.reply({ content: t('clan_invite_self'), ephemeral: true });
        }

        const leaderStats = userStats.get(leaderId);
        if (!leaderStats || !leaderStats.clanId) {
            return await interaction.reply({ content: t('clan_invite_not_in_clan'), ephemeral: true });
        }

        const clan = Array.from(clans.values()).find(c => c.id === leaderStats.clanId);
        if (!clan || clan.leader !== leaderId) {
            return await interaction.reply({ content: t('clan_invite_not_leader'), ephemeral: true });
        }

        const memberStats = userStats.get(memberToInvite.id);
        if (memberStats && memberStats.clanId) {
            return await interaction.reply({ content: t('clan_invite_already_in_clan', { username: memberToInvite.username }), ephemeral: true });
        }

        const userInvites = pendingInvites.get(memberToInvite.id) || new Set();
        userInvites.add(clan.name.toLowerCase());
        pendingInvites.set(memberToInvite.id, userInvites);

        await interaction.reply({ content: t('clan_invite_sent', { username: memberToInvite.username, clanName: clan.name }), ephemeral: true });

        try {
            const memberT = await getTranslator(memberToInvite.id);
            await memberToInvite.send(
                memberT('clan_invite_dm_notification', { username: interaction.user.username, clanName: clan.name }) +
                memberT('clan_invite_dm_instructions', { clanName: clan.name })
            );
        } catch (e) {
            console.log(`Could not send invite DM to ${memberToInvite.username}.`);
            await interaction.followUp({ content: t('clan_invite_dm_fail', { username: memberToInvite.username }), ephemeral: true });
        }
    },
};
