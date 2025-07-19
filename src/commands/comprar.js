import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('comprar')
    .setDescription('Compre um item da loja.'),
  async execute(interaction) {
    // Lógica a ser implementada
    await interaction.reply({ content: 'Este comando ainda está em construção!', ephemeral: true });
  },
};
