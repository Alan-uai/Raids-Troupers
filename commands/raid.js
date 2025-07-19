import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Anunciar uma nova Raid')
    .addStringOption(option =>
      option.setName('nivel').setDescription('Nível da Raid').setRequired(true))
    .addStringOption(option =>
      option.setName('dificuldade').setDescription('Dificuldade').setRequired(true))
    .addStringOption(option =>
      option.setName('roblox_user_id').setDescription('O seu ID de usuário do Roblox').setRequired(false)),
    
  async execute(interaction) {
    const nivel = interaction.options.getString('nivel');
    const dificuldade = interaction.options.getString('dificuldade');
    const robloxUserId = interaction.options.getString('roblox_user_id');
    const user = interaction.user;

    const robloxProfileUrl = robloxUserId ? `https://www.roblox.com/users/${robloxUserId}/profile` : 'https://www.roblox.com';

    const embed = new EmbedBuilder()
      .setAuthor({ name: `Anúncio de Raid de ${user.username}`, iconURL: user.displayAvatarURL() })
      .setDescription(`Gostaria de ajuda para uma Raid **nível ${nivel}**, dificuldade **${dificuldade}**.\n\n[📎 Clique aqui para ver o perfil no Roblox](${robloxProfileUrl})`)
      .setColor(0xffcc00)
      .setFooter({ text: 'Boa sorte na missão!' })
      .setTimestamp();

    // ID do canal onde o anúncio será enviado. Substitua pelo ID do seu canal de raids.
    const raidChannelId = '1395591154208084049'; 
    const channel = interaction.client.channels.cache.get(raidChannelId);

    if (channel) {
        try {
            await channel.send({ embeds: [embed] });
            await interaction.reply({ content: '📣 Raid anunciada com sucesso!', ephemeral: true });
        } catch (error) {
            console.error('Erro ao enviar a mensagem para o canal de raids:', error);
            await interaction.reply({ content: 'Não consegui enviar o anúncio no canal de raids. Verifique minhas permissões!', ephemeral: true });
        }
    } else {
        await interaction.reply({ content: `O canal de anúncios com ID \`${raidChannelId}\` não foi encontrado.`, ephemeral: true });
    }
  }
};
