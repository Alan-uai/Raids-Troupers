// src/commands/cla_aceitar.js
import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('cla_aceitar')
        .setDescription('Aceita um convite para entrar em um clã.')
        .addStringOption(option =>
            option.setName('nome_do_cla')
                .setDescription('O nome do clã que você quer entrar.')
                .setRequired(true)),
    async execute(interaction, { userStats, clans, pendingInvites }) {
        const clanName = interaction.options.getString('nome_do_cla');
        const userId = interaction.user.id;
        const userInvites = pendingInvites.get(userId);

        if (!userInvites || !userInvites.has(clanName.toLowerCase())) {
            return await interaction.reply({ content: '❌ Você não foi convidado para este clã ou o convite expirou.', ephemeral: true });
        }

        const stats = userStats.get(userId) || { level: 1, xp: 0, coins: 0, class: null, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0, reputation: 0, totalRatings: 0, clanId: null };
        if (stats.clanId) {
            return await interaction.reply({ content: '❌ Você já está em um clã. Saia do seu clã atual para poder entrar em outro.', ephemeral: true });
        }

        const clan = clans.get(clanName.toLowerCase());
        if (!clan) {
            return await interaction.reply({ content: '❌ Este clã não existe mais.', ephemeral: true });
        }

        // Adicionar membro ao clã
        clan.members.push(userId);
        stats.clanId = clan.id;

        // Atualizar dados
        clans.set(clanName.toLowerCase(), clan);
        userStats.set(userId, stats);
        userInvites.delete(clanName.toLowerCase());
        if(userInvites.size === 0) {
            pendingInvites.delete(userId);
        }

        await interaction.reply({ content: `✅ Bem-vindo! Você agora é um membro do clã **${clan.name}**.`, ephemeral: true });

        // Tenta notificar o líder
        try {
            const leader = await interaction.client.users.fetch(clan.leader);
            await leader.send(`🎉 ${interaction.user.username} aceitou seu convite para o clã **${clan.name}**!`);
        } catch (e) {
            console.log(`Não foi possível notificar o líder do clã ${clan.name} sobre o novo membro.`);
        }
    },
};
