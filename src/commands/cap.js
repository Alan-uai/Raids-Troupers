import { SlashCommandBuilder } from 'discord.js';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default {
  data: new SlashCommandBuilder()
    .setName('cap')
    .setDescription('Converse com o Cap, o GPT do servidor!')
    .addStringOption(option =>
      option.setName('mensagem')
        .setDescription('O que você quer perguntar?')
        .setRequired(true)),

  async execute(interaction) {
    // Adia a resposta para ganhar mais tempo (até 15 minutos)
    await interaction.deferReply({ ephemeral: true });

    const pergunta = interaction.options.getString('mensagem');

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: pergunta }]
      });

      const resposta = completion.choices[0].message.content;

      // Edita a resposta adiada com o resultado do GPT
      await interaction.editReply(resposta.slice(0, 2000));
    } catch (err) {
      console.error("Erro no comando /cap:", err);
      // Edita a resposta adiada com uma mensagem de erro
      await interaction.editReply({ content: 'Erro ao consultar o Cap.' });
    }
  }
};
