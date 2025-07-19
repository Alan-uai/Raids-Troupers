// src/commands/cla_criar.js
import { SlashCommandBuilder } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';

export default {
    data: new SlashCommandBuilder()
        .setName('cla_criar')
        .setDescription('Cria um novo clã.')
        .addStringOption(option =>
            option.setName('nome')
                .setDescription('O nome do seu novo clã (máx 20 caracteres).')
                .setRequired(true)
                .setMaxLength(20))
        .addStringOption(option =>
            option.setName('tag')
                .setDescription('A tag do seu clã (3-5 caracteres).')
                .setRequired(true)
                .setMinLength(3)
                .setMaxLength(5)),

    async execute(interaction, { userStats, clans }) {
        const clanName = interaction.options.getString('nome');
        const clanTag = interaction.options.getString('tag');
        const userId = interaction.user.id;
        const creationCost = 2500; // Custo para criar um clã

        const stats = userStats.get(userId);
        if (stats?.clanId) {
            return await interaction.reply({ content: '❌ Você já faz parte de um clã.', ephemeral: true });
        }

        if (!stats || stats.coins < creationCost) {
            return await interaction.reply({ content: `💰 Você precisa de ${creationCost} Troup Coins para criar um clã. Você tem apenas ${stats?.coins || 0}.`, ephemeral: true });
        }

        if (clans.has(clanName.toLowerCase())) {
            return await interaction.reply({ content: '❌ Já existe um clã com este nome.', ephemeral: true });
        }

        const tagExists = Array.from(clans.values()).some(c => c.tag.toLowerCase() === clanTag.toLowerCase());
        if (tagExists) {
            return await interaction.reply({ content: '❌ Já existe um clã com esta tag.', ephemeral: true });
        }

        // Deduzir moedas
        stats.coins -= creationCost;

        // Criar o clã
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

        // Salvar dados
        userStats.set(userId, stats);
        clans.set(clanName.toLowerCase(), newClan);

        await interaction.reply({ content: `🎉 Parabéns! O clã **${clanName}** [${clanTag}] foi fundado com sucesso! Seu perfil será atualizado.` });
        
        // Futuramente: Atualizar o perfil do usuário aqui para mostrar a tag do clã
    },
};
