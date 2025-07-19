import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { shopItems } from '../shop-items.js';

export default {
  data: new SlashCommandBuilder()
    .setName('loja')
    .setDescription('Mostra os itens disponíveis para compra.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('🛒 Loja de Fundos de Perfil')
      .setDescription('Use `/comprar item_id:<ID do item>` para adquirir um novo fundo!')
      .setTimestamp();

    shopItems.forEach(item => {
      embed.addFields({
        name: `${item.name}`,
        value: `**Preço:** ${item.price} Troup Coins\n**ID:** \`${item.id}\``,
        inline: true,
      });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
