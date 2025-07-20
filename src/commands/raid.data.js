import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Anunciar uma nova Raid')
    .setDescriptionLocalizations({ "en-US": "Announce a new Raid" })
    .addStringOption(option =>
      option.setName('nivel')
        .setDescription('Nível da Raid')
        .setDescriptionLocalizations({ "en-US": "Raid Level" })
        .setRequired(true)
        .addChoices(
          { name: 'Level 200', value: '200' },
          { name: 'Level 600', value: '600' },
          { name: 'Level 1200', value: '1200' },
          { name: 'Level 1500', value: '1500' },
          { name: 'Level 1700', value: '1700' }
        ))
    .addStringOption(option =>
      option.setName('dificuldade')
        .setDescription('Dificuldade da Raid')
        .setDescriptionLocalizations({ "en-US": "Raid Difficulty" })
        .setRequired(true)
        .addChoices(
            { name: 'Fácil', value: 'Fácil' },
            { name: 'Média', value: 'Média' },
            { name: 'Difícil', value: 'Difícil' }
        ));
