import { SlashCommandBuilder, PermissionsBitField, ChannelType } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import { getTranslator } from '../i18n.js';
import { inappropriateNames } from '../inappropriate-names.js';

function isValidHexColor(hex) {
    return /^#[0-9A-F]{6}$/i.test(hex);
}

export default {
    data: new SlashCommandBuilder()
        .setName('clan_criar')
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
                .setMaxLength(5))
        .addStringOption(option =>
            option.setName('cor')
                .setDescription('A cor do clã em formato HEX (ex: #FF0000).')
                .setDescriptionLocalizations({ "en-US": "The clan's color in HEX format (e.g., #FF0000)." })
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('criar_canal_privado')
                .setDescription('Criar um canal de texto privado para o clã?')
                .setDescriptionLocalizations({ "en-US": "Create a private text channel for the clan?" })
                .setRequired(true)),

    async execute(interaction, { userStats, clans }) {
        const t = await getTranslator(interaction.user.id, userStats);
        await interaction.deferReply({ ephemeral: true });

        const clanName = interaction.options.getString('nome');
        const clanTag = interaction.options.getString('tag');
        const clanColor = interaction.options.getString('cor');
        const createChannel = interaction.options.getBoolean('criar_canal_privado');
        const userId = interaction.user.id;
        const creationCost = 2500;
        const requiredLevel = 10;
        const privateChannelCategoryId = '1395583466753757326';

        const stats = userStats.get(userId);
        if (!stats || stats.level < requiredLevel) {
            return await interaction.editReply({ content: t('clan_create_level_too_low', { level: requiredLevel }), ephemeral: true });
        }
        
        if (stats.clanId) {
            return await interaction.editReply({ content: t('clan_create_already_in_clan'), ephemeral: true });
        }

        if (stats.coins < creationCost) {
            return await interaction.editReply({ content: t('clan_create_not_enough_coins', { cost: creationCost, balance: stats.coins }), ephemeral: true });
        }

        if (!isValidHexColor(clanColor)) {
            return await interaction.editReply({ content: t('clan_create_invalid_color'), ephemeral: true });
        }
        
        const lowerCaseName = clanName.toLowerCase();
        const lowerCaseTag = clanTag.toLowerCase();

        if (inappropriateNames.some(name => lowerCaseName.includes(name) || lowerCaseTag.includes(name))) {
            return await interaction.editReply({ content: t('clan_create_inappropriate_name'), ephemeral: true });
        }

        if (clans.has(lowerCaseName)) {
            return await interaction.editReply({ content: t('clan_create_name_exists'), ephemeral: true });
        }

        const tagExists = Array.from(clans.values()).some(c => c.tag.toLowerCase() === lowerCaseTag);
        if (tagExists) {
            return await interaction.editReply({ content: t('clan_create_tag_exists'), ephemeral: true });
        }

        // Tudo certo, proceder com a criação
        stats.coins -= creationCost;

        try {
            // Criar Role
            const clanRole = await interaction.guild.roles.create({
                name: clanName,
                color: clanColor,
                hoist: true,
                reason: `Role para o clã ${clanName}`,
            });

            const leaderMember = await interaction.guild.members.fetch(userId);
            await leaderMember.roles.add(clanRole);

            let channelId = null;
            if (createChannel) {
                const category = await interaction.guild.channels.fetch(privateChannelCategoryId);
                if (category && category.type === ChannelType.GuildCategory) {
                    const clanChannel = await interaction.guild.channels.create({
                        name: `🔒-${clanName}`,
                        type: ChannelType.GuildText,
                        parent: category,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id, // @everyone
                                deny: [PermissionsBitField.Flags.ViewChannel],
                            },
                            {
                                id: clanRole.id,
                                allow: [PermissionsBitField.Flags.ViewChannel],
                            },
                             {
                                id: interaction.client.user.id,
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels],
                            }
                        ],
                    });
                    channelId = clanChannel.id;
                    await clanChannel.send(t('clan_channel_welcome', { clanName }));
                } else {
                     await interaction.followUp({ content: t('clan_create_category_not_found'), ephemeral: true });
                }
            }
            
            const clanId = uuidv4();
            const newClan = {
                id: clanId,
                name: clanName,
                tag: clanTag,
                leader: userId,
                members: [userId],
                createdAt: new Date(),
                roleId: clanRole.id,
                channelId: channelId,
            };

            stats.clanId = clanId;

            userStats.set(userId, stats);
            clans.set(clanName.toLowerCase(), newClan);

            await interaction.editReply({ content: t('clan_create_success', { clanName, clanTag }) });

        } catch (error) {
            console.error('Erro ao criar clã, role ou canal:', error);
            stats.coins += creationCost; // Devolve o dinheiro se falhar
            userStats.set(userId, stats);
            await interaction.editReply({ content: t('clan_create_error_generic'), ephemeral: true });
        }
    },
};
