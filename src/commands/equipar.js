import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('equipar')
    .setDescription('Equipe um item do seu inventário.'),
  async execute(interaction) {
    // Lógica a ser implementada
    await interaction.reply({ content: 'Este comando ainda está em construção!', ephemeral: true });
  },
};
