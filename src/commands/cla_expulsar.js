// src/commands/cla_expulsar.js
import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('cla_expulsar')
        .setDescription('Expulsa um membro do seu clã.')
        .addUserOption(option =>
            option.setName('membro')
                .setDescription('O membro que você deseja expulsar.')
                .setRequired(true)),
    async execute(interaction, { userStats, clans }) {
        const leaderId = interaction.user.id;
        const memberToExpel = interaction.options.getUser('membro');

        if (memberToExpel.id === leaderId) {
            return await interaction.reply({ content: '❌ Você não pode expulsar a si mesmo. Se quiser sair, use `/cla_sair`.', ephemeral: true });
        }

        const leaderStats = userStats.get(leaderId);
        if (!leaderStats || !leaderStats.clanId) {
            return await interaction.reply({ content: '❌ Você não está em um clã.', ephemeral: true });
        }

        const clan = Array.from(clans.values()).find(c => c.id === leaderStats.clanId);
        if (!clan || clan.leader !== leaderId) {
            return await interaction.reply({ content: '❌ Apenas o líder do clã pode expulsar membros.', ephemeral: true });
        }

        if (!clan.members.includes(memberToExpel.id)) {
            return await interaction.reply({ content: `❌ ${memberToExpel.username} não é um membro do seu clã.`, ephemeral: true });
        }

        // Remover membro
        clan.members = clan.members.filter(id => id !== memberToExpel.id);

        // Atualizar stats do membro expulso
        const memberStats = userStats.get(memberToExpel.id);
        if (memberStats) {
            memberStats.clanId = null;
            userStats.set(memberToExpel.id, memberStats);
        }
        
        clans.set(clan.name.toLowerCase(), clan);

        await interaction.reply({ content: `✅ **${memberToExpel.username}** foi expulso do clã.`, ephemeral: true });

        try {
            await memberToExpel.send(`Você foi expulso do clã **${clan.name}** pelo líder.`);
        } catch (e) {
            console.log(`Não foi possível notificar ${memberToExpel.username} sobre sua expulsão.`);
        }
    },
};
