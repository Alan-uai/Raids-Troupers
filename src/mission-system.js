import { missions as missionPool } from './missions.js';
import { generateProfileImage } from './profile-generator.js';
import { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getTranslator } from './i18n.js';
import { allItems } from './items.js';
import { checkMilestoneCompletion } from './milestones.js';

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
    
    if (newMission.category === 'weekly') {
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
    const dailyMissions = missionPool.filter(m => m.category === 'daily');
    const weeklyMissions = missionPool.filter(m => m.category === 'weekly');
    
    const missionsToAssign = {
        daily: [],
        weekly: null
    };

    const shuffledDailies = [...dailyMissions].sort(() => 0.5 - Math.random());
    for(let i = 0; i < 3; i++) {
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

    if (weeklyMissions.length > 0) {
        const weeklyTemplate = weeklyMissions[Math.floor(Math.random() * weeklyMissions.length)];
        const intelligentWeekly = generateIntelligentMission(weeklyTemplate, stats);
        missionsToAssign.weekly = {
            id: intelligentWeekly.id,
            progress: 0,
            completed: false,
            collected: false,
            goal: intelligentWeekly.goal,
            reward: intelligentWeekly.reward
        };
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
        const items = userItems.get(userId) || { inventory: [], equippedBackground: 'default', equippedTitle: 'default', equippedBorder: null };
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

    const missionsToCollect = [...activeMissions.daily, activeMissions.weekly].filter(m => m && m.completed && !m.collected);
    
    if (missionsToCollect.length === 0) {
        await interaction.followUp({ content: t('missions_collect_all_none'), ephemeral: true });
        return;
    }

    let totalXp = 0;
    let totalCoins = 0;
    let messages = [];

    for (const missionProgress of missionsToCollect) {
        const result = await collectReward(interaction.user, missionProgress, data);
        totalXp += result.xp;
        totalCoins += result.coins;
        messages.push(result.message)
    }
    
    await updateProfileImage(interaction.user, data);
    await postMissionList(interaction.message.thread, userId, 'daily', data); // Refresh the view
    
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
    const allMissions = [...activeMissions.daily, activeMissions.weekly].filter(Boolean);

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


export async function postMissionList(thread, userId, type, data, interaction = null) {
    const { userMissions, userStats, client } = data;
    const t = await getTranslator(userId, userStats);
    
    if (interaction) await interaction.deferUpdate();
    
    const messages = await thread.messages.fetch({ limit: 50 });
    await Promise.all(messages.map(msg => msg.delete().catch(()=>{})));

    const activeMissions = userMissions.get(userId);
    const missionsToShow = (type === 'daily' ? activeMissions.daily : [activeMissions.weekly]).filter(Boolean);
    const stats = userStats.get(userId);
    
    const controlRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`mission_view_${userId}_daily`).setLabel(t('missions_view_daily_button')).setStyle(type === 'daily' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`mission_view_${userId}_weekly`).setLabel(t('missions_view_weekly_button')).setStyle(type === 'weekly' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`mission_collectall_${userId}`).setLabel(t('missions_collect_all_button')).setStyle(ButtonStyle.Success).setEmoji('🎉')
        );
    
    const autoCollectStatus = stats?.autoCollectMissions ? t('missions_autocollect_status_on') : t('missions_autocollect_status_off');
    const autoCollectRow = new ActionRowBuilder()
        .addComponents(
             new ButtonBuilder().setCustomId(`mission_autocollect_${userId}`).setLabel(`${t('missions_autocollect_button')} (${autoCollectStatus})`).setStyle(ButtonStyle.Secondary)
        );

    await thread.send({ content: t('missions_autocollect_description'), components: [controlRow, autoCollectRow] });
    
    if (missionsToShow.length === 0) {
        await thread.send({ content: t('missions_no_missions_of_type', { type }) });
        return;
    }

    for (const missionProgress of missionsToShow) {
        const missionDetails = missionPool.find(m => m.id === missionProgress.id);
        const reward = missionProgress.reward || missionDetails.reward;

        let rewardText;
        if(reward.item) {
            const itemDetails = allItems.find(i => i.id === reward.item);
            rewardText = itemDetails ? `Item: ${t(`item_${itemDetails.id}_name`)}` : 'Item Secreto';
        } else {
            rewardText = `${reward.xp} XP & ${reward.coins} TC`;
        }

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

        await thread.send({ embeds: [embed] });
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
