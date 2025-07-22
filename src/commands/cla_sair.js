import { SlashCommandBuilder } from 'discord.js';
import { getTranslator } from '../i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clan_sair')
        .setDescription('Sai do seu clã atual.')
        .setDescriptionLocalizations({
            "en-US": "Leaves your current clan."
        }),
    async execute(interaction, { userStats, clans }) {
        const t = await getTranslator(interaction.user.id);
        
        const userId = interaction.user.id;
        const stats = userStats.get(userId);

        if (!stats || !stats.clanId) {
            return await interaction.reply({ content: t('clan_leave_not_in_clan'), ephemeral: true });
        }

        const clan = Array.from(clans.values()).find(c => c.id === stats.clanId);

        if (!clan) {
            stats.clanId = null;
            userStats.set(userId, stats);
            return await interaction.reply({ content: t('clan_leave_clan_disbanded'), ephemeral: true });
        }

        if (clan.leader === userId) {
            // Futuramente, adicionar lógica para dissolver ou passar a liderança.
            return await interaction.reply({ content: t('clan_leave_leader_cannot_leave'), ephemeral: true });
        }

        clan.members = clan.members.filter(id => id !== userId);
        stats.clanId = null;

        // Remover role do membro
        try {
            const role = await interaction.guild.roles.fetch(clan.roleId);
            const member = await interaction.guild.members.fetch(userId);
            if (role && member) {
                await member.roles.remove(role);
            }
        } catch (e) {
            console.error(`Falha ao remover role do clã ${clan.name} para o membro ${userId} que saiu`, e);
        }

        userStats.set(userId, stats);
        clans.set(clan.name.toLowerCase(), clan);

        await interaction.reply({ content: t('clan_leave_success', { clanName: clan.name }), ephemeral: true });
    },
};
