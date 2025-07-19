import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('loja')
    .setDescription('Mostra os itens disponíveis para compra.'),
  async execute(interaction) {
    // Lógica a ser implementada
    await interaction.reply({ content: 'Este comando ainda está em construção!', ephemeral: true });
  },
};
