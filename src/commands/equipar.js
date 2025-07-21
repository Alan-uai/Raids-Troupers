import { AttachmentBuilder } from 'discord.js';
import { allItems, isCosmetic, isGear } from '../items.js';
import { generateProfileImage } from '../profile-generator.js';
import { getTranslator } from '../i18n.js';
import { data } from './equipar.data.js';

export default {
  data: data,
  async execute(interaction, { userStats, userItems, userProfiles, clans }) {
    const t = await getTranslator(interaction.user.id, userStats);
    await interaction.deferReply({ ephemeral: true });

    const itemId = interaction.options.getString('item_id');
    const userId = interaction.user.id;
    
    const items = userItems.get(userId);

    if (!items || !items.inventory.includes(itemId)) {
      return await interaction.editReply({ content: t('equip_not_owned'), ephemeral: true });
    }
    
    const itemToEquip = allItems.find(item => item.id === itemId);

    if (!itemToEquip) {
        return await interaction.editReply({ content: t('equip_item_not_exist'), ephemeral: true });
    }

    let replyMessage = '';

    // Inicializa os objetos de equipamento se não existirem
    if (!items.equippedCosmetics) items.equippedCosmetics = {};
    if (!items.equippedGear) items.equippedGear = {};

    if (isCosmetic(itemToEquip)) {
        items.equippedCosmetics[itemToEquip.type] = itemToEquip.id;
        replyMessage = t('equip_cosmetic_success', { itemType: t(`item_type_${itemToEquip.type}`), itemName: t(`item_${itemToEquip.id}_name`) || itemToEquip.name });
    } else if (isGear(itemToEquip)) {
        items.equippedGear[itemToEquip.type] = itemToEquip.id;
        replyMessage = t('equip_gear_success', { itemType: t(`item_type_${itemToEquip.type}`), itemName: t(`item_${itemToEquip.id}_name`) || itemToEquip.name });
    } else {
        return await interaction.editReply({ content: t('equip_cannot_equip_type'), ephemeral: true });
    }

    userItems.set(userId, items);
    
    const profileInfo = userProfiles.get(userId);
    if (profileInfo?.channelId && profileInfo?.messageId) {
        try {
            const stats = userStats.get(userId);
            const member = await interaction.guild.members.fetch(userId);

            const newProfileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
            const newAttachment = new AttachmentBuilder(newProfileImageBuffer, { name: 'profile-card.png' });

            const profileChannel = await interaction.client.channels.fetch(profileInfo.channelId);
            const profileMessage = await profileChannel.messages.fetch(profileInfo.messageId);
            
            await profileMessage.edit({ files: [newAttachment] });

        } catch (updateError) {
            console.error(`Failed to update profile image for ${userId}:`, updateError);
        }
    }
    
    await interaction.editReply({ content: replyMessage, ephemeral: true });
  },
};
