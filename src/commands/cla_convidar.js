// src/commands/cla_convidar.js
import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('cla_convidar')
        .setDescription('Convida um jogador para o seu clã.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('O jogador que você deseja convidar.')
                .setRequired(true)),
    async execute(interaction, { userStats, clans, pendingInvites }) {
        const leaderId = interaction.user.id;
        const memberToInvite = interaction.options.getUser('usuario');

        if (memberToInvite.bot) {
            return await interaction.reply({ content: '❌ Você não pode convidar bots para um clã.', ephemeral: true });
        }

        if (memberToInvite.id === leaderId) {
            return await interaction.reply({ content: '❌ Você não pode convidar a si mesmo.', ephemeral: true });
        }

        const leaderStats = userStats.get(leaderId);
        if (!leaderStats || !leaderStats.clanId) {
            return await interaction.reply({ content: '❌ Você não está em um clã para poder convidar.', ephemeral: true });
        }

        const clan = Array.from(clans.values()).find(c => c.id === leaderStats.clanId);
        if (!clan || clan.leader !== leaderId) {
            return await interaction.reply({ content: '❌ Apenas o líder do clã pode convidar novos membros.', ephemeral: true });
        }

        const memberStats = userStats.get(memberToInvite.id);
        if (memberStats && memberStats.clanId) {
            return await interaction.reply({ content: `❌ ${memberToInvite.username} já faz parte de um clã.`, ephemeral: true });
        }

        // Adiciona o convite pendente
        const userInvites = pendingInvites.get(memberToInvite.id) || new Set();
        userInvites.add(clan.name.toLowerCase());
        pendingInvites.set(memberToInvite.id, userInvites);

        await interaction.reply({ content: `✅ Convite enviado para **${memberToInvite.username}** para se juntar ao clã **${clan.name}**.`, ephemeral: true });

        // Enviar DM para o usuário convidado
        try {
            await memberToInvite.send(
                `⚔️ Você foi convidado por **${interaction.user.username}** para se juntar ao clã **${clan.name}**!\n` +
                `Use o comando \`/cla_aceitar nome_do_cla:${clan.name}\` para aceitar.`
            );
        } catch (e) {
            console.log(`Não foi possível enviar DM de convite para ${memberToInvite.username}.`);
            await interaction.followUp({ content: `⚠️ Não foi possível notificar ${memberToInvite.username} por DM, mas o convite está ativo.`, ephemeral: true });
        }
    },
};
