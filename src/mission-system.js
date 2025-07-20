import { missions as missionPool } from './missions.js';
import { generateProfileImage } from './profile-generator.js';
import { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getTranslator } from './i18n.js';

export function assignMissions(userId, userMissions) {
    if (userMissions.has(userId) && userMissions.get(userId).length > 0) return;

    const shuffledMissions = [...missionPool].sort(() => 0.5 - Math.random());
    const missionsToAssign = shuffledMissions.slice(0, 3).map(mission => ({
        id: mission.id,
        progress: 0,
        completed: false,
        collected: false,
        messageId: null,
    }));
    
    userMissions.set(userId, missionsToAssign);
    console.log(`Assigned initial missions to ${userId}`);
}

async function collectReward(user, missionDetails, missionProgress, data) {
    const { userStats } = data;
    const userId = user.id;
    const t = await getTranslator(userId, userStats);

    if (missionProgress.collected) return;

    missionProgress.collected = true;
    const stats = userStats.get(userId);
    const reward = missionDetails.reward;
    stats.xp += reward.xp;
    stats.coins += reward.coins;

    let leveledUp = false;
    const xpToLevelUp = 100 * stats.level;
    while (stats.xp >= xpToLevelUp) {
        stats.level += 1;
        stats.xp -= xpToLevelUp;
        leveledUp = true;
    }

    userStats.set(userId, stats);

    try {
        const missionDescription = t(`mission_${missionDetails.id}_description`);
        await user.send({ content: t('mission_completed_notification', { description: missionDescription, xp: reward.xp, coins: reward.coins }) });
        if(leveledUp) {
            await user.send({ content: t('level_up_from_mission', { level: stats.level }) });
        }
    } catch (e) {
        console.log(`Could not DM user ${user.id} about mission completion/level up.`);
    }

    // Assign a new mission to replace the collected one
    const activeMissions = data.userMissions.get(userId);
    const newMissionPool = missionPool.filter(m => !activeMissions.some(am => am.id === m.id));
    if (newMissionPool.length > 0) {
        const newMissionDetails = newMissionPool[Math.floor(Math.random() * newMissionPool.length)];
        const newMissionProgress = {
            id: newMissionDetails.id,
            progress: 0,
            completed: false,
            collected: false,
            messageId: missionProgress.messageId // Reuse the message ID
        };
        const missionIndex = activeMissions.findIndex(m => m.id === missionProgress.id);
        activeMissions[missionIndex] = newMissionProgress;
        data.userMissions.set(userId, activeMissions);
        // We will need to update the message embed for this new mission
        await updateMissionMessage(user, newMissionProgress, data);
    }
}


export async function checkMissionCompletion(user, missionType, data) {
    const { userMissions, userStats, client, userProfiles, userItems, clans } = data;
    const userId = user.id;

    if (!userMissions.has(userId)) {
        assignMissions(userId, userMissions);
    }

    const activeMissions = userMissions.get(userId);
    if (!activeMissions) return;

    const t = await getTranslator(userId, userStats);

    let profileNeedsUpdate = false;

    for (const missionProgress of activeMissions) {
        if (missionProgress.completed) continue;

        const missionDetails = missionPool.find(m => m.id === missionProgress.id);

        if (missionDetails && missionDetails.type === missionType) {
            missionProgress.progress += 1;
            profileNeedsUpdate = true; // Progress changed

            if (missionProgress.progress >= missionDetails.goal) {
                missionProgress.completed = true;

                const stats = userStats.get(userId);
                if (stats?.autoCollectMissions) {
                    await collectReward(user, missionDetails, missionProgress, data);
                } else {
                    await updateMissionMessage(user, missionProgress, data);
                }
            } else {
                 await updateMissionMessage(user, missionProgress, data);
            }
        }
    }
    
    if (profileNeedsUpdate) {
        updateProfileImage(user, data);
    }
    
    userMissions.set(userId, activeMissions);
}

async function updateMissionMessage(user, missionProgress, data) {
    const { userStats, client } = data;
    const t = await getTranslator(user.id, userStats);
    const missionDetails = missionPool.find(m => m.id === missionProgress.id);
    if (!missionDetails) return;

    try {
        // Find the thread
        const profileInfo = data.userProfiles.get(user.id);
        if (!profileInfo) return;
        const profileChannel = await client.channels.fetch(profileInfo.channelId);
        const missionThread = profileChannel.threads.cache.find(t => t.name === 'Missões' || t.name === 'Missions');
        if (!missionThread) return;

        // Find the message
        if (!missionProgress.messageId) return;
        const missionMessage = await missionThread.messages.fetch(missionProgress.messageId);

        // Update the embed
        const newEmbed = EmbedBuilder.from(missionMessage.embeds[0])
            .setDescription(`**${t('progress')}:** ${missionProgress.progress} / ${missionDetails.goal}\n**${t('reward')}:** ${missionDetails.reward.xp} XP & ${missionDetails.reward.coins} TC`);
        
        // If mission is new (after collection), update title as well
        newEmbed.setTitle(t(`mission_${missionDetails.id}_description`));

        const newButton = ButtonBuilder.from(missionMessage.components[0].components[0]);
        newButton.setDisabled(missionProgress.progress < missionDetails.goal || missionProgress.collected);
        
        if(missionProgress.collected) {
            newButton.setLabel(t('missions_collected_button')).setStyle(ButtonStyle.Secondary);
        }

        const newRow = new ActionRowBuilder().addComponents(newButton);

        await missionMessage.edit({ embeds: [newEmbed], components: [newRow] });

    } catch (error) {
        console.error(`Failed to update mission message for ${user.id} and mission ${missionProgress.id}:`, error);
    }
}


async function updateProfileImage(user, data) {
    const { client, userProfiles, userStats, userItems, clans } = data;
    const userId = user.id;
    const profileInfo = userProfiles.get(userId);
     if (profileInfo) {
        try {
            const profileChannel = await client.channels.fetch(profileInfo.channelId);
            const t = await getTranslator(userId, userStats);
            const profileMessage = await profileChannel.messages.fetch(profileInfo.messageId);
            const member = await profileChannel.guild.members.fetch(userId);
            const items = userItems.get(userId) || { inventory: [], equippedBackground: 'default', equippedTitle: 'default' };
            
            const newProfileImageBuffer = await generateProfileImage(member, userStats.get(userId), items, clans, t);
            const newAttachment = new AttachmentBuilder(newProfileImageBuffer, { name: 'profile-card.png' });
            
            await profileMessage.edit({ files: [newAttachment] });
        } catch (updateError) {
            console.error(`Failed to update profile image for ${userId} after mission update:`, updateError);
        }
    }
}
