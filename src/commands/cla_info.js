// src/commands/cla_info.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('cla_info')
        .setDescription('Mostra informações sobre um clã.')
        .addStringOption(option =>
            option.setName('nome_do_cla')
                .setDescription('O nome do clã que você quer ver (deixe em branco para ver o seu).')),
    async execute(interaction, { userStats, clans }) {
        const clanNameArg = interaction.options.getString('nome_do_cla');
        const userId = interaction.user.id;
        let clan;

        if (clanNameArg) {
            clan = clans.get(clanNameArg.toLowerCase());
        } else {
            const stats = userStats.get(userId);
            if (!stats || !stats.clanId) {
                return await interaction.reply({ content: '❌ Você não está em um clã. Especifique o nome de um clã para ver suas informações.', ephemeral: true });
            }
            clan = Array.from(clans.values()).find(c => c.id === stats.clanId);
        }

        if (!clan) {
            return await interaction.reply({ content: '❌ Clã não encontrado.', ephemeral: true });
        }

        const leader = await interaction.client.users.fetch(clan.leader);
        const memberList = await Promise.all(clan.members.map(async (memberId) => {
            try {
                const user = await interaction.client.users.fetch(memberId);
                return `• ${user.username}`;
            } catch {
                return '• Usuário Desconhecido';
            }
        }));

        const embed = new EmbedBuilder()
            .setColor('#D2AC47')
            .setTitle(`Informações do Clã: ${clan.name} [${clan.tag}]`)
            .addFields(
                { name: '👑 Líder', value: leader.username, inline: true },
                { name: '👥 Membros', value: `${clan.members.length}`, inline: true },
                { name: '📅 Data de Criação', value: `<t:${Math.floor(clan.createdAt.getTime() / 1000)}:d>`, inline: true },
                { name: '📜 Lista de Membros', value: memberList.join('\n') || 'Nenhum membro encontrado.' },
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
};
