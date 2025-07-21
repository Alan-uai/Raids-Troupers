// src/milestones.js
import { EmbedBuilder } from 'discord.js';
import { getTranslator } from './i18n.js';

export const milestones = [
    { id: 'raids_helped', type: 'RAID_HELPED', goal: 50, stat: 'raidsHelped' },
    { id: 'raids_created', type: 'RAID_CREATED', goal: 25, stat: 'raidsCreated' },
    { id: 'positive_ratings', type: 'RATE_PLAYER', goal: 100, stat: 'reputation' },
    { id: 'coins_earned', type: 'EARN_COINS', goal: 10000, stat: 'coins' },
    { id: 'level_reached', type: 'LEVEL_UP', goal: 50, stat: 'level' },
    { id: 'items_owned', type: 'ITEM_ACQUIRED', goal: 20, stat: 'inventory.length' },
    { id: 'members_kicked', type: 'KICK_MEMBER', goal: 10, stat: 'kickedOthers' },
    { id: 'clans_joined', type: 'JOIN_CLAN', goal: 3, stat: 'clansJoined' }, // requires new stat
    { id: 'clan_leader', type: 'CREATE_CLAN', goal: 1, stat: 'clanCreated' }, // requires new stat
    { id: 'auctions_won', type: 'AUCTION_WON', goal: 5, stat: 'auctionsWon' } // requires new stat
];

function getStatValue(stats, itemStats, statPath) {
    if (statPath.startsWith('inventory')) {
        return itemStats?.inventory?.length || 0;
    }
    const path = statPath.split('.');
    let current = stats;
    for (let i = 0; i < path.length; i++) {
        if (current === undefined) return 0;
        current = current[path[i]];
    }
    return current || 0;
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

    const messages = await milestoneThread.messages.fetch({ limit: 100 });

    for (const milestone of milestones) {
        const currentProgress = getStatValue(stats, itemStats, milestone.stat);
        
        const messageToUpdate = messages.find(m => m.embeds[0]?.title === t(`milestone_${milestone.id}_title`));
        if (messageToUpdate) {
            const newEmbed = new EmbedBuilder()
                .setTitle(t(`milestone_${milestone.id}_title`))
                .setDescription(t(`milestone_${milestone.id}_description`))
                .setColor(currentProgress >= milestone.goal ? '#2ECC71' : '#F1C40F')
                .setFields({ name: t('progress'), value: `${currentProgress} / ${milestone.goal}`});
            
            await messageToUpdate.edit({ embeds: [newEmbed] });
        }
        
        if (currentProgress >= milestone.goal && !stats.completedMilestones[milestone.id]) {
            stats.completedMilestones[milestone.id] = true;
            await milestoneThread.send({ content: t('milestone_completed_notification', { username: user.username, milestoneName: t(`milestone_${milestone.id}_title`) }) });
        }
    }
    userStats.set(userId, stats);
}
