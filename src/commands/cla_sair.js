// src/commands/cla_sair.js
import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('cla_sair')
        .setDescription('Sai do seu clã atual.'),
    async execute(interaction, { userStats, clans }) {
        const userId = interaction.user.id;
        const stats = userStats.get(userId);

        if (!stats || !stats.clanId) {
            return await interaction.reply({ content: '❌ Você não está em um clã.', ephemeral: true });
        }

        const clan = Array.from(clans.values()).find(c => c.id === stats.clanId);

        if (!clan) {
            // Limpa o clanId inválido
            stats.clanId = null;
            userStats.set(userId, stats);
            return await interaction.reply({ content: '❌ O clã em que você estava não parece mais existir. Seu status foi corrigido.', ephemeral: true });
        }

        if (clan.leader === userId) {
            return await interaction.reply({ content: '❌ O líder não pode sair do clã. Você deve passar a liderança ou dissolver o clã (funcionalidade futura).', ephemeral: true });
        }

        // Remover membro
        clan.members = clan.members.filter(id => id !== userId);
        stats.clanId = null;

        // Salvar
        userStats.set(userId, stats);
        clans.set(clan.name.toLowerCase(), clan);

        await interaction.reply({ content: `✅ Você saiu do clã **${clan.name}**.`, ephemeral: true });
    },
};
