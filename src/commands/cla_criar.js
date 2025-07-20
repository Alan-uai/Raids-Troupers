import { SlashCommandBuilder } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import { getTranslator } from '../i18n.js';

export default {
    data: new SlashCommandBuilder()
        .setName('cla_criar')
        .setDescription('Cria um novo clã.')
        .setDescriptionLocalizations({
            "en-US": "Creates a new clan."
        })
        .addStringOption(option =>
            option.setName('nome')
                .setDescription('O nome do seu novo clã (máx 20 caracteres).')
                .setDescriptionLocalizations({ "en-US": "The name of your new clan (max 20 characters)." })
                .setRequired(true)
                .setMaxLength(20))
        .addStringOption(option =>
            option.setName('tag')
                .setDescription('A tag do seu clã (3-5 caracteres).')
                .setDescriptionLocalizations({ "en-US": "Your clan's tag (3-5 characters)." })
                .setRequired(true)
                .setMinLength(3)
                .setMaxLength(5)),

    async execute(interaction, { userStats, clans }) {
        const t = await getTranslator(interaction.user.id, userStats);

        const clanName = interaction.options.getString('nome');
        const clanTag = interaction.options.getString('tag');
        const userId = interaction.user.id;
        const creationCost = 2500;

        const stats = userStats.get(userId);
        if (stats?.clanId) {
            return await interaction.reply({ content: t('clan_create_already_in_clan'), ephemeral: true });
        }

        if (!stats || stats.coins < creationCost) {
            return await interaction.reply({ content: t('clan_create_not_enough_coins', { cost: creationCost, balance: stats?.coins || 0 }), ephemeral: true });
        }

        if (clans.has(clanName.toLowerCase())) {
            return await interaction.reply({ content: t('clan_create_name_exists'), ephemeral: true });
        }

        const tagExists = Array.from(clans.values()).some(c => c.tag.toLowerCase() === clanTag.toLowerCase());
        if (tagExists) {
            return await interaction.reply({ content: t('clan_create_tag_exists'), ephemeral: true });
        }

        stats.coins -= creationCost;

        const clanId = uuidv4();
        const newClan = {
            id: clanId,
            name: clanName,
            tag: clanTag,
            leader: userId,
            members: [userId],
            createdAt: new Date(),
        };

        stats.clanId = clanId;

        userStats.set(userId, stats);
        clans.set(clanName.toLowerCase(), newClan);

        await interaction.reply({ content: t('clan_create_success', { clanName, clanTag }) });
    },
};
