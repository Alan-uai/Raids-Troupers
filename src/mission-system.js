import { missions as missionPool } from './missions.js';
import { generateProfileImage } from './profile-generator.js';
import { AttachmentBuilder } from 'discord.js';
import { getTranslator } from './i18n.js';

export function assignMissions(userId, userMissions) {
    if (userMissions.has(userId)) return;

    const shuffledMissions = [...missionPool].sort(() => 0.5 - Math.random());
    const missionsToAssign = shuffledMissions.slice(0, 3).map(mission => ({
        id: mission.id,
        progress: 0,
        completed: false,
    }));
    
    userMissions.set(userId, missionsToAssign);
    console.log(`Assigned initial missions to ${userId}`);
}

export async function checkMissionCompletion(user, missionType, channel, data) {
    const { userMissions, userStats, client, userProfiles, userItems, clans } = data;
    const userId = user.id;

    if (!userMissions.has(userId)) assignMissions(userId, userMissions);

    const activeMissions = userMissions.get(userId);
    if (!activeMissions) return;

    const t = await getTranslator(userId, userStats);

    let profileNeedsUpdate = false;

    for (const missionProgress of activeMissions) {
        const missionDetails = missionPool.find(m => m.id === missionProgress.id);

        if (missionDetails && missionDetails.type === missionType && !missionProgress.completed) {
            missionProgress.progress += 1;

            if (missionProgress.progress >= missionDetails.goal) {
                missionProgress.completed = true;
                
                const stats = userStats.get(userId);
                const reward = missionDetails.reward;
                stats.xp += reward.xp;
                stats.coins += reward.coins;
                profileNeedsUpdate = true;
                
                const xpToLevelUp = 100;
                if (stats.xp >= xpToLevelUp) {
                    stats.level += 1;
                    stats.xp -= xpToLevelUp;
                    await channel.send(t('level_up_from_mission', { userId, level: stats.level }));
                }
                
                userStats.set(userId, stats);
                
                const missionDescription = t(`mission_${missionDetails.id}_description`);
                await channel.send(t('mission_completed_notification', { userId, description: missionDescription, xp: reward.xp, coins: reward.coins }));
            }
        }
    }

    if (profileNeedsUpdate) {
        const profileInfo = userProfiles.get(userId);
        if (profileInfo) {
            try {
                const profileChannel = await client.channels.fetch(profileInfo.channelId);
                const profileMessage = await profileChannel.messages.fetch(profileInfo.messageId);
                const member = await channel.guild.members.fetch(userId);
                const items = userItems.get(userId) || { inventory: [], equippedBackground: 'default', equippedTitle: 'default' };
                
                const newProfileImageBuffer = await generateProfileImage(member, userStats.get(userId), items, clans, t);
                const newAttachment = new AttachmentBuilder(newProfileImageBuffer, { name: 'profile-card.png' });
                
                await profileMessage.edit({ files: [newAttachment] });
            } catch (updateError) {
                console.error(`Failed to update profile image for ${userId} after mission completion:`, updateError);
            }
        }
    }
    
    userMissions.set(userId, activeMissions);
}
