import { SlashCommandBuilder } from 'discord.js';
import { getTranslator } from '../i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clan_aceitar')
        .setDescription('Aceita um convite para entrar em um clã.')
        .setDescriptionLocalizations({
            "en-US": "Accept an invitation to join a clan."
        })
        .addStringOption(option =>
            option.setName('nome_do_cla')
                .setDescription('O nome do clã que você quer entrar.')
                .setDescriptionLocalizations({ "en-US": "The name of the clan you want to join." })
                .setRequired(true)),
    async execute(interaction, { userStats, clans, pendingInvites }) {
        const t = await getTranslator(interaction.user.id);
        
        const clanName = interaction.options.getString('nome_do_cla');
        const userId = interaction.user.id;
        const userInvites = pendingInvites.get(userId);

        if (!userInvites || !userInvites.has(clanName.toLowerCase())) {
            return await interaction.reply({ content: t('clan_accept_no_invite'), ephemeral: true });
        }

        const stats = userStats.get(userId) || { clanId: null };
        if (stats.clanId) {
            return await interaction.reply({ content: t('clan_accept_already_in_clan'), ephemeral: true });
        }

        const clan = clans.get(clanName.toLowerCase());
        if (!clan) {
            return await interaction.reply({ content: t('clan_accept_clan_disbanded'), ephemeral: true });
        }

        clan.members.push(userId);
        stats.clanId = clan.id;

        // Adicionar role ao membro
        try {
            const role = await interaction.guild.roles.fetch(clan.roleId);
            const member = await interaction.guild.members.fetch(userId);
            if (role && member) {
                await member.roles.add(role);
            }
        } catch (e) {
            console.error(`Falha ao adicionar role do clã ${clan.name} para o membro ${userId}`, e);
        }

        clans.set(clanName.toLowerCase(), clan);
        userStats.set(userId, stats);
        userInvites.delete(clanName.toLowerCase());
        if(userInvites.size === 0) {
            pendingInvites.delete(userId);
        }

        await interaction.reply({ content: t('clan_accept_welcome', { clanName: clan.name }), ephemeral: true });

        try {
            const leader = await interaction.client.users.fetch(clan.leader);
            const leaderT = await getTranslator(clan.leader);
            await leader.send(leaderT('clan_accept_leader_notification', { username: interaction.user.username, clanName: clan.name }));
        } catch (e) {
            console.log(`Could not notify clan leader ${clan.name} about a new member.`);
        }
    },
};
