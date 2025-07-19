import { SlashCommandBuilder } from 'discord.js';
import { OpenAI } from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export default {
  data: new SlashCommandBuilder()
    .setName('cap')
    .setDescription('Converse com o Cap, o GPT do servidor!')
    .addStringOption(option =>
      option.setName('mensagem')
        .setDescription('O que você quer perguntar?')
        .setRequired(true)),

  async execute(interaction) {
    if (!openai) {
        return interaction.reply({ content: 'A chave da API da OpenAI não foi configurada. O comando `/cap` está desativado.', ephemeral: true });
    }
  
    await interaction.deferReply(); // Informa ao Discord que a resposta pode demorar.
    
    const pergunta = interaction.options.getString('mensagem');

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: 'Você é um assistente prestativo chamado Cap.' }, { role: 'user', content: pergunta }]
      });

      const resposta = completion.choices[0].message.content;

      await interaction.editReply(resposta.slice(0, 2000));
    } catch (err) {
      console.error(err);
      await interaction.editReply('Desculpe, ocorreu um erro ao tentar me comunicar com a API da OpenAI.');
    }
  }
};
