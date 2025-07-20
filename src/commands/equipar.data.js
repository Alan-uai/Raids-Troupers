import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('equipar')
    .setDescription('Equipe um item do seu inventário.')
    .setDescriptionLocalizations({ "en-US": "Equip an item from your inventory." })
    .addStringOption(option =>
      option.setName('item_id')
        .setDescription('O ID do item que você deseja equipar.')
        .setDescriptionLocalizations({ "en-US": "The ID of the item you want to equip." })
        .setRequired(true));
