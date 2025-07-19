import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('inventario')
    .setDescription('Veja os itens que você possui.'),
  async execute(interaction) {
    // Lógica a ser implementada
    await interaction.reply({ content: 'Este comando ainda está em construção!', ephemeral: true });
  },
};
