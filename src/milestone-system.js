
// src/milestone-system.js
import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getTranslator } from './i18n.js';
import { milestones } from './milestones.js';
import { allItems } from './items.js';

function getStatValue(stats, itemStats, statPath) {
    if (!stats) return 0;
    
    // Handle special stat paths like for rarity_collector
    if (typeof statPath === 'object' && statPath.name === 'rarityCollector') {
        const inventory = itemStats?.inventory || [];
        if (inventory.length === 0) return 0;

        const rarityCounts = {};
        statPath.rarities.forEach(r => { rarityCounts[r] = 0; });

        inventory.forEach(itemId => {
            const itemDetails = allItems.find(i => i.id === itemId);
            if (itemDetails && statPath.rarities.includes(itemDetails.rarity)) {
                rarityCounts[itemDetails.rarity]++;
            }
        });

        // For the main tiers, find the minimum count across all rarities
        if(statPath.rarities.length > 1) {
            return Math.min(...Object.values(rarityCounts));
        }
        // For the secret tier, just return the count of the single specified rarity (Kardec)
        return Object.values(rarityCounts)[0] || 0;
    }

    // Handle simple stat paths
    if (statPath.startsWith('inventory')) {
        return itemStats?.inventory?.length || 0;
    }
    const path = statPath.split('.');
    let current = stats;
    for (let i = 0; i < path.length; i++) {
        if (current === undefined || current === null) return 0;
        current = current[path[i]];
    }
    return current || 0;
}

function getCompletedTiers(milestone, currentProgress) {
    let completedCount = 0;
    for (const tier of milestone.tiers) {
        if (currentProgress >= tier.goal) {
            completedCount++;
        } else {
            break;
        }
    }
    return completedCount;
}

export async function createMilestoneEmbed(milestone, stats, itemStats, view, t) {
    if (milestone.type === 'PLACEHOLDER') return null; // Don't create embeds for placeholders
    
    const userId = stats.userId || 'user'; // Assume stats has userId
    const currentProgress = getStatValue(stats, itemStats, milestone.stat);
    const completedTiersCount = getCompletedTiers(milestone, currentProgress);
    
    const embed = new EmbedBuilder()
        .setTitle(t(`milestone_${milestone.id}_title`))
        .setColor('#F1C40F');

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`milestone_select_${milestone.id}_${userId}`)
        .setPlaceholder(t('milestone_select_level'))
        .addOptions(milestone.tiers.map(tier => ({
            label: `${t(`milestone_${milestone.id}_title`)} - Nível ${tier.level}`,
            value: String(tier.level),
            description: `Meta: ${tier.goal}`
        })));
    
    const row = new ActionRowBuilder();

    if (view === 'general') {
        let description = t(`milestone_${milestone.id}_description`) + '\n\n**Progresso Geral:**\n';
        const tierSymbols = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
        let tierLine = '';
        for (let i = 0; i < tierSymbols.length; i++) {
            if (i < completedTiersCount) {
                tierLine += `${tierSymbols[i]} `; // Completed: White
            } else {
                tierLine += `~~${tierSymbols[i]}~~ `; // Incomplete: Strikethrough (appears greyish)
            }
        }
        embed.setDescription(description + tierLine);
        row.addComponents(selectMenu);
    } else {
        const tierLevel = parseInt(view, 10);
        const tier = milestone.tiers.find(t => t.level === tierLevel);
        if (tier) {
            embed.setDescription(t(`milestone_${milestone.id}_description`));
            embed.addFields({ name: `Nível ${tier.level}`, value: t('milestone_current_progress', { progress: currentProgress, goal: tier.goal }) });
        }
        const backButton = new ButtonBuilder()
            .setCustomId(`milestone_back_${milestone.id}_${userId}`)
            .setLabel(t('milestone_back_button'))
            .setStyle(ButtonStyle.Secondary);
        row.addComponents(selectMenu, backButton);
    }

    return { embed, row };
}

export async function checkMilestoneCompletion(user, data) {
    const { userStats, userItems, userProfiles, client } = data;
    const userId = user.id;
    const stats = userStats.get(userId);
    const itemStats = userItems.get(userId);

    if (!stats) return;
    stats.completedMilestones = stats.completedMilestones || {};

    const profileInfo = userProfiles.get(userId);
    if (!profileInfo) return;

    const t = await getTranslator(userId, userStats);
    const profileChannel = await client.channels.fetch(profileInfo.channelId).catch(() => null);
    if (!profileChannel) return;

    const milestoneThread = profileChannel.threads.cache.find(th => th.name === t('milestones_thread_title'));
    if (!milestoneThread) return;

    const guild = milestoneThread.guild;
    let allMilestonesCompleted = true;

    for (const milestone of milestones) {
        if (milestone.type === 'PLACEHOLDER') continue;
        if (milestone.id === 'secret_mastery') continue;

        const currentProgress = getStatValue(stats, itemStats, milestone.stat);
        
        let newlyCompletedTier = null;
        for (const tier of milestone.tiers) {
            const lastKnownProgressForTier = stats.completedMilestones[milestone.id]?.[`tier_${tier.level}_progress`] || 0;
            if (currentProgress >= tier.goal && lastKnownProgressForTier < tier.goal) {
                newlyCompletedTier = tier; 
            }
        }
        
        if (getCompletedTiers(milestone, currentProgress) < 10) {
            allMilestonesCompleted = false;
        }

        if (newlyCompletedTier) {
            await milestoneThread.send({ content: t('milestone_completed_notification', { username: user.username, milestoneName: `${t(`milestone_${milestone.id}_title`)} Nível ${newlyCompletedTier.level}` }) });
            stats.completedMilestones[milestone.id] = { ...stats.completedMilestones[milestone.id], [`tier_${newlyCompletedTier.level}_progress`]: currentProgress };
        }
        
        const messageId = stats.completedMilestones[milestone.id]?.messageId;
        if(messageId){
            const messageToUpdate = await milestoneThread.messages.fetch(messageId).catch(()=>null);
            if(messageToUpdate){
                 stats.userId = userId;
                 const milestoneData = await createMilestoneEmbed(milestone, stats, itemStats, 'general', t);
                 await messageToUpdate.edit({ embeds: [milestoneData.embed], components: [milestoneData.row] });
            }
        }
    }
    
    // Check for secret milestone
    const secretMilestone = milestones.find(m => m.id === 'secret_mastery');
    if (allMilestonesCompleted) {
        if (!stats.completedMilestones[secretMilestone.id]?.messageId) {
            stats.userId = userId;
            const secretMilestoneData = await createMilestoneEmbed(secretMilestone, stats, itemStats, 'general', t);
            if(secretMilestoneData) {
                const message = await milestoneThread.send({ embeds: [secretMilestoneData.embed], components: [secretMilestoneData.row] });
                stats.completedMilestones[secretMilestone.id] = { ...stats.completedMilestones[secretMilestone.id], messageId: message.id };
            }
        }
        
        // Check for secret milestone tier completion and role assignment
        const secretProgress = getStatValue(stats, itemStats, secretMilestone.stat);
        let newlyCompletedSecretTier = null;
        for (const tier of secretMilestone.tiers) {
            const lastKnownProgressForTier = stats.completedMilestones[secretMilestone.id]?.[`tier_${tier.level}_progress`] || 0;
            if (secretProgress >= tier.goal && lastKnownProgressForTier < tier.goal) {
                newlyCompletedSecretTier = tier;
            }
        }
        
        if (newlyCompletedSecretTier) {
             await milestoneThread.send({ content: t('milestone_completed_notification', { username: user.username, milestoneName: `${t(`milestone_${secretMilestone.id}_title`)} Nível ${newlyCompletedSecretTier.level}` }) });
             stats.completedMilestones[secretMilestone.id] = { ...stats.completedMilestones[secretMilestone.id], [`tier_${newlyCompletedSecretTier.level}_progress`]: secretProgress };

             // --- Role Logic ---
             const roleName = `${t(`milestone_${secretMilestone.id}_title`)} ${newlyCompletedSecretTier.level}`;
             let role = guild.roles.cache.find(r => r.name === roleName);
             if (!role) {
                 try {
                     role = await guild.roles.create({ name: roleName, color: '#FFD700', hoist: true, reason: `Conquista do marco secreto por ${user.tag}`});
                 } catch (e) {
                     console.error(`Failed to create secret milestone role: ${roleName}`, e);
                 }
             }
             if (role) {
                 const member = await guild.members.fetch(userId);
                 await member.roles.add(role);

                 // Remove previous tier role if it exists
                 if (newlyCompletedSecretTier.level > 1) {
                     const prevRoleName = `${t(`milestone_${secretMilestone.id}_title`)} ${newlyCompletedSecretTier.level - 1}`;
                     const prevRole = guild.roles.cache.find(r => r.name === prevRoleName);
                     if (prevRole) {
                         await member.roles.remove(prevRole);
                     }
                 }
             }
        }
    }

    userStats.set(userId, stats);
}
