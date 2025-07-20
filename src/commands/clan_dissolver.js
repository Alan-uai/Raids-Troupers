import { SlashCommandBuilder } from 'discord.js';
import { getTranslator } from '../i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clan_dissolver')
        .setDescription('[Líder] Dissolve seu clã permanentemente.')
        .setDescriptionLocalizations({ "en-US": "[Leader] Permanently disbands your clan." }),
    async execute(interaction, { userStats, clans }) {
        const t = await getTranslator(interaction.user.id, userStats);
        await interaction.deferReply({ ephemeral: true });

        const leaderId = interaction.user.id;

        const leaderStats = userStats.get(leaderId);
        if (!leaderStats || !leaderStats.clanId) {
            return await interaction.editReply({ content: t('clan_command_not_in_clan'), ephemeral: true });
        }

        const clan = Array.from(clans.values()).find(c => c.id === leaderStats.clanId);
        if (!clan) {
            leaderStats.clanId = null;
            userStats.set(leaderId, leaderStats);
            return await interaction.editReply({ content: t('clan_command_clan_not_found'), ephemeral: true });
        }

        if (clan.leader !== leaderId) {
            return await interaction.editReply({ content: t('clan_command_not_leader'), ephemeral: true });
        }

        // --- Processo de Dissolução ---
        try {
            // Notificar membros
            for (const memberId of clan.members) {
                if (memberId !== leaderId) {
                    try {
                        const memberUser = await interaction.client.users.fetch(memberId);
                        const memberT = await getTranslator(memberId, userStats);
                        await memberUser.send(memberT('clan_disband_dm', { clanName: clan.name }));
                    } catch (e) {
                        console.log(`Could not notify member ${memberId} about clan disband.`);
                    }
                }
                const memberStats = userStats.get(memberId);
                if (memberStats) {
                    memberStats.clanId = null;
                    userStats.set(memberId, memberStats);
                }
            }

            // Excluir canal do clã
            if (clan.channelId) {
                const channel = await interaction.guild.channels.fetch(clan.channelId).catch(() => null);
                if (channel) {
                    await channel.delete('Clan disbanded by leader.');
                }
            }

            // Excluir cargo do clã
            if (clan.roleId) {
                const role = await interaction.guild.roles.fetch(clan.roleId).catch(() => null);
                if (role) {
                    await role.delete('Clan disbanded by leader.');
                }
            }
            
            // Remover o clã da base de dados
            clans.delete(clan.name.toLowerCase());

            await interaction.editReply({ content: t('clan_disband_success', { clanName: clan.name }) });

        } catch (error) {
            console.error(`Error disbanding clan ${clan.name}:`, error);
            await interaction.editReply({ content: t('clan_disband_error') });
        }
    },
};
