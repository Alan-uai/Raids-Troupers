
import { missions as missionPool } from './missions.js';
import { generateProfileImage } from './profile-generator.js';
import { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getTranslator } from './i18n.js';
import { allItems } from './items.js';
import { checkMilestoneCompletion } from './milestone-system.js';

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
    
    // Assegura que missões semanais tenham recompensas de item
    if (newMission.category === 'weekly' && !newMission.reward.item) {
        const itemRewardPool = allItems.filter(i => i.source === 'mission' && ['INCOMUM', 'RARO', 'MAIS_QUE_RARO', 'MENOS_QUE_LENDARIO'].includes(i.rarity));
        if(itemRewardPool.length > 0) {
            newMission.reward.item = itemRewardPool[Math.floor(Math.random() * itemRewardPool.length)].id;
        } else {
             newMission.reward.coins = (newMission.reward.coins || 0) + 100;
             newMission.reward.xp = (newMission.reward.xp || 0) + 50;
        }
    }
    
    return newMission;
}


export function assignMissions(userId, userMissions, stats) {
    const dailyMissionTemplates = missionPool.filter(m => m.category === 'daily');
    const weeklyMissionTemplates = missionPool.filter(m => m.category === 'weekly');
    
    const missionsToAssign = {
        daily: [],
        weekly: []
    };

    const shuffledDailies = [...dailyMissionTemplates].sort(() => 0.5 - Math.random());
    for(let i = 0; i < 3; i++) { // Assign 3 daily missions
        if (!shuffledDailies[i]) continue;
        const intelligentMission = generateIntelligentMission(shuffledDailies[i], stats);
        missionsToAssign.daily.push({
            id: intelligentMission.id,
            progress: 0,
            completed: false,
            collected: false,
            goal: intelligentMission.goal,
            reward: intelligentMission.reward
        });
    }

    const shuffledWeeklies = [...weeklyMissionTemplates].sort(() => 0.5 - Math.random());
    for(let i = 0; i < 1; i++) { // Assign 1 weekly mission
        if (!shuffledWeeklies[i]) continue;
        const intelligentWeekly = generateIntelligentMission(shuffledWeeklies[i], stats);
        missionsToAssign.weekly.push({
            id: intelligentWeekly.id,
            progress: 0,
            completed: false,
            collected: false,
            goal: intelligentWeekly.goal,
            reward: intelligentWeekly.reward
        });
    }
    
    userMissions.set(userId, missionsToAssign);
    console.log(`Assigned initial intelligent missions to ${userId}`);
}

async function collectReward(user, missionProgress, data) {
    const { userStats, userItems } = data;
    const userId = user.id;
    const t = await getTranslator(userId, userStats);

    const missionDetails = missionPool.find(m => m.id === missionProgress.id);
    const reward = missionProgress.reward || missionDetails.reward;
    let rewardMessage = '';

    const stats = userStats.get(userId);
    if (reward.item) {
        const items = userItems.get(userId) || { inventory: [], equippedGear: {}, equippedCosmetics: {} };
        items.inventory.push(reward.item);
        userItems.set(userId, items);
        const itemDetails = allItems.find(i => i.id === reward.item);
        const itemName = t(`item_${itemDetails.id}_name`);
        rewardMessage = t('missions_collect_success_item', { itemName });

        if (itemDetails.rarity === 'Kardec') {
            const guild = data.client.guilds.cache.first();
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
        rewardMessage = t('missions_collect_success', { xp: reward.xp || 0, coins: reward.coins || 0 });
    }

    missionProgress.collected = true;

    let leveledUp = false;
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
       rewardMessage += `\n${t('level_up_from_mission', { level: stats.level })}`;
    }
    
    return { xp: reward.xp || 0, coins: reward.coins || 0, message: rewardMessage };
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
    const { userMissions, userStats, client, userProfiles, userItems, clans } = data;
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
        await checkMilestoneCompletion(user, data);
    }
    
    userMissions.set(userId, activeMissions);
}

// Helper para gerar embeds de uma lista de missões
function generateMissionEmbeds(missions, category, userId, t) {
    if (!missions || missions.length === 0) {
        return [{embed: new EmbedBuilder().setDescription(t('missions_no_missions_of_type', { type: category })), row: null}];
    }
    
    const embeds = [];
    for (const missionProgress of missions) {
        const missionDetails = missionPool.find(m => m.id === missionProgress.id);
        const reward = missionProgress.reward || missionDetails.reward;

        let rewardText;
        if (reward.item) {
            const itemDetails = allItems.find(i => i.id === reward.item);
            rewardText = itemDetails ? `Item: **${t(`item_${itemDetails.id}_name`)}**` : '**Item Secreto**';
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
    const { userMissions, userStats } = data;
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
    const messages = await thread.messages.fetch({ limit: 50 });
    const botMessages = messages.filter(m => m.author.id === data.client.user.id);
    if(botMessages.size > 0) {
       await thread.bulkDelete(botMessages).catch(e => console.error("Failed to bulk delete messages:", e));
    }

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
    await thread.send({ content: t('missions_autocollect_description') + `\n**Status:** ${autoCollectStatus}`, components: [controlRow] });

    // Get embeds for the current view
    const missionsToShow = (type === 'daily' ? activeMissions.daily : activeMissions.weekly).filter(Boolean);
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
                lineMessage = await channel.send(`\`${line}\``);
            } else {
                await lineMessage.edit(`\`${line}\``).catch(()=>{});
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
            await lineMessage.edit(`\`${line}\``).catch(()=>{});
            await sleep(50);
        }
        await lineMessage.delete().catch(()=>{});
    }
}


export async function animateAndCollectReward(interaction, userId, missionId, missionCategory, data) {
    const { userMissions, userStats, client } = data;
    const t = await getTranslator(userId, userStats);

    await interaction.deferUpdate();

    const activeMissions = userMissions.get(userId);
    const missionsList = activeMissions[missionCategory];
    const missionProgress = missionsList.find(m => m.id === missionId);

    if (!missionProgress || !missionProgress.completed || missionProgress.collected) {
        return interaction.followUp({ content: t('mission_reward_collect_error_ephemeral'), ephemeral: true });
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
        
        await missionMessage.edit({ embeds: [tempEmbed], components: [] }).catch(()=>{});
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
    await rewardDisplayMessage.delete().catch(()=>{});
    await animateLine(lineMessage, false); 
    await missionMessage.delete().catch(()=>{});

    await updateProfileImage(interaction.user, data);

    await interaction.followUp({ content: t('mission_reward_collected_ephemeral', { missionName: originalEmbed.data.title }), ephemeral: true });
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
            const items = userItems.get(userId) || { inventory: [], equippedGear: {}, equippedCosmetics: {} };
            const stats = userStats.get(userId) || {};
            
            const newProfileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
            const newAttachment = new AttachmentBuilder(newProfileImageBuffer, { name: 'profile-card.png' });
            
            await profileMessage.edit({ files: [newAttachment] });
        } catch (updateError) {
            console.error(`Failed to update profile image for ${userId} after mission update:`, updateError);
        }
    }
}
