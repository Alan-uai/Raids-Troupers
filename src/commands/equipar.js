import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { shopItems } from '../shop-items.js';
import { rareItems } from '../rare-items.js';
import { generateProfileImage } from '../profile-generator.js';


export default {
  data: new SlashCommandBuilder()
    .setName('equipar')
    .setDescription('Equipe um item do seu inventário.')
    .addStringOption(option =>
      option.setName('item_id')
        .setDescription('O ID do item que você deseja equipar.')
        .setRequired(true)),
  async execute(interaction, { userStats, userItems, userProfiles }) {
    await interaction.deferReply({ ephemeral: true });

    const itemId = interaction.options.getString('item_id');
    const userId = interaction.user.id;
    
    const items = userItems.get(userId);

    if (!items || !items.inventory.includes(itemId)) {
      return await interaction.editReply({ content: '❌ Você não possui este item.', ephemeral: true });
    }
    
    const allItems = [...shopItems, ...rareItems];
    const itemToEquip = allItems.find(item => item.id === itemId);

    if (!itemToEquip) {
        return await interaction.editReply({ content: '❌ Esse item não parece mais existir.', ephemeral: true });
    }

    // Lógica para equipar diferentes tipos de item
    if (itemToEquip.type === 'background') {
        items.equippedBackground = itemToEquip.url;
        await interaction.editReply({ content: `✅ Você equipou o fundo **${itemToEquip.name}**! Seu perfil foi atualizado.`, ephemeral: true });
    } else if (itemToEquip.type === 'title') {
        items.equippedTitle = itemToEquip.name;
         await interaction.editReply({ content: `✅ Você equipou o título **${itemToEquip.name}**! Seu perfil foi atualizado.`, ephemeral: true });
    } else {
        return await interaction.editReply({ content: '❌ Este tipo de item não pode ser equipado diretamente.', ephemeral: true });
    }

    userItems.set(userId, items);
    
    // Atualizar a imagem do perfil
    const profileInfo = userProfiles.get(userId);
    if (profileInfo?.channelId && profileInfo?.messageId) {
        try {
            const stats = userStats.get(userId);
            const member = await interaction.guild.members.fetch(userId);

            const newProfileImageBuffer = await generateProfileImage(member, stats, items);
            const newAttachment = new AttachmentBuilder(newProfileImageBuffer, { name: 'profile-card.png' });

            const profileChannel = await interaction.client.channels.fetch(profileInfo.channelId);
            const profileMessage = await profileChannel.messages.fetch(profileInfo.messageId);
            
            await profileMessage.edit({ files: [newAttachment] });

        } catch (updateError) {
            console.error(`Falha ao editar a imagem de perfil para ${userId}:`, updateError);
            // A mensagem de resposta já foi enviada, então apenas logamos o erro.
        }
    }
  },
};
