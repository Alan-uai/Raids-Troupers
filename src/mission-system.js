import { missions as missionPool } from './missions.js';
import { generateProfileImage } from './profile-generator.js';
import { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getTranslator } from './i18n.js';
import { allItems } from './items.js';

function getDifficultyMultiplier(statValue) {
    if (statValue < 10) return 1;       // Normal
    if (statValue < 50) return 0.8;     // Slightly easier
    if (statValue < 150) return 0.6;    // Noticeably easier
    if (statValue < 500) return 0.5;    // Half goal
    return 0.4;                         // Very easy
}

function generateIntelligentMission(missionTemplate, stats) {
    const newMission = { ...missionTemplate };
    let statValue = 0;

    switch (newMission.type) {
        case 'RAID_CREATED':
            statValue = stats.raidsCreated || 0;
            break;
        case 'RAID_HELPED':
            statValue = stats.raidsHelped || 0;
            break;
        case 'KICK_MEMBER':
            statValue = stats.kickedOthers || 0;
            break;
        case 'RATE_PLAYER':
             statValue = stats.totalRatings || 0;
            break;
        default:
            statValue = 0;
    }

    const multiplier = getDifficultyMultiplier(statValue);
    newMission.goal = Math.max(1, Math.ceil(newMission.goal * multiplier));

    return newMission;
}


export function assignMissions(userId, userMissions, stats) {
    if (userMissions.has(userId) && userMissions.get(userId).length > 0) return;

    const shuffledMissions = [...missionPool].sort(() => 0.5 - Math.random());
    const missionsToAssign = shuffledMissions.slice(0, 3).map(missionTemplate => {
        const intelligentMission = generateIntelligentMission(missionTemplate, stats);
        return {
            id: intelligentMission.id,
            progress: 0,
            completed: false,
            collected: false,
            messageId: null,
            goal: intelligentMission.goal, // Store the adjusted goal
            reward: intelligentMission.reward, // Store reward
        };
    });
    
    userMissions.set(userId, missionsToAssign);
    console.log(`Assigned initial intelligent missions to ${userId}`);
}

async function collectReward(user, missionDetails, missionProgress, data, interaction) {
    const { userStats, userItems, client, clans } = data;
    const userId = user.id;
    const t = await getTranslator(userId, userStats);

    if (missionProgress.collected) return;

    missionProgress.collected = true;
    const stats = userStats.get(userId);
    const reward = missionDetails.reward;
    let replyMessage = '';

    if (reward.item) {
        const items = userItems.get(userId) || { inventory: [], equippedBackground: 'default', equippedTitle: 'default', equippedBorder: null };
        items.inventory.push(reward.item);
        userItems.set(userId, items);
        const itemDetails = allItems.find(i => i.id === reward.item);
        const itemName = t(`item_${itemDetails.id}_name`);
        replyMessage = t('missions_collect_success_item', { itemName });
        if (itemDetails.rarity === 'Kardec') {
            const guild = interaction.guild;
            let role = guild.roles.cache.find(r => r.name === 'Kardec');
            if (!role) {
                try {
                    role = await guild.roles.create({
                        name: 'Kardec',
                        color: '#FF0000',
                        hoist: true,
                        reason: 'Role for owners of Kardec-rarity items.'
                    });
                } catch(e) { console.error("Failed to create Kardec role:", e); }
            }
            if (role) {
                const member = await guild.members.fetch(userId);
                await member.roles.add(role).catch(e => console.error(`Failed to add Kardec role to ${userId}:`, e));
            }
        }

    } else {
        stats.xp += reward.xp;
        stats.coins += reward.coins;
        replyMessage = t('missions_collect_success', { xp: reward.xp, coins: reward.coins });
    }
    
    let leveledUp = false;
    if (stats.xp) {
        const xpToLevelUp = 100 * stats.level;
        while (stats.xp >= xpToLevelUp) {
            stats.level += 1;
            stats.xp -= xpToLevelUp;
            leveledUp = true;
        }
    }

    userStats.set(userId, stats);

    try {
        const dmMessage = leveledUp 
            ? `${replyMessage}\n${t('level_up_from_mission', { level: stats.level })}`
            : replyMessage;
        await user.send(dmMessage);
    } catch (e) {
        console.log(`Could not DM user ${user.id} about mission completion/level up.`);
    }

    // Assign a new mission to replace the collected one
    const activeMissions = data.userMissions.get(userId);
    const newMissionPool = missionPool.filter(m => !activeMissions.some(am => am.id === m.id));
    if (newMissionPool.length > 0) {
        const newMissionTemplate = newMissionPool[Math.floor(Math.random() * newMissionPool.length)];
        const newIntelligentMission = generateIntelligentMission(newMissionTemplate, stats);
        
        const newMissionProgress = {
            id: newIntelligentMission.id,
            progress: 0,
            completed: false,
            collected: false,
            messageId: missionProgress.messageId, // Reuse the message ID
            goal: newIntelligentMission.goal,
            reward: newIntelligentMission.reward
        };
        const missionIndex = activeMissions.findIndex(m => m.id === missionProgress.id);
        activeMissions[missionIndex] = newMissionProgress;
        data.userMissions.set(userId, activeMissions);
        await updateMissionMessage(user, newMissionProgress, data);
    }
    
    // Also update the profile image to reflect new stats
    await updateProfileImage(user, data);
}


export async function checkMissionCompletion(user, missionType, data) {
    const { userMissions, userStats, client, userProfiles, userItems, clans } = data;
    const userId = user.id;

    if (!userMissions.has(userId)) {
        assignMissions(userId, userMissions, userStats.get(userId) || {});
    }

    const activeMissions = userMissions.get(userId);
    if (!activeMissions) return;

    let profileNeedsUpdate = false;

    for (const missionProgress of activeMissions) {
        if (missionProgress.completed) continue;

        const missionDetails = missionPool.find(m => m.id === missionProgress.id);

        if (missionDetails && missionDetails.type === missionType) {
            missionProgress.progress += 1;
            profileNeedsUpdate = true; // Progress changed

            if (missionProgress.progress >= missionProgress.goal) {
                missionProgress.completed = true;

                const stats = userStats.get(userId);
                if (stats?.autoCollectMissions) {
                    await collectReward(user, missionDetails, missionProgress, data);
                }
                // Always update the message to enable the button or show it's auto-collected
                await updateMissionMessage(user, missionProgress, data);
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
        const profileInfo = data.userProfiles.get(user.id);
        if (!profileInfo) return;
        const profileChannel = await client.channels.fetch(profileInfo.channelId);
        const missionThread = profileChannel.threads.cache.find(t => t.name === 'Missões' || t.name === 'Missions');
        if (!missionThread) return;

        if (!missionProgress.messageId) return;
        const missionMessage = await missionThread.messages.fetch(missionProgress.messageId);

        const rewardText = missionProgress.reward.item
            ? `Item: ${t(`item_${missionProgress.reward.item}_name`)}`
            : `${missionProgress.reward.xp} XP & ${missionProgress.reward.coins} TC`;
        
        const newEmbed = EmbedBuilder.from(missionMessage.embeds[0])
            .setTitle(t(`mission_${missionDetails.id}_description`))
            .setDescription(`**${t('progress')}:** ${missionProgress.progress} / ${missionProgress.goal}\n**${t('reward')}:** ${rewardText}`);
        
        const newButton = ButtonBuilder.from(missionMessage.components[0].components[0]);
        const isComplete = missionProgress.progress >= missionProgress.goal;
        
        newButton.setDisabled(!isComplete || missionProgress.collected);
        
        if (missionProgress.collected) {
            newButton.setLabel(t('missions_collected_button')).setStyle(ButtonStyle.Secondary);
        } else {
            newButton.setLabel(t('missions_collect_button')).setStyle(ButtonStyle.Success);
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
            const items = userItems.get(userId) || { inventory: [], equippedBackground: 'default', equippedTitle: 'default', equippedBorder: null };
            const stats = userStats.get(userId) || {};
            
            const newProfileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
            const newAttachment = new AttachmentBuilder(newProfileImageBuffer, { name: 'profile-card.png' });
            
            await profileMessage.edit({ files: [newAttachment] });
        } catch (updateError) {
            console.error(`Failed to update profile image for ${userId} after mission update:`, updateError);
        }
    }
}

    