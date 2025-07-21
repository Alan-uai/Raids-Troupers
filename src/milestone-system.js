// src/milestone-system.js
import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getTranslator } from './i18n.js';
import { milestones } from './milestones.js';
import { allItems, rarities } from './items.js';

function getStatValue(stats, itemStats, statPath) {
    if (!stats && !itemStats) return 0;
    
    // Handle special stat paths like for rarity_collector
    if (typeof statPath === 'object' && statPath.name === 'rarityCollector') {
        const inventory = itemStats?.inventory || [];
        if (inventory.length === 0) return 0;

        const targetRarity = statPath.rarity;
        
        const count = inventory.filter(itemId => {
            const itemDetails = allItems.find(i => i.id === itemId);
            return itemDetails && itemDetails.rarity === targetRarity;
        }).length;
        
        return count;
    }
    
    if (typeof statPath === 'object' && statPath.name === 'versatilityMaster') {
        if (!stats.classLevels) return 0;
        const requiredLevel = statPath.level;
        let masteredClasses = 0;
        for (const classId in stats.classLevels) {
            if(stats.classLevels[classId] >= requiredLevel) {
                masteredClasses++;
            }
        }
        return masteredClasses;
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

function getCompletedTiers(milestone, stats, itemStats) {
    let completedCount = 0;
    
    // Special handling for rarity collector
    if (milestone.id === 'rarity_collector') {
        for (const tier of milestone.tiers) {
            const tierStatPath = { name: 'rarityCollector', rarity: tier.rarity };
            const currentProgress = getStatValue(stats, itemStats, tierStatPath);
            if (currentProgress >= tier.goal) {
                completedCount++;
            } else {
                break; 
            }
        }
        return completedCount;
    }

    // Default handling for other milestones
    const currentProgress = getStatValue(stats, itemStats, milestone.stat);
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
    if (milestone.type === 'PLACEHOLDER') return null;
    
    const userId = stats.userId || 'user';
    
    const embed = new EmbedBuilder()
        .setTitle(t(`milestone_${milestone.id}_title`))
        .setColor('#F1C40F');

    const selectOptions = milestone.tiers.map(tier => {
        let goalText = tier.goal;
        if (milestone.id === 'rarity_collector') goalText = `1 item ${tier.rarity}`;
        if (milestone.id === 'versatility_master') goalText = `${tier.goal} classes no Nv. ${tier.level}`;

        return {
            label: `${t(`milestone_${milestone.id}_title`)} - Nível ${tier.level}`,
            value: String(tier.level),
            description: `Meta: ${goalText}`
        };
    });

    if (milestone.secret_tier) {
         let secretGoalText = milestone.secret_tier.goal;
         if (milestone.id === 'rarity_collector') secretGoalText = `${milestone.secret_tier.goal} item Kardec`;
         if (milestone.id === 'loyal_member') secretGoalText = `${milestone.secret_tier.goal} dias`;
         if (milestone.id === 'versatility_master') secretGoalText = `${milestone.secret_tier.goal} classes no Nv. ${milestone.secret_tier.level}`;
        
         selectOptions.push({
            label: `${t(`milestone_${milestone.id}_title`)} - Nível Secreto`,
            value: 'secret',
            description: `Meta: ${secretGoalText}`
        });
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`milestone_select_${milestone.id}_${userId}`)
        .setPlaceholder(t('milestone_select_level'))
        .addOptions(selectOptions);
    
    const row = new ActionRowBuilder();

    if (view === 'general') {
        const completedTiersCount = getCompletedTiers(milestone, stats, itemStats);
        let description = t(`milestone_${milestone.id}_description`) + '\n\n**Progresso Geral:**\n';
        const tierSymbols = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
        let tierLine = '';
        for (let i = 0; i < tierSymbols.length; i++) {
            if (i < completedTiersCount) {
                tierLine += `${tierSymbols[i]} `;
            } else {
                tierLine += `~~${tierSymbols[i]}~~ `;
            }
        }
        embed.setDescription(description + tierLine);
        row.addComponents(selectMenu);
    } else {
        const isSecretView = view === 'secret';
        const tier = isSecretView ? milestone.secret_tier : milestone.tiers.find(t => t.level === parseInt(view, 10));

        if (tier) {
            embed.setDescription(t(`milestone_${milestone.id}_description`));
            
            let statPath = milestone.stat;
            let goalText = tier.goal;
            if (milestone.id === 'rarity_collector') {
                 statPath = { name: 'rarityCollector', rarity: isSecretView ? rarities.KARDEC : tier.rarity };
                 goalText = isSecretView ? `(1 item Kardec)` : `(1 item de raridade ${tier.rarity})`;
            }
             if (milestone.id === 'versatility_master') {
                statPath = { name: 'versatilityMaster', level: tier.level };
                goalText = `(${tier.goal} classes no Nv. ${tier.level})`;
            }

            const currentProgress = getStatValue(stats, itemStats, statPath);
            
            embed.addFields({ name: `Nível ${tier.level || 'Secreto'}`, value: t('milestone_current_progress', { progress: currentProgress, goal: goalText }) });
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
        if (milestone.type === 'PLACEHOLDER' || milestone.id === 'secret_mastery') continue;

        let newlyCompletedTier = null;
        let statPathForCompletionCheck = milestone.stat;

        // Custom logic for complex milestones
        if (milestone.id === 'rarity_collector') {
            for (const tier of milestone.tiers) {
                const lastKnownProgressForTier = stats.completedMilestones[milestone.id]?.[`tier_${tier.level}_progress`] || 0;
                const currentProgress = getStatValue(stats, itemStats, { name: 'rarityCollector', rarity: tier.rarity });
                if (currentProgress >= tier.goal && lastKnownProgressForTier < tier.goal) {
                    newlyCompletedTier = tier;
                }
            }
        } else if (milestone.id === 'versatility_master') {
             for (const tier of milestone.tiers) {
                const lastKnownProgressForTier = stats.completedMilestones[milestone.id]?.[`tier_${tier.level}_progress`] || 0;
                const currentProgress = getStatValue(stats, itemStats, { name: 'versatilityMaster', level: tier.level });
                if (currentProgress >= tier.goal && lastKnownProgressForTier < tier.goal) {
                    newlyCompletedTier = tier;
                }
            }
        } else {
            const currentProgress = getStatValue(stats, itemStats, milestone.stat);
            for (const tier of milestone.tiers) {
                const lastKnownProgressForTier = stats.completedMilestones[milestone.id]?.[`tier_${tier.level}_progress`] || 0;
                if (currentProgress >= tier.goal && lastKnownProgressForTier < tier.goal) {
                    newlyCompletedTier = tier; 
                }
            }
        }
        
        if (getCompletedTiers(milestone, stats, itemStats) < milestone.tiers.length) {
            allMilestonesCompleted = false;
        }

        if (newlyCompletedTier) {
            await milestoneThread.send({ content: t('milestone_completed_notification', { username: user.username, milestoneName: `${t(`milestone_${milestone.id}_title`)} Nível ${newlyCompletedTier.level}` }) });
            stats.completedMilestones[milestone.id] = { ...stats.completedMilestones[milestone.id], [`tier_${newlyCompletedTier.level}_progress`]: getStatValue(stats, itemStats, statPathForCompletionCheck) };
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
    if (allMilestonesCompleted && secretMilestone) {
        if (!stats.completedMilestones[secretMilestone.id]?.messageId) {
            stats.userId = userId;
            const secretMilestoneData = await createMilestoneEmbed(secretMilestone, stats, itemStats, 'general', t);
            if(secretMilestoneData) {
                const message = await milestoneThread.send({ embeds: [secretMilestoneData.embed], components: [secretMilestoneData.row] });
                stats.completedMilestones[secretMilestone.id] = { ...stats.completedMilestones[secretMilestone.id], messageId: message.id };
            }
        }
        
        const secretProgress = getStatValue(stats, itemStats, {name: 'rarityCollector', rarity: rarities.KARDEC});
        let newlyCompletedSecretTier = null;
        if (secretMilestone.secret_tier) {
             const lastKnownProgressForTier = stats.completedMilestones[secretMilestone.id]?.[`tier_secret_progress`] || 0;
             if (secretProgress >= secretMilestone.secret_tier.goal && lastKnownProgressForTier < secretMilestone.secret_tier.goal) {
                newlyCompletedSecretTier = secretMilestone.secret_tier;
             }
        }

        if (newlyCompletedSecretTier) {
             await milestoneThread.send({ content: t('milestone_completed_notification', { username: user.username, milestoneName: `${t(`milestone_${secretMilestone.id}_title`)}` }) });
             stats.completedMilestones[secretMilestone.id] = { ...stats.completedMilestones[secretMilestone.id], [`tier_secret_progress`]: secretProgress };

             const roleName = t(`milestone_${secretMilestone.id}_title`);
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
             }
        }
    }

    userStats.set(userId, stats);
}
