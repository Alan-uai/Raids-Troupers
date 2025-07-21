
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
  AttachmentBuilder
} from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { generateProfileImage } from './profile-generator.js';
import { allItems } from './items.js';
import { missions as missionPool } from './missions.js';
import { assignMissions, checkMissionCompletion, collectAllRewards, postMissionList } from './mission-system.js';
import { getTranslator } from './i18n.js';
import lojaSetup from './commands/loja_setup.js';
import clanEnquete from './commands/clan_enquete.js';

dotenv.config();

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
    GatewayIntentBits.GuildMessageReactions,
  ]
});

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
const userShopSelection = new Map();
const suggestionVotes = new Map();
const pollVotes = clanEnquete.pollVotes;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, 'commands');

function getAllCommandFiles(dir) {
    let files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        if (item.isDirectory()) {
            files = [...files, ...getAllCommandFiles(path.join(dir, item.name))];
        } else if (item.name.endsWith('.js') && !item.name.endsWith('.data.js')) {
            files.push(path.join(dir, item.name));
        }
    }
    return files;
}

const commandFiles = getAllCommandFiles(commandsPath);

for (const file of commandFiles) {
    try {
        const commandModule = await import(path.resolve(file).replace(/\\/g, '/'));
        const command = commandModule.default;

        if (command && 'data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${file} is missing a required "data" or "execute" property.`);
        }
    } catch (error) {
        console.error(`Error loading command at ${file}:`, error);
    }
}


client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  setInterval(checkAuctionEnd, 15000);
  const t = await getTranslator(null, null, 'pt-BR');
  lojaSetup.updateShopMessage(client, t);
});

client.on(Events.InteractionCreate, async interaction => {
  const t = await getTranslator(interaction.user.id, userStats);

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    if (!userMissions.has(interaction.user.id) && userProfiles.has(interaction.user.id)) {
        const stats = userStats.get(interaction.user.id);
        assignMissions(interaction.user.id, userMissions, stats);
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
    const [action, ...args] = interaction.customId.split('_');

    if (action === 'raid') {
        const [subAction, ...raidArgs] = args;
        if (subAction === 'controls') {
            const [requesterId, raidId] = raidArgs;
            await handleControlsButton(interaction, requesterId, raidId, t);
        } else {
            await handleRaidButton(interaction, subAction, raidArgs, t);
        }
    } else if (action === 'auction' && args[0] === 'bid') {
        await interaction.reply({ content: t('auction_bid_button_reply'), ephemeral: true });
    } else if (action === 'rate') {
        const [type, raterId, ratedId] = args;
        await handleRating(interaction, raterId, ratedId, type, t);
    } else if (interaction.customId === 'shop_buy_button') {
        await handleBuyButton(interaction, t);
    } else if (action === 'mission') {
        const [subAction, userId, ...rest] = args;
        if (subAction === 'view') {
            const type = rest[0]; // 'daily' or 'weekly'
            await postMissionList(interaction.message.thread, userId, type, { userMissions, userStats }, interaction);
        } else if (subAction === 'collectall') {
            await collectAllRewards(interaction, userId, { userStats, userItems, userMissions, client, userProfiles, clans });
        }
    } else if (action === 'profile') {
        const [subAction, userId] = args;
         if (interaction.user.id !== userId) {
            return await interaction.reply({ content: t('not_for_you'), ephemeral: true });
        }
        if(subAction === 'equip') {
            await handleEquipButton(interaction, userId, t);
        } else if (subAction === 'class') {
             await interaction.client.commands.get('classes').execute(interaction, { userStats });
        }
    } else if (action === 'poll') {
        const [subAction, pollId, optionIndex] = args;
        if (subAction === 'vote') {
            await handlePollVote(interaction, pollId, parseInt(optionIndex, 10), t);
        }
    } else if (action === 'suggestion') {
        await handleSuggestionVote(interaction, action, args, t);
    }


  } else if (interaction.isStringSelectMenu()) {
      const [action, ...args] = interaction.customId.split('_');
      if (action === 'raid' && args[0] === 'kick') {
          const [requesterId, raidId] = args;
          await handleRaidKick(interaction, requesterId, raidId, t);
      } else if (action === 'rating' && args[0] === 'select') {
          const [raterId] = args;
          await handleRatingSelection(interaction, raterId, t);
      } else if (action === 'shop' && args[0] === 'select' && args[1] === 'item') {
          userShopSelection.set(interaction.user.id, interaction.values[0]);
          await interaction.reply({ content: t('shop_item_selected'), ephemeral: true });
      } else if (action === 'equip' && args[0] === 'select') {
          const [_, userId] = args;
          if (interaction.user.id !== userId) {
            return await interaction.reply({ content: t('not_for_you'), ephemeral: true });
          }
          const itemId = interaction.values[0];
          await handleEquipSelection(interaction, userId, itemId, t);
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
    
    const t = await getTranslator(null, null, 'pt-BR');
    const item = allItems.find(i => i.id === auction.item.id);

    const finalEmbed = new EmbedBuilder()
        .setColor('#808080')
        .setTitle(`🌟 ${t('auction_ended_title')} 🌟`)
        .setDescription(t('auction_ended_desc', { itemName: t(`item_${item.id}_name`) }));

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
    items.inventory.push(item.id);
    userItems.set(winnerId, items);

    finalEmbed.addFields(
        { name: `🏆 ${t('winner')}`, value: `${winnerUser.username}`, inline: true },
        { name: `💰 ${t('winning_bid')}`, value: `${winningBid} TC`, inline: true }
    );
    finalEmbed.setThumbnail(winnerUser.displayAvatarURL());
    finalEmbed.setFooter({text: t('auction_winner_footer')});
    
    if (auctionMessage) await auctionMessage.edit({ embeds: [finalEmbed], components: [] });

    try {
        await winnerUser.send({ content: winnerT('auction_winner_dm', { itemName: winnerT(`item_${item.id}_name`), bid: winningBid }) });
    } catch (e) {
        console.log(`Could not send DM to auction winner ${winnerUser.username}`);
    }
}


async function handleRaidButton(interaction, subAction, args, t) {
    const interactor = interaction.user;
    const [requesterId, raidId] = args;
    const isLeader = interactor.id === requesterId;
    
    const raidChannelId = '1395591154208084049';
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
        const memberControls = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`raid_leave_${requesterId}_${raidId}`).setLabel(t('leave_raid_button')).setStyle(ButtonStyle.Danger).setEmoji('👋'),
        );
        await interaction.reply({ content: t('member_controls_title'), components: [memberControls], ephemeral: true });
    } else {
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

    const raidChannelId = '1395591154208084049';
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
            const stats = userStats.get(user.id) || { level: 1, xp: 0, coins: 0, class: null, clanId: null, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0, reputation: 0, totalRatings: 0, locale: 'pt-BR', autoCollectMissions: false };
            const xpGained = 25, coinsGained = 10;
            
            stats.raidsHelped += 1;
            stats.xp += xpGained;
            stats.coins += coinsGained;

            const xpToLevelUp = 100 * stats.level;
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
                    await thread.send({ content: userT('level_up_notification_public', { userId: user.id, level: stats.level }) });
                }
            }
            userStats.set(user.id, stats);
            await checkMissionCompletion(user, 'RAID_HELPED', { userStats, userMissions, client, userProfiles, userItems, clans });
        }

        const guildMember = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (voiceChannel && raidState?.get(user.id) && guildMember?.voice.channelId !== voiceChannel.id) {
            await guildMember.voice.setChannel(voiceChannel).catch(e => console.log(`Failed to move ${guildMember.displayName}: ${e.message}`));
        } else if (voiceChannel && !raidState?.get(user.id)) {
            const joinVCButton = new ActionRowBuilder().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(voiceChannel.url));
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

    const raidChannelId = '1395591154208084049';
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

    const stats = userStats.get(ratedId) || { level: 1, xp: 0, coins: 0, class: null, clanId: null, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0, reputation: 0, totalRatings: 0, locale: 'pt-BR', autoCollectMissions: false };
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
            const items = userItems.get(ratedId) || { inventory: [], equippedBackground: 'default', equippedTitle: 'default', equippedBorder: null };
            
            const newProfileImageBuffer = await generateProfileImage(member, stats, items, clans, ratedT);
            const newAttachment = new AttachmentBuilder(newProfileImageBuffer, { name: 'profile-card.png' });
            
            await profileMessage.edit({ files: [newAttachment] });
        } catch (updateError) {
            console.error(`Failed to update profile image for ${ratedId} after rating:`, updateError);
        }
    }
}

async function handleBuyButton(interaction, t) {
    const userId = interaction.user.id;
    
    if (!userProfiles.has(userId)) {
        return await interaction.reply({ content: t('buy_profile_not_found'), ephemeral: true });
    }
    
    const itemId = userShopSelection.get(userId);
    if (!itemId) {
        return await interaction.reply({ content: t('buy_no_item_selected'), ephemeral: true });
    }

    const itemToBuy = allItems.find(item => item.id === itemId);
    if (!itemToBuy) {
        return; 
    }
    
    await interaction.deferReply({ ephemeral: true });

    const stats = userStats.get(userId);
    const items = userItems.get(userId);

    if (items.inventory.includes(itemId)) {
      return await interaction.editReply({ content: t('buy_interaction_fail_owned', { itemName: t(`item_${itemToBuy.id}_name`) }) });
    }

    if (!stats || stats.coins < itemToBuy.price) {
      return await interaction.editReply({ content: t('buy_interaction_fail_coins', { itemName: t(`item_${itemToBuy.id}_name`) }) });
    }

    stats.coins -= itemToBuy.price;
    items.inventory.push(itemId);

    userStats.set(userId, stats);
    userItems.set(userId, items);
    
    userShopSelection.delete(userId);
    
    await interaction.editReply({ content: t('buy_interaction_success', { itemName: t(`item_${itemToBuy.id}_name`), balance: stats.coins }) });
}

async function handleEquipButton(interaction, userId, t) {
    if (interaction.user.id !== userId) {
        return await interaction.reply({ content: t('not_for_you'), ephemeral: true });
    }

    const userItemsData = userItems.get(userId);
    const inventory = userItemsData?.inventory || [];

    if (inventory.length === 0) {
        return await interaction.reply({ content: t('inventory_empty'), ephemeral: true });
    }

    const equippableItems = inventory
        .map(id => allItems.find(item => item.id === id))
        .filter(item => item && ['background', 'title', 'avatar_border'].includes(item.type));

    if (equippableItems.length === 0) {
        return await interaction.reply({ content: t('equip_no_equippable_items'), ephemeral: true });
    }

    const options = equippableItems.map(item => ({
        label: t(`item_${item.id}_name`),
        description: t(`item_type_${item.type}`),
        value: item.id
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`equip_select_${userId}`)
        .setPlaceholder(t('equip_select_placeholder'))
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({ content: t('equip_select_prompt'), components: [row], ephemeral: true });
}

async function handleEquipSelection(interaction, userId, itemId, t) {
    await interaction.deferUpdate();
    
    const items = userItems.get(userId);
    if (!items || !items.inventory.includes(itemId)) {
      return await interaction.followUp({ content: t('equip_not_owned'), ephemeral: true });
    }
    
    const itemToEquip = allItems.find(item => item.id === itemId);
    if (!itemToEquip) {
        return await interaction.followUp({ content: t('equip_item_not_exist'), ephemeral: true });
    }

    let replyMessage = '';

    if (itemToEquip.type === 'background') {
        items.equippedBackground = itemToEquip.url;
        replyMessage = t('equip_background_success', { itemName: t(`item_${itemToEquip.id}_name`) });
    } else if (itemToEquip.type === 'title') {
        items.equippedTitle = itemToEquip.id;
        replyMessage = t('equip_title_success', { itemName: t(`item_${itemToEquip.id}_name`) });
    } else if (itemToEquip.type === 'avatar_border') {
        items.equippedBorder = itemToEquip.url;
        replyMessage = t('equip_border_success', { itemName: t(`item_${itemToEquip.id}_name`) });
    } else {
        return await interaction.followUp({ content: t('equip_cannot_equip_type'), ephemeral: true });
    }

    userItems.set(userId, items);
    
    const profileInfo = userProfiles.get(userId);
    if (profileInfo?.channelId && profileInfo?.messageId) {
        try {
            const stats = userStats.get(userId);
            const member = await interaction.guild.members.fetch(userId);

            const newProfileImageBuffer = await generateProfileImage(member, stats, items, clans, t);
            const newAttachment = new AttachmentBuilder(newProfileImageBuffer, { name: 'profile-card.png' });

            const profileChannel = await interaction.client.channels.fetch(profileInfo.channelId);
            const profileMessage = await profileChannel.messages.fetch(profileInfo.messageId);
            
            await profileMessage.edit({ files: [newAttachment] });

        } catch (updateError) {
            console.error(`Failed to update profile image for ${userId}:`, updateError);
        }
    }
    
    await interaction.followUp({ content: replyMessage, ephemeral: true });
}

async function handlePollVote(interaction, pollId, optionIndex, t) {
    const pollData = pollVotes.get(pollId);
    if (!pollData) {
        return interaction.reply({ content: t('poll_ended_or_invalid'), ephemeral: true });
    }

    const userId = interaction.user.id;

    if (pollData.voters.has(userId)) {
        const previousVoteIndex = pollData.voters.get(userId);
        if (previousVoteIndex === optionIndex) {
            return interaction.reply({ content: t('poll_already_voted_same'), ephemeral: true });
        }
        pollData.counts[previousVoteIndex]--;
    }

    pollData.voters.set(userId, optionIndex);
    pollData.counts[optionIndex]++;

    const pollMessage = await interaction.channel.messages.fetch(pollId);
    if (!pollMessage) return;

    const originalEmbed = pollMessage.embeds[0];
    const newEmbed = EmbedBuilder.from(originalEmbed)
        .setDescription(t('poll_description_updated', { count: pollData.voters.size }));

    const newRows = [];
    let currentOptionIndex = 0;
    
    pollMessage.components.forEach(row => {
        const newRow = new ActionRowBuilder();
        row.components.forEach(button => {
            const optionLabel = button.label.split(' (')[0];
            const newButton = ButtonBuilder.from(button)
                .setLabel(`${optionLabel} (${pollData.counts[currentOptionIndex]})`);
            newRow.addComponents(newButton);
            currentOptionIndex++;
        });
        newRows.push(newRow);
    });

    await pollMessage.edit({ embeds: [newEmbed], components: newRows });
    await interaction.reply({ content: t('poll_vote_success'), ephemeral: true });
}

async function handleSuggestionVote(interaction, action, args, t) {
    const messageId = interaction.message.id;
    const userId = interaction.user.id;
    const voteType = args[0]; // approve or reject

    const userLastVote = suggestionVotes.get(userId);
    if (userLastVote && userLastVote[messageId]) {
        return interaction.reply({ content: t('suggestion_already_voted'), ephemeral: true });
    }

    await interaction.deferUpdate();

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    const votesField = embed.data.fields.find(f => f.name === 'Votos');
    
    const approveMatch = votesField.value.match(/Aprovar: (\d+)/);
    const rejectMatch = votesField.value.match(/Reprovar: (\d+)/);

    let approves = approveMatch ? parseInt(approveMatch[1], 10) : 0;
    let rejects = rejectMatch ? parseInt(rejectMatch[1], 10) : 0;

    if (voteType === 'approve') {
        approves++;
    } else if (voteType === 'reject') {
        rejects++;
    }

    if (rejects >= 5 && approves === 0) {
        await interaction.message.delete();
        await interaction.followUp({ content: t('suggestion_deleted_low_votes'), ephemeral: true });
        return;
    }

    embed.setFields(
        ...embed.data.fields.filter(f => f.name !== 'Votos'),
        { name: 'Votos', value: `Aprovar: ${approves}\nReprovar: ${rejects}`, inline: true }
    );
    
    await interaction.message.edit({ embeds: [embed] });

    if (!suggestionVotes.has(userId)) {
        suggestionVotes.set(userId, {});
    }
    suggestionVotes.get(userId)[messageId] = true;

    const stats = userStats.get(userId) || { level: 1, xp: 0, coins: 0 };
    stats.xp += 20;
    stats.coins += 10;
    userStats.set(userId, stats);

    await interaction.followUp({ content: t('suggestion_vote_success'), ephemeral: true });
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

const PROFILE_CATEGORY_ID_EVENT = '1395589412661887068';

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const roleName = 'limpo';
    
    const oldHasRole = oldMember.roles.cache.some(role => role.name.toLowerCase() === roleName);
    const newHasRole = newMember.roles.cache.some(role => role.name.toLowerCase() === roleName);

    if (!oldHasRole && newHasRole) {
        console.log(`User ${newMember.displayName} received the '${roleName}' role. Creating channel and profile.`);
        const guild = newMember.guild;
        const category = guild.channels.cache.get(PROFILE_CATEGORY_ID_EVENT);

        if (!category || category.type !== ChannelType.GuildCategory) {
            console.error(`Category with ID ${PROFILE_CATEGORY_ID_EVENT} not found or is not a category.`);
            return;
        }

        if (userProfiles.has(newMember.id)) return;

        try {
            const userLocale = newMember.user.locale || 'pt-BR';
            const t = await getTranslator(newMember.id, userStats, userLocale);

            const channel = await guild.channels.create({
                name: newMember.displayName,
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites: [
                     { id: interaction.guild.id, deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.CreatePublicThreads, PermissionsBitField.Flags.CreatePrivateThreads, PermissionsBitField.Flags.SendMessagesInThreads] },
                    { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory] },
                    { id: interaction.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageThreads] }
                ],
            });

            console.log(`Channel #${channel.name} created for ${newMember.displayName}.`);
            
            const stats = { level: 1, xp: 0, coins: 100, class: null, clanId: null, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0, reputation: 0, totalRatings: 0, locale: userLocale, autoCollectMissions: false, completedMilestones: {} };
            userStats.set(newMember.id, stats);

            const items = { inventory: [], equippedBackground: 'default', equippedTitle: 'default', equippedBorder: null };
            userItems.set(newMember.id, items);

            assignMissions(newMember.id, userMissions, stats);

            const profileImageBuffer = await generateProfileImage(newMember, stats, items, clans, t);
            const attachment = new AttachmentBuilder(profileImageBuffer, { name: 'profile-card.png' });
            
            await channel.send({ content: t('welcome_new_user', { user: newMember }) });
            const profileMessage = await channel.send({ files: [attachment] });
            
            userProfiles.set(newMember.id, {
                channelId: channel.id,
                messageId: profileMessage.id
            });
            
           // Implementar tópicos...
            await channel.send("Tópicos de missões e outros serão implementados aqui.");


        } catch (error) {
            console.error(`Failed to create channel or profile for ${newMember.displayName}:`, error);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
