import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Anunciar uma nova Raid')
    .addStringOption(option =>
      option.setName('nivel').setDescription('Nível da Raid').setRequired(true))
    .addStringOption(option =>
      option.setName('dificuldade').setDescription('Dificuldade').setRequired(true)),
    
  async execute(interaction) {
    const nivel = interaction.options.getString('nivel');
    const dificuldade = interaction.options.getString('dificuldade');
    const user = interaction.user;

    const embed = new EmbedBuilder()
      .setTitle(`${user.username} convocou uma Raid!`)
      .setDescription(`Gostaria de ajuda para uma Raid **nível ${nivel}**, dificuldade **${dificuldade}**.\n\n[📎 Clique aqui para adicionar no Roblox](https://www.roblox.com/users/add.aspx?friendshipauthtoken)`)
      .setColor(0xffcc00)
      .setThumbnail(user.displayAvatarURL())
      .setFooter({ text: 'Boa sorte na missão!' })
      .setTimestamp();

    await interaction.reply({ content: '📣 Raid anunciada com sucesso!', embeds: [embed], ephemeral: false });
  }
};