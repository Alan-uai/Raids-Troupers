// src/mission-system.js

import { missions as missionPool } from './missions.js';
import { generateProfileImage } from './profile-generator.js';
import { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getTranslator } from './i18n.js';
import { allItems, rarities } from './items.js';
import { checkMilestoneCompletion as checkMilestone } from './milestone-system.js';

// Mapa para armazenar os IDs das mensagens das listas de missões
const missionMessageIds = new Map(); // userId -> { control: messageId, list: messageId, currentView: 'daily' }

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
    
    if(newMission.goal) newMission.goal = Math.max(1, Math.ceil(newMission.goal * multiplier));
    
    if(newMission.reward.xp) newMission.reward.xp = Math.ceil(newMission.reward.xp * multiplier);
    if(newMission.reward.coins) newMission.reward.coins = Math.ceil(newMission.reward.coins * multiplier);
    
    return newMission;
}


export function assignMissions(userId, userMissions, stats) {
    const missionsToAssign = {
        daily: [],
        weekly: []
    };

    // --- Daily Missions Assignment ---
    const dailyTemplates = [...missionPool.filter(m => m.category === 'daily')].sort(() => 0.5 - Math.random());
    
    // Assign one with 'Mais que Comum' item
    const lessCommonItemPool = allItems.filter(i => i.source === 'mission' && i.rarity === rarities.MAIS_QUE_COMUM);
    if (dailyTemplates.length > 0 && lessCommonItemPool.length > 0) {
        const dailyWithLessCommonItem = generateIntelligentMission(dailyTemplates.pop(), stats);
        dailyWithLessCommonItem.reward = { item: lessCommonItemPool[Math.floor(Math.random() * lessCommonItemPool.length)].id };
        missionsToAssign.daily.push(dailyWithLessCommonItem);
    }
    
    // Assign one with 'Comum' item
    const commonItemPool = allItems.filter(i => i.source === 'mission' && i.rarity === rarities.COMUM);
    if(dailyTemplates.length > 0 && commonItemPool.length > 0) {
        const dailyWithCommonItem = generateIntelligentMission(dailyTemplates.pop(), stats);
        dailyWithCommonItem.reward = { item: commonItemPool[Math.floor(Math.random() * commonItemPool.length)].id };
        missionsToAssign.daily.push(dailyWithCommonItem);
    }

    // Assign 3 more regular daily missions
    while (missionsToAssign.daily.length < 5 && dailyTemplates.length > 0) {
        const intelligentMission = generateIntelligentMission(dailyTemplates.pop(), stats);
        missionsToAssign.daily.push(intelligentMission);
    }
    
    // Finalize daily missions
    missionsToAssign.daily = missionsToAssign.daily.map(mission => ({
        id: mission.id, progress: 0, completed: false, collected: false, goal: mission.goal, reward: mission.reward
    }));

    // --- Weekly Missions Assignment ---
    const weeklyTemplates = [...missionPool.filter(m => m.category === 'weekly')].sort(() => 0.5 - Math.random());
    
    // Define reward pools
    const rarePool = allItems.filter(i => i.source === 'mission' && i.rarity === rarities.RARO);
    const ultraRarePlusPool = allItems.filter(i => i.source === 'mission' && [rarities.ULTRA_RARO, rarities.MAIS_QUE_RARO, rarities.MENOS_QUE_LENDARIO, rarities.LENDARIO].includes(i.rarity));

    // Assign 3 with 'Raro' items
    for (let i = 0; i < 3; i++) {
        if (!weeklyTemplates.length || !rarePool.length) break;
        const intelligentWeekly = generateIntelligentMission(weeklyTemplates.pop(), stats);
        intelligentWeekly.reward = { item: rarePool[Math.floor(Math.random() * rarePool.length)].id };
        missionsToAssign.weekly.push(intelligentWeekly);
    }

    // Assign 2 with 'Ultra Raro+' items
    for (let i = 0; i < 2; i++) {
        if (!weeklyTemplates.length || !ultraRarePlusPool.length) break;
        const intelligentWeekly = generateIntelligentMission(weeklyTemplates.pop(), stats);
        intelligentWeekly.reward = { item: ultraRarePlusPool[Math.floor(Math.random() * ultraRarePlusPool.length)].id };
        missionsToAssign.weekly.push(intelligentWeekly);
    }
     // Fill up to 5 weekly missions if pools were empty
    while (missionsToAssign.weekly.length < 5 && weeklyTemplates.length > 0) {
        const intelligentMission = generateIntelligentMission(weeklyTemplates.pop(), stats);
        missionsToAssign.weekly.push(intelligentMission);
    }
    
    // Finalize weekly missions
     missionsToAssign.weekly = missionsToAssign.weekly.map(mission => ({
        id: mission.id, progress: 0, completed: false, collected: false, goal: mission.goal, reward: mission.reward
    }));

    userMissions.set(userId, missionsToAssign);
    console.log(`Assigned initial intelligent missions to ${userId}`);
}

async function collectReward(user, missionProgress, data) {
    const { userStats, userItems, client } = data;
    const userId = user.id;
    const t = await getTranslator(userId, userStats);

    const missionDetails = missionPool.find(m => m.id === missionProgress.id);
    const reward = missionProgress.reward || missionDetails.reward;
    let rewardMessage = '';

    const stats = userStats.get(userId);
    let coinsEarned = 0;
    
    if (reward.item) {
        const items = userItems.get(userId) || { inventory: [], equippedGear: {}, equippedCosmetics: {} };
        items.inventory.push(reward.item);
        userItems.set(userId, items);
        const itemDetails = allItems.find(i => i.id === reward.item);
        const itemName = t(`item_${itemDetails.id}_name`, { defaultValue: itemDetails.name }); // Added defaultValue
        rewardMessage = t('missions_collect_success_item', { itemName });
        await checkMissionCompletion(user, 'ITEM_ACQUIRED', data);

        if (itemDetails.rarity === 'Kardec') {
            const guild = client.guilds.cache.first();
            let role = guild.roles.cache.find(r => r.name === 'Kardec');
            if (!role) {
                try {
                    role = await guild.roles.create({ name: 'Kardec', color: '#FF0000', hoist: true, reason: 'Kardec rarity item owner.' });
                } catch(e) { console.error("Failed to create Kardec role:", e); }
            }
            if (role) {
                const member = await guild.members.fetch(userId);
                await member.roles.add(role).catch(e => console.error(`Failed to add Kardec role to ${userId}:`, e));
            }
        }
    } else {
        stats.xp += reward.xp || 0;
        stats.coins += reward.coins || 0;
        coinsEarned = reward.coins || 0;
        rewardMessage = t('missions_collect_success', { xp: reward.xp || 0, coins: coinsEarned });
    }

    missionProgress.collected = true;

    let leveledUp = false;
    let previousLevel = stats.level;
    if (stats.xp) {
        let xpToLevelUp = 100 * stats.level;
        while (stats.xp >= xpToLevelUp) {
            stats.level += 1;
            stats.xp -= xpToLevelUp;
            xpToLevelUp = 100 * stats.level;
            leveledUp = true;
        }
    }
    userStats.set(userId, stats);
    
    if (leveledUp) {
       rewardMessage += `
${t('level_up_from_mission', { level: stats.level })}`;
       await checkMissionCompletion(user, 'LEVEL_UP', { ...data, previousLevel: previousLevel }, stats.level);
    }

    if (coinsEarned > 0) {
        await checkMissionCompletion(user, 'EARN_COINS', data, coinsEarned);
    }
    
    return { xp: reward.xp || 0, coins: coinsEarned, message: rewardMessage };
}

export async function collectAllRewards(interaction, userId, data) {
    const t = await getTranslator(userId, data.userStats);
    if (interaction.user.id !== userId) {
        return await interaction.reply({ content: t('not_for_you'), ephemeral: true });
    }
    await interaction.deferUpdate();
    
    const { userMissions } = data;
    const activeMissions = userMissions.get(userId);
    if (!activeMissions) return;

    const missionsToCollect = [...activeMissions.daily, ...activeMissions.weekly].filter(m => m && m.completed && !m.collected);
    
    if (missionsToCollect.length === 0) {
        await interaction.followUp({ content: t('missions_collect_all_none'), ephemeral: true });
        return;
    }

    let totalXp = 0;
    let totalCoins = 0;
    
    for (const missionProgress of missionsToCollect) {
        const result = await collectReward(interaction.user, missionProgress, data);
        totalXp += result.xp;
        totalCoins += result.coins;
    }
    
    await updateProfileImage(interaction.user, data);
    
    const userMissionInfo = missionMessageIds.get(userId);
    const currentView = userMissionInfo ? userMissionInfo.currentView : 'daily';
    await postMissionList(interaction.message.thread, userId, currentView, data);
    
    await interaction.followUp({ content: t('missions_collect_all_success', { xp: totalXp, coins: totalCoins }), ephemeral: true });
}


export async function checkMissionCompletion(user, missionType, data, amount = 1) {
    const { userMissions, userStats } = data;
    const userId = user.id;

    if (!userMissions.has(userId)) {
        assignMissions(userId, userMissions, userStats.get(userId) || {});
    }

    const activeMissions = userMissions.get(userId);
    if (!activeMissions) return;

    let profileNeedsUpdate = false;
    const allMissions = [...activeMissions.daily, ...activeMissions.weekly].filter(Boolean);

    for (const missionProgress of allMissions) {
        if (missionProgress.completed) continue;

        const missionDetails = missionPool.find(m => m.id === missionProgress.id);

        if (missionDetails && missionDetails.type === missionType) {
            missionProgress.progress += amount;
            
            if (missionProgress.progress >= missionProgress.goal) {
                missionProgress.completed = true;
                const stats = userStats.get(userId);
                if (stats?.autoCollectMissions && missionDetails.category === 'daily') {
                    await collectReward(user, missionProgress, data);
                }
                profileNeedsUpdate = true;
            }
        }
    }
    
    if (profileNeedsUpdate) {
        await updateProfileImage(user, data);
        await checkMilestone(user, data);
    }
    
    userMissions.set(userId, activeMissions);
}

// Helper para gerar embeds de uma lista de missões
function generateMissionEmbeds(missions, category, userId, t) {
    if (!missions || missions.length === 0) {
        return [{embed: new EmbedBuilder().setDescription(t('missions_no_missions_of_type', { type: t(category) })), row: null}];
    }
    
    const embeds = [];
    for (const missionProgress of missions) {
        const missionDetails = missionPool.find(m => m.id === missionProgress.id);
        const reward = missionProgress.reward || missionDetails.reward;

        let rewardText;
        if (reward.item) {
            const itemDetails = allItems.find(i => i.id === reward.item);
            rewardText = itemDetails ? `Item: **${t(`item_${itemDetails.id}_name`, { defaultValue: itemDetails.name })}**` : `**${t('unknown_item')}**`;
        } else {
            rewardText = `**${reward.xp || 0}** XP & **${reward.coins || 0}** TC`;
        }
        
        const row = new ActionRowBuilder();
        const collectButton = new ButtonBuilder()
            .setCustomId(`mission_collect_${userId}_${missionProgress.id}_${category}`)
            .setLabel(t('missions_collect_button'))
            .setStyle(ButtonStyle.Success)
            .setDisabled(!missionProgress.completed || missionProgress.collected);
            
        if(missionProgress.collected) {
            collectButton.setLabel(t('missions_collected_button')).setStyle(ButtonStyle.Secondary);
        }
        row.addComponents(collectButton);

        const embed = new EmbedBuilder()
            .setTitle(t(`mission_${missionDetails.id}_title`))
            .setDescription(t(`mission_${missionDetails.id}_description`))
            .setColor(missionProgress.completed ? '#2ECC71' : '#3498DB')
            .addFields(
                { name: t('progress'), value: `${missionProgress.progress} / ${missionProgress.goal}`, inline: true },
                { name: t('reward'), value: rewardText, inline: true }
            );

        if (missionProgress.completed && !missionProgress.collected) {
           embed.setFooter({ text: 'Pronto para coletar!' });
        } else if (missionProgress.collected) {
            embed.setFooter({ text: 'Recompensa coletada.' });
        }
        embeds.push({embed, row});
    }
    return embeds;
}


export async function postMissionList(thread, userId, type, data, interaction = null) {
    const { userMissions, userStats, client } = data;
    const t = await getTranslator(userId, userStats);

    if (interaction) {
        await interaction.deferUpdate();
    }
    
    const activeMissions = userMissions.get(userId);
    const stats = userStats.get(userId);

    if (!activeMissions) {
        console.error(`No missions found for user ${userId} to post list.`);
        return;
    }
    
    // Clear existing messages from the bot in the thread
    const messages = await thread.messages.fetch({ limit: 50 }).catch(() => []);
    const botMessages = messages.filter(m => m.author.id === client.user.id);
    if(botMessages.size > 0) {
       await thread.bulkDelete(botMessages).catch(e => console.error("Failed to bulk delete messages:", e));
    }
    missionMessageIds.set(userId, { ...(missionMessageIds.get(userId) || {}), currentView: type });

    // Build buttons
    const viewButton = new ButtonBuilder()
        .setCustomId(`mission_view_${userId}_${type === 'daily' ? 'weekly' : 'daily'}`)
        .setLabel(type === 'daily' ? t('missions_view_weekly_button') : t('missions_view_daily_button'))
        .setStyle(ButtonStyle.Primary);
    
    const collectAllButton = new ButtonBuilder()
        .setCustomId(`mission_collectall_${userId}`)
        .setLabel(t('missions_collect_all_button'))
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎉');
        
    const autoCollectStatus = stats?.autoCollectMissions ? t('missions_autocollect_status_on') : t('missions_autocollect_status_off');
    const autoCollectButton = new ButtonBuilder()
        .setCustomId(`mission_autocollect_${userId}`)
        .setLabel(`${t('missions_autocollect_button')}`)
        .setStyle(ButtonStyle.Secondary);
        
    const controlRow = new ActionRowBuilder().addComponents(viewButton, collectAllButton, autoCollectButton);
    await thread.send({ content: t('missions_autocollect_description') + `
**Status:** ${autoCollectStatus}`, components: [controlRow] });

    // Get embeds for the current view
    const missionsToShow = (type === 'daily' ? activeMissions.daily : activeMissions.weekly).filter(m => m && !m.collected);
    const missionEmbeds = generateMissionEmbeds(missionsToShow, type, userId, t);

    for (const {embed, row} of missionEmbeds) {
        if(row){
             await thread.send({ embeds: [embed], components: [row] });
        } else {
             await thread.send({ embeds: [embed] });
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function animateLine(channel, show = true) {
    const chars = ['┄', '─', '━'];
    const width = 25; // How wide the line should be
    let lineMessage = null;

    if (show) {
        // Expand animation
        for (let i = 0; i <= Math.ceil(width / 2); i++) {
            let line = '';
            for (let j = 0; j < width; j++) {
                const dist = Math.abs(j - Math.floor(width / 2));
                if (dist <= i) {
                    const charIndex = Math.min(chars.length - 1, Math.floor(dist / (width / 8)));
                    line += chars[charIndex];
                } else {
                    line += ' ';
                }
            }
            if (!lineMessage) {
                lineMessage = await channel.send(`${line}`);
            } else {
                await lineMessage.edit(`${line}`).catch(()=>{});
            }
            await sleep(50);
        }
        return lineMessage;
    } else {
        // Contract animation
        lineMessage = channel; // Here channel is actually the message object
        for (let i = Math.ceil(width / 2); i >= 0; i--) {
             let line = '';
            for (let j = 0; j < width; j++) {
                const dist = Math.abs(j - Math.floor(width / 2));
                if (dist <= i) {
                     const charIndex = Math.min(chars.length - 1, Math.floor(dist / (width / 8)));
                     line += chars[charIndex];
                } else {
                    line += ' ';
                }
            }
            await lineMessage.edit(`${line}`).catch(()=>{});
            await sleep(50);
        }
        await lineMessage.delete().catch(()=>{});
    }
}


export async function animateAndCollectReward(interaction, userId, missionId, missionCategory, data) {
    const { userMissions, userStats } = data;
    const t = await getTranslator(userId, userStats);

    await interaction.deferUpdate();

    const activeMissions = userMissions.get(userId);
    if (!activeMissions || !activeMissions[missionCategory]) {
         console.error(`Mission category '${missionCategory}' not found for user ${userId}.`);
         await interaction.followUp({ content: t('mission_reward_collect_error_ephemeral'), ephemeral: true });
         return null;
    }
    const missionsList = activeMissions[missionCategory];
    const missionProgress = missionsList.find(m => m.id === missionId);

    if (!missionProgress || !missionProgress.completed || missionProgress.collected) {
        await interaction.followUp({ content: t('mission_reward_collect_error_ephemeral'), ephemeral: true });
        return null;
    }
    
    const missionMessage = interaction.message;
    const originalEmbed = EmbedBuilder.from(missionMessage.embeds[0]);

    // Phase 1: Strikethrough Animation
    const fieldsToAnimate = ['title', 'description'];
    const maxLen = Math.max(...fieldsToAnimate.map(f => originalEmbed.data[f]?.length || 0));

    for (let i = 1; i <= maxLen; i++) {
        const tempEmbed = EmbedBuilder.from(originalEmbed);
        tempEmbed.setColor('#FF0000'); // Change to red during animation
        
        let title = originalEmbed.data.title || '';
        let desc = originalEmbed.data.description || '';

        const strike = (text, len) => '~~' + text.substring(0, Math.min(len, text.length)) + '~~' + text.substring(Math.min(len, text.length));

        if (title) tempEmbed.setTitle(strike(title, i));
        if (desc) tempEmbed.setDescription(strike(desc, i));
        
        await missionMessage.edit({ embeds: [tempEmbed], components: [] }).catch(e => console.error("Error during message edit animation:", e));
        await sleep(25); // animation speed
    }

    // Phase 2: Collect Reward and show line animation
    const result = await collectReward(interaction.user, missionProgress, data);
    
    const lineMessage = await animateLine(interaction.channel, true);
    
    const rewardEmbed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setDescription(result.message);
        
    const rewardDisplayMessage = await interaction.channel.send({ embeds: [rewardEmbed] });

    await sleep(3500); // wait 3.5 seconds to read the reward

    // Cleanup
    await rewardDisplayMessage.delete().catch(e => console.error("Error deleting reward message:", e));
    await animateLine(lineMessage, false); 
    await missionMessage.delete().catch(e => console.error("Error deleting mission message:", e));

    await updateProfileImage(interaction.user, data);

    return { message: t('mission_reward_collected_ephemeral', { missionName: originalEmbed.data.title }) };
}


async function updateProfileImage(user, data) {
    const { client, userProfiles, userStats, userItems, clans, userMissions } = data;
    const userId = user.id;
    const profileInfo = userProfiles.get(userId);
     if (profileInfo) {
        try {
            const profileChannel = await client.channels.fetch(profileInfo.channelId);
            const t = await getTranslator(userId, userStats);
            const profileMessage = await profileChannel.messages.fetch(profileInfo.messageId);
            const member = await profileChannel.guild.members.fetch(userId);
            const items = userItems.get(userId) || { inventory: [], equippedGear: {}, equippedCosmetics: {} };
            const stats = userStats.get(userId) || {};
            
            const newProfileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
            const newAttachment = new AttachmentBuilder(newProfileImageBuffer, { name: 'profile-card.png' });
            
            await profileMessage.edit({ files: [newAttachment] });

            // Also update the mission list
            const missionThread = profileChannel.threads.cache.find(th => th.name === t('missions_thread_title'));
            if(missionThread) {
                const missionInfo = missionMessageIds.get(userId);
                const currentView = missionInfo ? missionInfo.currentView : 'daily';
                await postMissionList(missionThread, userId, currentView, { userMissions, userStats, client });
            }
        } catch (updateError) {
            console.error(`Failed to update profile image for ${userId} after mission update:`, updateError);
        }
    }
}
