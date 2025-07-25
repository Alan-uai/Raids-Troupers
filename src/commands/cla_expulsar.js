import { SlashCommandBuilder } from 'discord.js';
import { getTranslator } from '../i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clan_expulsar')
        .setDescription('Expulsa um membro do seu clã.')
        .setDescriptionLocalizations({
            "en-US": "Kicks a member from your clan."
        })
        .addUserOption(option =>
            option.setName('membro')
                .setDescription('O membro que você deseja expulsar.')
                .setDescriptionLocalizations({ "en-US": "The member you want to kick." })
                .setRequired(true)),
    async execute(interaction, { userStats, clans }) {
        const t = await getTranslator(interaction.user.id);
        
        const leaderId = interaction.user.id;
        const memberToExpel = interaction.options.getUser('membro');

        if (memberToExpel.id === leaderId) {
            return await interaction.reply({ content: t('clan_kick_self'), ephemeral: true });
        }

        const leaderStats = userStats.get(leaderId);
        if (!leaderStats || !leaderStats.clanId) {
            return await interaction.reply({ content: t('clan_kick_not_in_clan'), ephemeral: true });
        }

        const clan = Array.from(clans.values()).find(c => c.id === leaderStats.clanId);
        if (!clan || clan.leader !== leaderId) {
            return await interaction.reply({ content: t('clan_kick_not_leader'), ephemeral: true });
        }

        if (!clan.members.includes(memberToExpel.id)) {
            return await interaction.reply({ content: t('clan_kick_not_a_member', { username: memberToExpel.username }), ephemeral: true });
        }

        clan.members = clan.members.filter(id => id !== memberToExpel.id);

        const memberStats = userStats.get(memberToExpel.id);
        if (memberStats) {
            memberStats.clanId = null;
            userStats.set(memberToExpel.id, memberStats);
        }
        
        // Remover role do membro expulso
        try {
            const role = await interaction.guild.roles.fetch(clan.roleId);
            const member = await interaction.guild.members.fetch(memberToExpel.id);
            if (role && member) {
                await member.roles.remove(role);
            }
        } catch (e) {
            console.error(`Falha ao remover role do clã ${clan.name} do membro expulso ${memberToExpel.id}`, e);
        }

        clans.set(clan.name.toLowerCase(), clan);

        await interaction.reply({ content: t('clan_kick_success', { username: memberToExpel.username }), ephemeral: true });

        try {
            const memberT = await getTranslator(memberToExpel.id);
            await memberToExpel.send(memberT('clan_kick_dm_notification', { clanName: clan.name }));
        } catch (e) {
            console.log(`Could not notify ${memberToExpel.username} about their expulsion.`);
        }
    },
};
