import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('escolher_classe')
    .setDescription('Escolha sua especialização de combate.')
    .setDescriptionLocalizations({ "en-US": "Choose your combat specialization." })
    .addStringOption(option =>
      option.setName('id_da_classe')
        .setDescription('O ID da classe que você deseja seguir.')
        .setDescriptionLocalizations({ "en-US": "The ID of the class you want to follow." })
        .setRequired(true));
