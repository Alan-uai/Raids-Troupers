import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField,
  AttachmentBuilder,
  REST,
  Routes
} from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { generateProfileImage } from './profile-generator.js';
import { rareItems } from './rare-items.js';
import { assignMissions, checkMissionCompletion } from './mission-system.js';
import { getTranslator } from './i18n.js';

dotenv.config();

// Servidor Express para manter o bot online 24/7
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(port, () => console.log(`HTTP server listening on port ${port}`));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ]
});

// Estruturas de dados em memória
client.commands = new Collection();
const raidStates = new Map();
const userStats = new Map(); 
const userProfiles = new Map();
const userItems = new Map(); 
const activeAuctions = new Map();
const pendingRatings = new Map();
const userMissions = new Map();
const clans = new Map();
const pendingInvites = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commands = [];

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    const commandModule = await import(filePath);
    const command = commandModule.default;
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  } catch(error) {
    console.error(`Error loading command at ${filePath}:`, error);
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  setInterval(checkAuctionEnd, 15000); 
});

client.on(Events.InteractionCreate, async interaction => {
  const t = await getTranslator(interaction.user.id, userStats);

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    if (!userMissions.has(interaction.user.id)) {
        assignMissions(interaction.user.id, userMissions);
    }
    
    try {
      await command.execute(interaction, { userStats, userProfiles, userItems, activeAuctions, userMissions, pendingRatings, clans, pendingInvites, client });
    } catch (error) {
      console.error(error);
      const replyOptions = { content: t('command_error'), ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions).catch(()=>{});
      } else {
        await interaction.reply(replyOptions).catch(()=>{});
      }
    }
  } else if (interaction.isButton()) {
    const [action, subAction, ...args] = interaction.customId.split('_');

    if (action === 'raid') {
        if (subAction === 'controls') {
            const [requesterId, raidId] = args;
            await handleControlsButton(interaction, requesterId, raidId, t);
        } else {
            await handleRaidButton(interaction, subAction, args, t);
        }
    } else if (action === 'auction' && subAction === 'bid') {
        await interaction.reply({ content: t('auction_bid_button_reply'), ephemeral: true });
    } else if (action === 'rate') {
        const [raterId, ratedId] = args;
        await handleRating(interaction, raterId, ratedId, subAction, t);
    }

  } else if (interaction.isStringSelectMenu()) {
      const [action, subAction, ...args] = interaction.customId.split('_');
      if (action === 'raid' && subAction === 'kick') {
          const [requesterId, raidId] = args;
          await handleRaidKick(interaction, requesterId, raidId, t);
      } else if (action === 'rating' && subAction === 'select') {
          const [raterId] = args;
          await handleRatingSelection(interaction, raterId, t);
      }
  }
});


async function checkAuctionEnd() {
    const auction = activeAuctions.get('current_auction');
    if (!auction || new Date() < auction.endTime) return;

    console.log('Finalizing auction...');
    activeAuctions.delete('current_auction'); 

    const auctionChannel = await client.channels.fetch(auction.channelId).catch(() => null);
    if (!auctionChannel) return;

    const auctionMessage = await auctionChannel.messages.fetch(auction.messageId).catch(() => null);
    
    // Use a default translator for public messages
    const t = await getTranslator(null, null, 'pt-BR');

    const finalEmbed = new EmbedBuilder()
        .setColor('#808080')
        .setTitle(`🌟 ${t('auction_ended_title')} 🌟`)
        .setDescription(t('auction_ended_desc', { itemName: t(`item_${auction.item.id}_name`) }));

    const bids = auction.bids;
    if (bids.size === 0) {
        finalEmbed.addFields({ name: t('result'), value: t('auction_no_bids') });
        if(auctionMessage) await auctionMessage.edit({ embeds: [finalEmbed], components: [] });
        return;
    }

    const winnerEntry = [...bids.entries()].sort((a, b) => b[1] - a[1])[0];
    const [winnerId, winningBid] = winnerEntry;
    
    const winnerUser = await client.users.fetch(winnerId);
    const winnerT = await getTranslator(winnerId, userStats);

    const stats = userStats.get(winnerId);
    if(stats){
        stats.coins -= winningBid;
        userStats.set(winnerId, stats);
    }

    const items = userItems.get(winnerId) || { inventory: [], equippedBackground: 'default', equippedTitle: 'default' };
    items.inventory.push(auction.item.id);
    userItems.set(winnerId, items);

    finalEmbed.addFields(
        { name: `🏆 ${t('winner')}`, value: `${winnerUser.username}`, inline: true },
        { name: `💰 ${t('winning_bid')}`, value: `${winningBid} TC`, inline: true }
    );
    finalEmbed.setThumbnail(winnerUser.displayAvatarURL());
    finalEmbed.setFooter({text: t('auction_winner_footer')});
    
    if (auctionMessage) await auctionMessage.edit({ embeds: [finalEmbed], components: [] });

    try {
        await winnerUser.send(winnerT('auction_winner_dm', { itemName: winnerT(`item_${auction.item.id}_name`), bid: winningBid }));
    } catch (e) {
        console.log(`Could not send DM to auction winner ${winnerUser.username}`);
    }
}


async function handleRaidButton(interaction, subAction, args, t) {
    const interactor = interaction.user;
    const [requesterId, raidId] = args;
    const isLeader = interactor.id === requesterId;
    
    const raidChannelId = '1395591154208084049'; // TODO: Substituir pelo ID do canal #annun-raids
    const raidChannel = await client.channels.fetch(raidChannelId);
    const originalRaidMessage = await raidChannel.messages.fetch(raidId).catch(() => null);

    if (!originalRaidMessage) {
        await interaction.reply({ content: t('raid_original_message_not_found'), ephemeral: true });
        return;
    }
    
    await interaction.deferUpdate().catch(console.error);
    const thread = originalRaidMessage.thread;
    const raidEmbed = EmbedBuilder.from(originalRaidMessage.embeds[0]);
    const raidRequester = await client.users.fetch(requesterId);

    if (isLeader && thread && interaction.channelId === thread.id) {
        if (subAction === 'start') {
            await handleRaidStart(interaction, originalRaidMessage, requesterId, raidId, t);
        } else if (subAction === 'kickmenu') {
             const members = await thread.members.fetch();
             const memberOptions = members.filter(m => m.id !== requesterId && client.users.cache.has(m.id) && !client.users.cache.get(m.id).bot)
                .map(member => {
                    const user = client.users.cache.get(member.id);
                    const guildMember = interaction.guild.members.cache.get(member.id);
                    return {
                        label: guildMember?.displayName || user.username,
                        value: member.id,
                        description: t('kick_user_description', { username: guildMember?.displayName || user.username })
                    };
                });
            if (memberOptions.length === 0) return await interaction.followUp({ content: t('kick_no_one_to_kick'), ephemeral: true });
            const selectMenu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`raid_kick_${requesterId}_${raidId}`).setPlaceholder(t('kick_select_placeholder')).addOptions(memberOptions));
            return await interaction.followUp({ content: t('kick_who_to_kick'), components: [selectMenu], ephemeral: true });
        } else if (subAction === 'close') {
            raidStates.delete(raidId);
            const members = await thread.members.fetch();
            const membersToMention = members.filter(m => !client.users.cache.get(m.id)?.bot).map(m => `<@${m.id}>`).join(' ');
            await thread.send(t('raid_closed_by_leader', { members: membersToMention }));
            if (members.size > 1) await thread.send(t('raid_thanks_for_coming'));
            await thread.send(t('raid_closing_thread'));
            await originalRaidMessage.delete().catch(e => console.error("Error deleting original message:", e));
            await thread.delete().catch(e => console.error("Error deleting thread:", e));
        }
    } else if (subAction === 'leave' && thread && interaction.channelId === thread.id) {
        if (isLeader) return await interaction.followUp({ content: t('raid_leader_cannot_leave'), ephemeral: true });
        await thread.send(t('raid_user_left', { username: interactor.username }));
        await thread.members.remove(interactor.id);
        if (raidStates.has(raidId)) raidStates.get(raidId).delete(interactor.id);
        const membersField = raidEmbed.data.fields.find(f => f.name.includes(t('team_members')));
        if (membersField) {
            let [current, max] = membersField.value.match(/\d+/g).map(Number);
            current = Math.max(1, current - 1);
            raidEmbed.setFields({ name: `👥 ${t('team_members')}`, value: `**${current}/${max}**`, inline: true });
            const originalRow = ActionRowBuilder.from(originalRaidMessage.components[0]);
            const joinButton = originalRow.components.find(c => c.data.custom_id?.startsWith('raid_join'));
            if (joinButton) joinButton.setDisabled(false).setLabel(t('join_button'));
            await originalRaidMessage.edit({ embeds: [raidEmbed], components: [originalRow] });
        }
    } else if (subAction === 'join') {
        let currentThread = thread;
        if (!currentThread) {
             raidStates.set(raidId, new Map());
             const requesterMember = await interaction.guild.members.fetch(raidRequester.id).catch(() => null);
             const requesterT = await getTranslator(raidRequester.id, userStats);

             currentThread = await originalRaidMessage.startThread({ name: requesterT('raid_thread_name', { username: requesterMember?.displayName || raidRequester.username }), autoArchiveDuration: 1440 }).catch(e => { console.error("Error creating thread:", e); return null; });
             if (!currentThread) return;

             await currentThread.members.add(raidRequester.id).catch(e => console.error(`Failed to add leader ${raidRequester.id} to thread:`, e));
             const controlsButton = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`raid_controls_${requesterId}_${raidId}`).setLabel(requesterT('my_controls_button')).setStyle(ButtonStyle.Primary).setEmoji('⚙️'));
             const welcomeMessage = await currentThread.send({ content: requesterT('raid_thread_welcome', { userId: raidRequester.id }), components: [controlsButton] });
             await welcomeMessage.pin().catch(e => console.error("Error pinning controls message:", e));
        }
        const members = await currentThread.members.fetch();
        if (members.has(interactor.id)) return await interaction.followUp({ content: t('raid_already_in'), ephemeral: true });

        const membersField = raidEmbed.data.fields.find(f => f.name.includes(t('team_members')));
        let [current, max] = membersField.value.match(/\d+/g).map(Number);

        if (current >= 5) return await interaction.followUp({ content: t('raid_is_full'), ephemeral: true });
        
        await currentThread.members.add(interactor.id).catch(e => console.error(`Failed to add member ${interactor.id} to thread:`, e));
        const interactorT = await getTranslator(interactor.id, userStats);
        await currentThread.send(interactorT('raid_user_joined', { username: interactor.username }));
        current++;

        raidEmbed.setFields({ name: `👥 ${t('team_members')}`, value: `**${current}/${max}**`, inline: true });
        const originalRow = ActionRowBuilder.from(originalRaidMessage.components[0]);
        const joinButton = originalRow.components.find(c => c.data.custom_id?.startsWith('raid_join'));

        if (joinButton) {
            joinButton.setLabel(current >= 5 ? t('full_button') : t('join_button')).setDisabled(current >= 5);
        }
        await originalRaidMessage.edit({ embeds: [raidEmbed], components: [originalRow] });
    }
}


async function handleControlsButton(interaction, requesterId, raidId, t) {
    if (interaction.user.id !== requesterId) {
        // Member controls
        const memberControls = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`raid_leave_${requesterId}_${raidId}`).setLabel(t('leave_raid_button')).setStyle(ButtonStyle.Danger).setEmoji('👋'),
        );
        await interaction.reply({ content: t('member_controls_title'), components: [memberControls], ephemeral: true });
    } else {
        // Leader controls
        const leaderControls = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`raid_start_${requesterId}_${raidId}`).setLabel(t('start_raid_button')).setStyle(ButtonStyle.Success).setEmoji('✅'),
            new ButtonBuilder().setCustomId(`raid_kickmenu_${requesterId}_${raidId}`).setLabel(t('kick_member_button')).setStyle(ButtonStyle.Danger).setEmoji('❌'),
            new ButtonBuilder().setCustomId(`raid_close_${requesterId}_${raidId}`).setLabel(t('close_raid_button')).setStyle(ButtonStyle.Secondary).setEmoji('🔒')
        );
        await interaction.reply({ content: t('leader_controls_title'), components: [leaderControls], ephemeral: true });
    }
}

async function handleVoiceOptIn(interaction, raidId, t) {
    if (!raidId) return interaction.reply({ content: t('vc_raid_data_not_found'), ephemeral: true });

    const raidChannelId = '1395591154208084049'; // TODO: Substituir pelo ID do canal #annun-raids
    const raidChannel = await client.channels.fetch(raidChannelId);
    const originalRaidMessage = await raidChannel.messages.fetch(raidId).catch(() => null);
    if (!originalRaidMessage) return interaction.reply({ content: t('vc_raid_not_active'), ephemeral: true });

    const raidState = raidStates.get(raidId) || new Map();
    const userHasOptedIn = raidState.get(interaction.user.id) || false;
    raidState.set(interaction.user.id, !userHasOptedIn);
    raidStates.set(raidId, raidState);

    const feedbackMessage = !userHasOptedIn ? t('vc_opt_in_enabled') : t('vc_opt_in_disabled');
    await interaction.reply({ content: feedbackMessage, ephemeral: true });
}

async function handleRaidStart(interaction, originalRaidMessage, requesterId, raidId, t) {
    const thread = originalRaidMessage.thread;
    const raidState = raidStates.get(raidId);
    let voiceChannel = null;

    const voiceOptInCount = raidState ? [...raidState.values()].filter(v => v).length : 0;

    if (voiceOptInCount >= 2) {
        const leader = await interaction.guild.members.fetch(requesterId);
        const leaderT = await getTranslator(requesterId, userStats);
        voiceChannel = await interaction.guild.channels.create({
            name: leaderT('raid_voice_channel_name', { username: leader.displayName }),
            type: ChannelType.GuildVoice,
            userLimit: 5,
            parent: interaction.channel.parent,
            permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.Connect] }],
        }).catch(e => console.error("Failed to create voice channel:", e));
    }

    await thread.send(t('raid_started_by_leader'));
    const members = await thread.members.fetch();
    const participants = [];

    for (const member of members.values()) {
        const user = client.users.cache.get(member.id);
        if (!user || user.bot) continue;
        participants.push(user);
        
        const userT = await getTranslator(user.id, userStats);

        if (user.id !== requesterId) {
            const stats = userStats.get(user.id) || { level: 1, xp: 0, coins: 0, class: null, clanId: null, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0, reputation: 0, totalRatings: 0, locale: 'pt-BR' };
            const xpGained = 25, coinsGained = 10;
            const xpToLevelUp = 100 * stats.level;
            
            stats.raidsHelped += 1;
            stats.xp += xpGained;
            stats.coins += coinsGained;

            let leveledUp = false;
            while (stats.xp >= xpToLevelUp) {
                stats.level += 1;
                stats.xp -= xpToLevelUp;
                leveledUp = true;
            }
            if(leveledUp) {
                 try {
                    await user.send({ content: userT('level_up_notification', { level: stats.level }) });
                } catch(e) {
                    await thread.send({ content: userT('level_up_notification', { userId: user.id, level: stats.level }) });
                }
            }
            userStats.set(user.id, stats);
            await checkMissionCompletion(user, 'RAID_HELPED', { userStats, userMissions, client, userProfiles, userItems, clans });
        }

        const guildMember = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (voiceChannel && raidState?.get(user.id) && guildMember?.voice.channelId !== voiceChannel.id) {
            await guildMember.voice.setChannel(voiceChannel).catch(e => console.log(`Failed to move ${guildMember.displayName}: ${e.message}`));
        } else if (voiceChannel && !raidState?.get(user.id)) {
            const joinVCButton = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel(userT('join_voice_chat_button')).setStyle(ButtonStyle.Link).setURL(voiceChannel.url));
            try { await user.send({ content: userT('raid_started_vc_created'), components: [joinVCButton] }); } catch (dmError) { console.log(`Could not DM user ${user.id}`); }
        }
    }
    
    if (participants.length > 1) await startRatingProcess(participants);
    
    const helpers = participants.filter(p => p.id !== requesterId);
    if (helpers.length > 0) {
        const helperMentions = helpers.map(m => `<@${m.id}>`).join(' ');
        await thread.send(t('raid_thanks_to_helpers', { helpers: helperMentions }));
    }

    if (voiceChannel) {
        for (const user of participants) {
           await voiceChannel.permissionOverwrites.edit(user.id, { [PermissionsBitField.Flags.Connect]: true }).catch(() => {});
        }
    }

    await originalRaidMessage.delete().catch(e => console.error("Error deleting original message:", e));
    await thread.setLocked(true).catch(e => console.error("Error locking thread:", e));
    await thread.setArchived(true).catch(e => console.error("Error archiving thread:", e));
    raidStates.delete(raidId);
}

async function handleRaidKick(interaction, requesterId, raidId, t) {
    if (interaction.user.id !== requesterId) {
        return await interaction.reply({ content: t('kick_only_leader'), ephemeral: true });
    }
    const memberToKickId = interaction.values[0];

    const raidChannelId = '1395591154208084049'; // TODO: Substituir pelo ID do canal #annun-raids
    const raidChannel = await client.channels.fetch(raidChannelId);
    const originalRaidMessage = await raidChannel.messages.fetch(raidId).catch(() => null);

    if (!originalRaidMessage || !originalRaidMessage.thread) {
        return await interaction.reply({ content: t('kick_raid_not_found'), ephemeral: true });
    }

    const thread = originalRaidMessage.thread;
    try {
        const kickedUser = await client.users.fetch(memberToKickId);
        await thread.members.remove(memberToKickId);
        
        const kickedMember = await interaction.guild.members.fetch(memberToKickId).catch(() => null);
        const kickedDisplayName = kickedMember?.displayName || kickedUser.username;

        await interaction.update({ content: t('kick_success_leader_msg', { username: kickedDisplayName }), components: [] });
        await thread.send(t('kick_success_thread_msg', { username: kickedDisplayName }));

        try {
            const leaderMember = await interaction.guild.members.fetch(requesterId).catch(() => null);
            const leaderDisplayName = leaderMember?.displayName || interaction.user.username;
            const kickedT = await getTranslator(memberToKickId, userStats);
            await kickedUser.send(kickedT('kick_dm_notification', { leaderName: leaderDisplayName }));
        } catch (dmError) {
            console.error(`Could not DM kicked user ${kickedUser.username}.`);
            thread.send(t('kick_dm_fail', { username: kickedUser.username }));
        }

        if (raidStates.has(raidId)) raidStates.get(raidId).delete(memberToKickId);

        const leaderStats = userStats.get(requesterId);
        if(leaderStats) leaderStats.kickedOthers = (leaderStats.kickedOthers || 0) + 1;

        const kickedStats = userStats.get(memberToKickId);
        if(kickedStats) kickedStats.wasKicked = (kickedStats.wasKicked || 0) + 1;
        
        await checkMissionCompletion(interaction.user, 'KICK_MEMBER', { userStats, userMissions, client, userProfiles, userItems, clans });

        const raidEmbed = EmbedBuilder.from(originalRaidMessage.embeds[0]);
        const membersField = raidEmbed.data.fields.find(f => f.name.includes(t('team_members')));
        if (membersField) {
            let [current, max] = membersField.value.match(/\d+/g).map(Number);
            current = Math.max(1, current - 1);
            raidEmbed.setFields({ name: `👥 ${t('team_members')}`, value: `**${current}/${max}**`, inline: true });
            const originalRow = ActionRowBuilder.from(originalRaidMessage.components[0]);
            const joinButton = originalRow.components.find(c => c.data.custom_id?.startsWith('raid_join'));
            if (joinButton) joinButton.setDisabled(false).setLabel(t('join_button'));
            await originalRaidMessage.edit({ embeds: [raidEmbed], components: [originalRow] });
        }
    } catch(err) {
        console.error("Error kicking member:", err);
        await interaction.followUp({ content: t('kick_error'), ephemeral: true });
    }
}


async function startRatingProcess(participants) {
    for (const rater of participants) {
        const othersToRate = participants.filter(p => p.id !== rater.id);
        if (othersToRate.length === 0) continue;

        pendingRatings.set(rater.id, othersToRate.map(p => p.id));
        const raterT = await getTranslator(rater.id, userStats);

        const selectOptions = othersToRate.map(p => ({
            label: p.username, value: p.id, description: raterT('rate_user_description', { username: p.username })
        }));

        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId(`rating_select_${rater.id}`).setPlaceholder(raterT('rating_select_placeholder')).addOptions(selectOptions)
        );

        try {
            await rater.send({ content: raterT('rating_dm_initial'), components: [selectMenu] });
        } catch (e) {
            console.log(`Could not send rating DM to ${rater.username}`);
        }
    }
}

async function handleRatingSelection(interaction, raterId, t) {
    const ratedId = interaction.values[0];
    const ratedUser = await client.users.fetch(ratedId);

    const ratingButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rate_up_${raterId}_${ratedId}`).setLabel(t('rate_positive')).setStyle(ButtonStyle.Success).setEmoji('👍'),
        new ButtonBuilder().setCustomId(`rate_down_${raterId}_${ratedId}`).setLabel(t('rate_negative')).setStyle(ButtonStyle.Danger).setEmoji('👎')
    );

    await interaction.update({ content: t('rate_how', { username: ratedUser.username }), components: [ratingButtons] });
}

async function handleRating(interaction, raterId, ratedId, type, t) {
    const raterPending = pendingRatings.get(raterId);
    if (!raterPending || !raterPending.includes(ratedId)) {
        return await interaction.update({ content: t('rating_already_rated'), components: [] });
    }

    const stats = userStats.get(ratedId) || { level: 1, xp: 0, coins: 0, class: null, clanId: null, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0, reputation: 0, totalRatings: 0, locale: 'pt-BR' };
    stats.totalRatings = (stats.totalRatings || 0) + 1;
    if (type === 'up') {
        stats.reputation = (stats.reputation || 0) + 1;
    }
    userStats.set(ratedId, stats);

    const updatedPending = raterPending.filter(id => id !== ratedId);
    if (updatedPending.length === 0) {
        pendingRatings.delete(raterId);
        await interaction.update({ content: t('rating_thanks_all_rated'), components: [] });
    } else {
        pendingRatings.set(raterId, updatedPending);
        // Resend the select menu to rate the next person
         const selectOptions = updatedPending.map(id => {
            const user = client.users.cache.get(id);
            return {
                label: user.username,
                value: id,
                description: t('rate_user_description', { username: user.username })
            };
        });
        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId(`rating_select_${raterId}`).setPlaceholder(t('rating_select_placeholder_next')).addOptions(selectOptions)
        );
        await interaction.update({ content: t('rating_thanks_next'), components: [selectMenu] });
    }
    
    await checkMissionCompletion(interaction.user, 'RATE_PLAYER', { userStats, userMissions, client, userProfiles, userItems, clans });

    const profileInfo = userProfiles.get(ratedId);
    if (profileInfo) {
         try {
            const profileChannel = await client.channels.fetch(profileInfo.channelId);
            const ratedT = await getTranslator(ratedId, userStats);
            const profileMessage = await profileChannel.messages.fetch(profileInfo.messageId);
            const guild = profileChannel.guild;
            const member = await guild.members.fetch(ratedId);
            const items = userItems.get(ratedId) || { inventory: [], equippedBackground: 'default', equippedTitle: 'default' };
            
            const newProfileImageBuffer = await generateProfileImage(member, stats, items, clans, ratedT);
            const newAttachment = new AttachmentBuilder(newProfileImageBuffer, { name: 'profile-card.png' });
            
            await profileMessage.edit({ files: [newAttachment] });
        } catch (updateError) {
            console.error(`Failed to update profile image for ${ratedId} after rating:`, updateError);
        }
    }
}


client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.mentions.has(client.user.id)) return;
  
  const t = await getTranslator(message.author.id, userStats);
  const question = message.content.replace(/<@!?\d+>/g, '').trim();
  if (!question) return;

  try {
      const systemPrompt = `Analyze the user's sentence and categorize it into "pergunta" (question), "pedido" (request), or "conversa" (conversation). Respond only with the category word, in lowercase.`;
      const categoryResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ "model": "google/gemini-pro", "messages": [{ "role": "system", "content": systemPrompt }, { "role": "user", "content": question }] })
      });
      const categoryData = await categoryResponse.json();
      const category = categoryData.choices[0].message.content.toLowerCase().trim();

      let feedbackMessage = t('ai_typing');
      if (category.includes('pergunta')) feedbackMessage = t('ai_thinking');
      else if (category.includes('pedido')) feedbackMessage = t('ai_analyzing');
      
      const feedbackMsg = await message.channel.send(feedbackMessage);

      const mainResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ "model": "google/gemini-pro", "messages": [{ "role": "user", "content": question }] })
      });
      const mainData = await mainResponse.json();
      const response = mainData.choices[0].message.content;

      await feedbackMsg.delete();
      await message.reply(response.slice(0, 2000));
  } catch (err) {
    console.error("Error replying to mention:", err);
    await message.reply(t('ai_error'));
  }
});

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    const oldChannel = oldState.channel;
    if (oldChannel && oldChannel.name.startsWith('Raid de ') && oldChannel.members.size === 0) {
        oldChannel.delete('Raid voice channel is empty.').catch(e => console.error("Failed to delete empty voice channel:", e));
    }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const roleName = 'limpo';
    const categoryId = '1395589412661887068'; // TODO: Substituir pelo ID da categoria #perfis

    const oldHasRole = oldMember.roles.cache.some(role => role.name.toLowerCase() === roleName);
    const newHasRole = newMember.roles.cache.some(role => role.name.toLowerCase() === roleName);

    if (!oldHasRole && newHasRole) {
        console.log(`User ${newMember.displayName} received the '${roleName}' role. Creating channel and profile.`);
        const guild = newMember.guild;
        const category = guild.channels.cache.get(categoryId);

        if (!category || category.type !== ChannelType.GuildCategory) {
            console.error(`Category with ID ${categoryId} not found or is not a category.`);
            return;
        }

        try {
            const userLocale = newMember.user.locale || 'pt-BR';
            const t = await getTranslator(newMember.id, userStats, userLocale);

            const channel = await guild.channels.create({
                name: newMember.displayName,
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: newMember.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] },
                ],
            });

            console.log(`Channel #${channel.name} created for ${newMember.displayName}.`);
            
            const stats = userStats.get(newMember.id) || { level: 1, xp: 0, coins: 100, class: null, clanId: null, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0, reputation: 0, totalRatings: 0, locale: userLocale };
            stats.locale = userLocale; // Always update/set locale on role grant
            userStats.set(newMember.id, stats);

            const items = userItems.get(newMember.id) || { inventory: [], equippedBackground: 'default', equippedTitle: 'default' };
            userItems.set(newMember.id, items);

            assignMissions(newMember.id, userMissions);

            const profileImageBuffer = await generateProfileImage(newMember, stats, items, clans, t);
            const attachment = new AttachmentBuilder(profileImageBuffer, { name: 'profile-card.png' });

            const profileMessage = await channel.send({
                content: t('welcome_new_user', { user: newMember }),
                files: [attachment]
            });
            
            userProfiles.set(newMember.id, {
                channelId: channel.id,
                messageId: profileMessage.id
            });

        } catch (error) {
            console.error(`Failed to create channel or profile for ${newMember.displayName}:`, error);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
