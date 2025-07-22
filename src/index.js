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
} from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { getTranslator } from './i18n.js';

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
const clans = new Map();
const pendingInvites = new Map();
const raidStats = new Map(); 

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
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    
    try {
      await command.execute(interaction, { clans, pendingInvites, raidStats, client });
    } catch (error) {
      console.error(error);
      const t = await getTranslator(interaction.user.id);
      const replyOptions = { content: t('command_error'), ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions).catch(()=>{});
      } else {
        await interaction.reply(replyOptions).catch(()=>{});
      }
    }
  } else if (interaction.isButton()) {
    const t = await getTranslator(interaction.user.id);
    const customIdParts = interaction.customId.split('_');
    const action = customIdParts[0];

    if (action === 'raid') {
        const subAction = customIdParts[1];
        const raidArgs = customIdParts.slice(2);
        if (subAction === 'controls') {
            await handleControlsButton(interaction, raidArgs[0], raidArgs[1], t);
        } else {
            await handleRaidButton(interaction, subAction, raidArgs, t);
        }
    }
  } else if (interaction.isStringSelectMenu()) {
      const t = await getTranslator(interaction.user.id);
      const customIdParts = interaction.customId.split('_');
      const action = customIdParts[0];

      if (action === 'raid' && customIdParts[1] === 'kick') {
          const requesterId = customIdParts[2];
          const raidId = customIdParts[3];
          await handleRaidKick(interaction, requesterId, raidId, t);
      }
  }
});


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
             const requesterT = await getTranslator(raidRequester.id);

             currentThread = await originalRaidMessage.startThread({ name: requesterT('raid_thread_name', { username: requesterMember?.displayName || raidRequester.username }), autoArchiveDuration: 10080 }).catch(e => { console.error("Error creating thread:", e); return null; });
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
        const interactorT = await getTranslator(interactor.id);
        await currentThread.send(interactorT('raid_user_joined', { username: interactor.username }));
        current++;

        const userStats = raidStats.get(interactor.id) || { created: 0, helped: 0 };
        userStats.helped += 1;
        raidStats.set(interactor.id, userStats);

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

async function handleRaidStart(interaction, originalRaidMessage, requesterId, raidId, t) {
    const thread = originalRaidMessage.thread;
    const raidState = raidStates.get(raidId);
    let voiceChannel = null;

    const voiceOptInCount = raidState ? [...raidState.values()].filter(v => v).length : 0;

    if (voiceOptInCount >= 2) {
        const leader = await interaction.guild.members.fetch(requesterId);
        const leaderT = await getTranslator(requesterId);
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
    }
    
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

    setTimeout(async () => {
        await originalRaidMessage.delete().catch(e => console.error("Error deleting original message:", e));
        if (thread) {
            await thread.delete().catch(e => console.error("Error deleting thread:", e));
        }
    }, 5000);

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
            const kickedT = await getTranslator(memberToKickId);
            await kickedUser.send(kickedT('kick_dm_notification', { leaderName: leaderDisplayName }));
        } catch (dmError) {
            console.error(`Could not DM kicked user ${kickedUser.username}.`);
            thread.send(t('kick_dm_fail', { username: kickedUser.username }));
        }

        if (raidStates.has(raidId)) raidStates.get(raidId).delete(memberToKickId);

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

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    const oldChannel = oldState.channel;
    if (oldChannel && oldChannel.name.startsWith('Raid de ') && oldChannel.members.size === 0) {
        oldChannel.delete('Raid voice channel is empty.').catch(e => console.error("Failed to delete empty voice channel:", e));
    }
});

client.login(process.env.DISCORD_TOKEN);
