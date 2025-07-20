import { AttachmentBuilder } from 'discord.js';
import { shopItems } from '../shop-items.js';
import { rareItems } from '../rare-items.js';
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
    
    const allItems = [...shopItems, ...rareItems];
    const itemToEquip = allItems.find(item => item.id === itemId);

    if (!itemToEquip) {
        return await interaction.editReply({ content: t('equip_item_not_exist'), ephemeral: true });
    }

    let replyMessage = '';

    if (itemToEquip.type === 'background') {
        items.equippedBackground = itemToBuy.url;
        replyMessage = t('equip_background_success', { itemName: t(`item_${itemToEquip.id}_name`) });
    } else if (itemToEquip.type === 'title') {
        items.equippedTitle = itemToEquip.id; // Store ID, not name
        replyMessage = t('equip_title_success', { itemName: t(`item_${itemToEquip.id}_name`) });
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
