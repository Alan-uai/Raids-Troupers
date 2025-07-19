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
    const pergunta = interaction.options.getString('mensagem');
    await interaction.reply({ content: "Pensando no seu caso...🤔💡", ephemeral: true });

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: pergunta }]
      });

      const resposta = completion.choices[0].message.content;

      await interaction.editReply(resposta.slice(0, 2000)); // Discord limita a 2000 caracteres
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: 'Erro ao consultar o Cap.'});
    }
  }
};
