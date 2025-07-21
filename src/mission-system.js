import { missions as missionPool } from './missions.js';
import { generateProfileImage } from './profile-generator.js';
import { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getTranslator } from './i18n.js';
import { allItems } from './items.js';
import { milestones, checkMilestoneCompletion } from './milestones.js';

function getDifficultyMultiplier(statValue) {
    if (statValue < 10) return 1;
    if (statValue < 50) return 1.2;
    if (statValue < 150) return 1.5;
    if (statValue < 500) return 2.0;
    return 2.5;
}

function generateIntelligentMission(missionTemplate, stats) {
    const newMission = JSON.parse(JSON.stringify(missionTemplate));
    let statValue = 0;

    const statMap = {
        'RAID_CREATED': stats.raidsCreated || 0,
        'RAID_HELPED': stats.raidsHelped || 0,
        'KICK_MEMBER': stats.kickedOthers || 0,
        'RATE_PLAYER': stats.totalRatings || 0,
        'JOIN_CLAN': stats.clanId ? 1 : 0,
        'EARN_COINS': stats.coins || 0,
        'LEVEL_UP': stats.level || 0,
    };
    
    statValue = statMap[newMission.type] || 0;

    const multiplier = getDifficultyMultiplier(statValue);
    newMission.goal = Math.max(1, Math.ceil(newMission.goal * multiplier));

    if (stats.level > 10 && Math.random() < 0.2) { // 20% de chance para missões com itens raros
        const rareItemPool = allItems.filter(i => i.source === 'mission' && ['RARO', 'MAIS_QUE_RARO', 'ULTRA_RARO', 'MENOS_QUE_LENDARIO'].includes(i.rarity));
        if(rareItemPool.length > 0) {
            newMission.reward = { item: rareItemPool[Math.floor(Math.random() * rareItemPool.length)].id };
        }
    }
    
    return newMission;
}


export function assignMissions(userId, userMissions, stats) {
    if (userMissions.has(userId)) return;

    const dailyMissions = missionPool.filter(m => m.category === 'daily');
    const weeklyMissions = missionPool.filter(m => m.category === 'weekly');
    
    const missionsToAssign = {
        daily: [],
        weekly: null
    };

    const shuffledDailies = [...dailyMissions].sort(() => 0.5 - Math.random());
    for(let i = 0; i < 3; i++) {
        const intelligentMission = generateIntelligentMission(shuffledDailies[i], stats);
        missionsToAssign.daily.push({
            id: intelligentMission.id,
            progress: 0,
            completed: false,
            collected: false,
            messageId: null
        });
    }

    if (weeklyMissions.length > 0) {
        const weeklyTemplate = weeklyMissions[Math.floor(Math.random() * weeklyMissions.length)];
        const intelligentWeekly = generateIntelligentMission(weeklyTemplate, stats);
        missionsToAssign.weekly = {
            id: intelligentWeekly.id,
            progress: 0,
            completed: false,
            collected: false,
            messageId: null,
            goal: intelligentWeekly.goal,
            reward: intelligentWeekly.reward
        };
    }
    
    userMissions.set(userId, missionsToAssign);
    console.log(`Assigned initial intelligent missions to ${userId}`);
}

export async function collectReward(user, missionProgress, data, interaction, type) {
    const { userStats, userItems, client, clans } = data;
    const userId = user.id;
    const t = await getTranslator(userId, userStats);

    const missionDetails = missionPool.find(m => m.id === missionProgress.id);
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

    if (type === 'weekly') {
        const button = ButtonBuilder.from(interaction.message.components[0].components[0])
            .setDisabled(true)
            .setLabel(t('missions_collected_button'))
            .setStyle(ButtonStyle.Secondary);
        const row = new ActionRowBuilder().addComponents(button);
        await interaction.message.edit({ components: [row] });
    }
    
    // Also update the profile image to reflect new stats
    await updateProfileImage(user, data);
}


export async function checkMissionCompletion(user, missionType, data, amount = 1) {
    const { userMissions, userStats, client, userProfiles, userItems, clans } = data;
    const userId = user.id;

    if (!userMissions.has(userId)) {
        assignMissions(userId, userMissions, userStats.get(userId) || {});
    }

    const activeMissions = userMissions.get(userId);
    if (!activeMissions) return;

    let profileNeedsUpdate = false;
    const allMissions = [...activeMissions.daily, activeMissions.weekly].filter(Boolean);

    for (const missionProgress of allMissions) {
        if (missionProgress.completed) continue;

        const missionDetails = missionPool.find(m => m.id === missionProgress.id);

        if (missionDetails && missionDetails.type === missionType) {
            missionProgress.progress += amount;
            profileNeedsUpdate = true; // Progress changed

            if (missionProgress.progress >= missionDetails.goal) {
                missionProgress.completed = true;

                const stats = userStats.get(userId);
                if (stats?.autoCollectMissions && missionDetails.category === 'daily') {
                    await collectReward(user, missionProgress, data, null, 'daily');
                }
                
                await updateMissionMessage(user, missionProgress, data);
            } else {
                await updateMissionMessage(user, missionProgress, data);
            }
        }
    }
    
    if (profileNeedsUpdate) {
        await updateProfileImage(user, data);
        await checkMilestoneCompletion(user, data);
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
        if (!profileInfo || !missionProgress.messageId) return;
        
        const profileChannel = await client.channels.fetch(profileInfo.channelId);
        
        const threadName = missionDetails.category === 'daily' 
            ? t('daily_missions_thread_title')
            : t('weekly_mission_thread_title');

        const missionThread = profileChannel.threads.cache.find(th => th.name === threadName);
        if (!missionThread) return;

        const missionMessage = await missionThread.messages.fetch(missionProgress.messageId).catch(() => null);
        if (!missionMessage) return;

        let rewardText;
        if(missionDetails.reward.item) {
            rewardText = `Item: ${t(`item_${missionDetails.reward.item}_name`)}`;
        } else {
            rewardText = `${missionDetails.reward.xp} XP & ${missionDetails.reward.coins} TC`;
        }
        
        const newEmbed = EmbedBuilder.from(missionMessage.embeds[0])
            .setFields({ name: t('progress'), value: `${missionProgress.progress} / ${missionDetails.goal}`, inline: true}, { name: t('reward'), value: rewardText, inline: true});
        
        let newComponents = [];
        if (missionDetails.category === 'weekly') {
            const newButton = ButtonBuilder.from(missionMessage.components[0].components[0]);
            const isComplete = missionProgress.progress >= missionDetails.goal;
            newButton.setDisabled(!isComplete || missionProgress.collected);
            if (missionProgress.collected) {
                newButton.setLabel(t('missions_collected_button')).setStyle(ButtonStyle.Secondary);
            }
            const newRow = new ActionRowBuilder().addComponents(newButton);
            newComponents.push(newRow);
        }

        await missionMessage.edit({ embeds: [newEmbed], components: newComponents });

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
