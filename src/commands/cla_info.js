import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getTranslator } from '../i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clan_info')
        .setDescription('Mostra informações sobre um clã.')
        .setDescriptionLocalizations({ "en-US": "Shows information about a clan." })
        .addStringOption(option =>
            option.setName('nome_do_cla')
                .setDescription('O nome do clã que você quer ver (deixe em branco para ver o seu).')
                .setDescriptionLocalizations({ "en-US": "The name of the clan you want to see (leave blank to see yours)." })),
    async execute(interaction, { userStats, clans }) {
        const t = await getTranslator(interaction.user.id);

        const clanNameArg = interaction.options.getString('nome_do_cla');
        const userId = interaction.user.id;
        let clan;

        if (clanNameArg) {
            clan = clans.get(clanNameArg.toLowerCase());
        } else {
            const stats = userStats.get(userId);
            if (!stats || !stats.clanId) {
                return await interaction.reply({ content: t('clan_info_not_in_clan'), ephemeral: true });
            }
            clan = Array.from(clans.values()).find(c => c.id === stats.clanId);
        }

        if (!clan) {
            return await interaction.reply({ content: t('clan_info_not_found'), ephemeral: true });
        }

        const leader = await interaction.client.users.fetch(clan.leader);
        const memberList = await Promise.all(clan.members.map(async (memberId) => {
            try {
                const user = await interaction.client.users.fetch(memberId);
                return `• ${user.username}`;
            } catch {
                return `• ${t('unknown_user')}`;
            }
        }));

        const embed = new EmbedBuilder()
            .setColor('#D2AC47')
            .setTitle(t('clan_info_embed_title', { clanName: clan.name, clanTag: clan.tag }))
            .addFields(
                { name: `👑 ${t('leader')}`, value: leader.username, inline: true },
                { name: `👥 ${t('members')}`, value: `${clan.members.length}`, inline: true },
                { name: `📅 ${t('creation_date')}`, value: `<t:${Math.floor(clan.createdAt.getTime() / 1000)}:d>`, inline: true },
                { name: `📜 ${t('member_list')}`, value: memberList.join('\n') || t('no_members_found') },
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
};
