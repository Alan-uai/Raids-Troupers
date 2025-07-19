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
} from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import { REST, Routes } from 'discord.js';
import { generateProfileImage } from './profile-generator.js';

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot está online!'));
app.listen(port, () => console.log(`HTTP server rodando na porta ${port}`));

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ]
});

client.commands = new Collection();
const raidStates = new Map();
const userStats = new Map(); // Armazena as estatísticas do usuário { level, xp, raidsCreated, raidsHelped, ... }
const userProfiles = new Map(); // Armazena { channelId, messageId } do perfil do usuário

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const commandModule = await import(filePath);
  const command = commandModule.default;
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[AVISO] O comando em ${filePath} está faltando a propriedade "data" ou "execute".`);
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  const commands = [];
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = (await import(filePath)).default;
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.log(`[AVISO] O comando em ${filePath} está faltando a propriedade "data" ou "execute".`);
    }
  }

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  try {
    console.log(`🔁 Atualizando ${commands.length} comandos Slash (/).`);

    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log(`✅ ${data.length} comandos Slash (/) registrados com sucesso.`);
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      // Pass the userStats map to the command executor
      await command.execute(interaction, userStats);
    } catch (error) {
      console.error(error);
      const replyOptions = { content: 'Erro ao executar o comando!', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions).catch(()=>{});
      } else {
        await interaction.reply(replyOptions).catch(()=>{});
      }
    }
  } else if (interaction.isButton()) {
    const [action, subAction, requesterId, raidId] = interaction.customId.split('_');

    if (action === 'raid') {
      try {
        if (subAction === 'controls') {
          await handleControlsButton(interaction, requesterId, raidId);
        } else if (subAction === 'vc') { // vc_opt_in becomes vc_opt
          await handleVoiceOptIn(interaction, requesterId, raidId);
        } else {
          await handleRaidButton(interaction, subAction, requesterId, raidId);
        }
      } catch (error) {
        console.error("Erro ao processar botão da raid:", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Ocorreu um erro ao processar sua ação.', ephemeral: true }).catch(() => {});
        }
      }
    }
  } else if (interaction.isStringSelectMenu()) {
      const [action, subAction, requesterId, raidId] = interaction.customId.split('_');
      if (action === 'raid' && subAction === 'kick') {
          await handleRaidKick(interaction, requesterId, raidId);
      }
  }
});

async function handleRaidButton(interaction, subAction, requesterId, raidId) {
    await interaction.deferUpdate();

    const interactor = interaction.user;
    const isLeader = interactor.id === requesterId;

    // Buscar a mensagem original no canal de raids
    const raidChannelId = '1395591154208084049';
    const raidChannel = await client.channels.fetch(raidChannelId);
    const originalRaidMessage = await raidChannel.messages.fetch(raidId).catch(() => null);

    if (!originalRaidMessage) {
        return interaction.followUp({ content: "Não foi possível encontrar a mensagem de anúncio da raid original.", ephemeral: true });
    }

    const thread = originalRaidMessage.thread;
    const raidEmbed = EmbedBuilder.from(originalRaidMessage.embeds[0]);
    const raidRequester = await client.users.fetch(requesterId);

    if (isLeader && thread && interaction.channelId === thread.id) {
        if (subAction === 'start') {
            await handleRaidStart(interaction, originalRaidMessage, requesterId, raidId);
            return;
        }

        if (subAction === 'kickmenu') {
             const members = await thread.members.fetch();
             const memberOptions = Array.from(members.values())
                .filter(m => m.id !== requesterId && client.users.cache.get(m.id) && !client.users.cache.get(m.id).bot)
                .map(member => {
                    const user = client.users.cache.get(member.id);
                    const guildMember = interaction.guild.members.cache.get(member.id);
                    const displayName = guildMember?.displayName || user.username;
                    return {
                        label: displayName,
                        value: member.id,
                        description: `Expulsar ${displayName} da raid.`
                    };
                });

            if (memberOptions.length === 0) {
                return await interaction.followUp({ content: 'Não há membros para expulsar.', ephemeral: true });
            }

            const selectMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`raid_kick_${requesterId}_${raidId}`)
                    .setPlaceholder('Selecione um membro para expulsar')
                    .addOptions(memberOptions)
            );
            return await interaction.followUp({ content: 'Quem você gostaria de expulsar?', components: [selectMenu], ephemeral: true });
        }

        if (subAction === 'close') {
            raidStates.delete(raidId);
            const members = await thread.members.fetch();
            const membersToMention = Array.from(members.values()).filter(m => !client.users.cache.get(m.id)?.bot).map(m => `<@${m.id}>`).join(' ');

            await thread.send(`O líder fechou a Raid. ${membersToMention}`);
            if (members.size > 1) { 
                await thread.send(`Agradeço a preocupação de todos.`);
            }
            await thread.send(`Fechando...`);

            await originalRaidMessage.delete().catch(e => console.error("Error deleting original message:", e));
            await thread.delete().catch(e => console.error("Error deleting thread:", e));
            return;
        }
    }

    if (subAction === 'leave' && thread && interaction.channelId === thread.id) {
        if (isLeader) {
            return await interaction.followUp({ content: 'O líder não pode sair da própria raid, apenas fechá-la.', ephemeral: true });
        }

        await thread.send(`${interactor} saiu da equipe da raid.`);
        await thread.members.remove(interactor.id);

        const raidState = raidStates.get(raidId);
        if(raidState) {
            raidState.delete(interactor.id);
        }

        const membersField = raidEmbed.data.fields.find(f => f.name.includes('Membros na Equipe'));
        const memberCount = membersField.value.match(/\*\*(\d+)\/(\d+)\*\*/);
        let [, currentMembers, maxMembers] = memberCount.map(Number);
        currentMembers = Math.max(1, currentMembers - 1);

        raidEmbed.setFields({ name: '👥 Membros na Equipe', value: `**${currentMembers}/${maxMembers}**`, inline: true });
        const originalRow = ActionRowBuilder.from(originalRaidMessage.components[0]);
        const joinButton = originalRow.components.find(c => c.data.custom_id?.startsWith('raid_join'));
        if (joinButton) {
            joinButton.setDisabled(false).setLabel('Entrar');
        }
        await originalRaidMessage.edit({ embeds: [raidEmbed], components: [originalRow] });

        return;
    }

    if (subAction === 'join') {
        let currentThread = thread;

        if (!currentThread) {
             raidStates.set(raidId, new Map()); // Use raidId from the start

             const requesterMember = await interaction.guild.members.fetch(raidRequester.id).catch(() => null);
             const displayName = requesterMember?.displayName || raidRequester.username;

             currentThread = await originalRaidMessage.startThread({
                name: `Raid de ${displayName}`,
                autoArchiveDuration: 1440,
            }).catch(e => {
                console.error("Error creating thread:", e);
                return null;
            });

            if (!currentThread) return;

            await currentThread.members.add(raidRequester.id).catch(e => console.error(`Failed to add leader ${raidRequester.id} to thread:`, e));

            // Send the universal controls button junto com a mensagem de boas-vindas
            const controlsButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`raid_controls_${requesterId}_${raidId}`)
                        .setLabel('⚙️ Meus Controles')
                        .setStyle(ButtonStyle.Primary)
                );

            const welcomeMessage = await currentThread.send({ 
                content: `Bem-vindo, <@${raidRequester.id}>! Este é o tópico para organizar sua raid.\n\n**Controles da Raid:**\nUse o botão abaixo para acessar seus controles.`, 
                components: [controlsButton] 
            });

            // Fixar a mensagem de controles
            await welcomeMessage.pin().catch(e => console.error("Error pinning controls message:", e));
        }

        const members = await currentThread.members.fetch();
        if (members.has(interactor.id)) {
            return await interaction.followUp({ content: 'Você já está nesta raid!', ephemeral: true });
        }

        const membersField = raidEmbed.data.fields.find(f => f.name.includes('Membros na Equipe'));
        const memberCount = membersField.value.match(/\*\*(\d+)\/(\d+)\*\*/);
        let [, currentMembers, maxMembers] = memberCount.map(Number);

        if (currentMembers >= 5) {
            return await interaction.followUp({ content: 'Esta raid já está cheia!', ephemeral: true });
        }

        await currentThread.members.add(interactor.id).catch(e => console.error(`Failed to add member ${interactor.id} to thread:`, e));
        await currentThread.send(`${interactor} entrou na equipe da raid!`);
        currentMembers++;

        raidEmbed.setFields({ name: '👥 Membros na Equipe', value: `**${currentMembers}/${maxMembers}**`, inline: true });
        const originalRow = ActionRowBuilder.from(originalRaidMessage.components[0]);
        const joinButton = originalRow.components.find(c => c.data.custom_id?.startsWith('raid_join'));

        if (joinButton) {
            if (currentMembers >= 5) {
                joinButton.setDisabled(true).setLabel('Completo');
            } else {
                joinButton.setDisabled(false).setLabel('Entrar');
            }
        }

        await originalRaidMessage.edit({ embeds: [raidEmbed], components: [originalRow] });
    }
}

async function handleControlsButton(interaction, requesterId, raidId) {
    const isLeader = interaction.user.id === requesterId;

    // Buscar a mensagem original no canal de raids
    const raidChannelId = '1395591154208084049';
    const raidChannel = await client.channels.fetch(raidChannelId);
    const originalRaidMessage = await raidChannel.messages.fetch(raidId).catch(() => null);

    if (!originalRaidMessage) {
        return await interaction.reply({ 
            content: 'Não foi possível encontrar a mensagem de anúncio da raid original.', 
            ephemeral: true 
        });
    }

    if (isLeader) {
        // Leader controls
        const leaderControls = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`raid_start_${requesterId}_${raidId}`).setLabel('✅ Iniciar Raid').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`raid_kickmenu_${requesterId}_${raidId}`).setLabel('❌ Expulsar Membro').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`raid_close_${requesterId}_${raidId}`).setLabel('🔒 Fechar Raid').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`raid_vc_opt_${requesterId}_${raidId}`).setLabel('🔊 Criar Chat de Voz').setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({ 
            content: '**Controles do Líder:**\nEscolha uma ação:', 
            components: [leaderControls], 
            ephemeral: true 
        });
    } else {
        // Member controls
        const memberControls = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`raid_leave_${requesterId}_${raidId}`).setLabel('👋 Sair da Raid').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`raid_vc_opt_${requesterId}_${raidId}`).setLabel('🔊 Criar Chat de Voz').setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({ 
            content: '**Controles de Membro:**\nEscolha uma ação:', 
            components: [memberControls], 
            ephemeral: true 
        });
    }
}

async function handleVoiceOptIn(interaction, requesterId, raidId) {
    if (!raidId) {
        return interaction.reply({ content: 'Não foi possível encontrar os dados desta raid para ativar o chat de voz.', ephemeral: true });
    }

    // Verificar se a raid existe buscando a mensagem original
    const raidChannelId = '1395591154208084049';
    const raidChannel = await client.channels.fetch(raidChannelId);
    const originalRaidMessage = await raidChannel.messages.fetch(raidId).catch(() => null);

    if (!originalRaidMessage) {
        return interaction.reply({ content: 'Esta raid não parece estar mais ativa.', ephemeral: true });
    }

    // Garantir que o raidState existe
    if (!raidStates.has(raidId)) {
        raidStates.set(raidId, new Map());
    }

    const raidState = raidStates.get(raidId);
    const userHasOptedIn = raidState.get(interaction.user.id) || false;
    raidState.set(interaction.user.id, !userHasOptedIn);

    const feedbackMessage = !userHasOptedIn
        ? '🔊 Você ativou a entrada automática no chat de voz quando a raid começar.'
        : '🔇 Você desativou a entrada automática no chat de voz.';

    await interaction.reply({ content: feedbackMessage, ephemeral: true });
}

async function handleRaidStart(interaction, originalRaidMessage, requesterId, raidId) {
    const thread = originalRaidMessage.thread;
    const raidState = raidStates.get(raidId);
    let voiceChannel = null;

    let voiceOptInCount = 0;
    if (raidState) {
        for (const optedIn of raidState.values()) {
            if (optedIn) {
                voiceOptInCount++;
            }
        }
    }

    if (voiceOptInCount >= 2) {
        const leader = await interaction.guild.members.fetch(requesterId);
        const parentCategory = interaction.channel.parent;
        voiceChannel = await interaction.guild.channels.create({
            name: `Raid de ${leader.displayName}`,
            type: ChannelType.GuildVoice,
            userLimit: 5,
            parent: parentCategory,
            permissionOverwrites: [{
                id: interaction.guild.id,
                deny: [PermissionsBitField.Flags.Connect],
            }, ],
        }).catch(e => console.error("Failed to create voice channel:", e));
    }

    await thread.send(`Atenção, equipe! A raid foi iniciada pelo líder!`);
    const members = await thread.members.fetch();
    const helpers = [];

    for (const member of members.values()) {
        const user = client.users.cache.get(member.id);
        if (!user || user.bot) continue;

        if (user.id !== requesterId) {
            helpers.push(member);
        }

        const guildMember = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (voiceChannel && raidState && raidState.get(user.id) && guildMember) {
            await guildMember.voice.setChannel(voiceChannel).catch(e => console.log(`Failed to move ${guildMember.displayName}: ${e.message}`));
        }

        if(voiceChannel && (!raidState || !raidState.get(user.id))){
             const joinVCButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Juntar-se ao Chat de Voz').setStyle(ButtonStyle.Link).setURL(voiceChannel.url)
            );
            try {
                await user.send({ content: `A raid começou e um chat de voz foi criado!`, components: [joinVCButton] });
            } catch (dmError) {
                console.log(`Could not DM user ${user.id}`);
            }
        }
    }

    if (helpers.length > 0) {
        await thread.send(`Obrigado a todos que ajudaram: ${helpers.map(m => `<@${m.id}>`).join(' ')}. Vocês são pessoas incríveis!`);
        
        // Update stats, XP, and profile images for helpers
        for (const helperMember of helpers) {
            const stats = userStats.get(helperMember.id) || { level: 1, xp: 0, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0 };
            const xpGained = 25;
            const xpToLevelUp = 100;
            
            stats.raidsHelped += 1;
            stats.xp += xpGained;

            if (stats.xp >= xpToLevelUp) {
                stats.level += 1;
                stats.xp -= xpToLevelUp;
                // We'll notify in the thread for public recognition
                await thread.send(`🎉 Parabéns, <@${helperMember.id}>! Você subiu para o nível ${stats.level}!`);
            }
            userStats.set(helperMember.id, stats);

            // Now, update the profile image in their private channel
            const profileInfo = userProfiles.get(helperMember.id);
            if (profileInfo && profileInfo.channelId && profileInfo.messageId) {
                try {
                    const profileChannel = await client.channels.fetch(profileInfo.channelId);
                    const profileMessage = await profileChannel.messages.fetch(profileInfo.messageId);
                    const member = await interaction.guild.members.fetch(helperMember.id);
                    
                    const newProfileImageBuffer = await generateProfileImage(member, stats);
                    const newAttachment = new AttachmentBuilder(newProfileImageBuffer, { name: 'profile-card.png' });
                    
                    await profileMessage.edit({
                        content: `Bem-vindo, ${member}! Este é o seu espaço de perfil pessoal.`,
                        files: [newAttachment]
                    });
                } catch (updateError) {
                    console.error(`Falha ao editar a imagem de perfil para ${helperMember.id}:`, updateError);
                }
            }
        }
    }

    if (voiceChannel) {
        for (const member of members.values()) {
            const user = client.users.cache.get(member.id);
            if (user && !user.bot) {
                await voiceChannel.permissionOverwrites.edit(user.id, {
                    [PermissionsBitField.Flags.Connect]: true,
                }).catch(() => {});
            }
        }
    }

    await originalRaidMessage.delete().catch(e => console.error("Error deleting original message:", e));
    await thread.setLocked(true).catch(e => console.error("Error locking thread:", e));
    await thread.setArchived(true).catch(e => console.error("Error archiving thread:", e));
    raidStates.delete(raidId);
}


async function handleRaidKick(interaction, requesterId, raidId) {
    if (interaction.user.id !== requesterId) {
        return await interaction.reply({ content: 'Apenas o líder da raid pode executar esta ação.', ephemeral: true });
    }
    const memberToKickId = interaction.values[0];

    const raidChannelId = '1395591154208084049'; 
    const raidChannel = await client.channels.fetch(raidChannelId);
    const originalRaidMessage = await raidChannel.messages.fetch(raidId).catch(() => null);

    if (!originalRaidMessage || !originalRaidMessage.thread) {
        return await interaction.reply({ content: 'Não foi possível encontrar a raid ou o tópico associado.', ephemeral: true });
    }

    const thread = originalRaidMessage.thread;
    const leader = interaction.user;

    try {
        const kickedUser = await client.users.fetch(memberToKickId);

        await thread.members.remove(memberToKickId);
        const kickedMember = await interaction.guild.members.fetch(memberToKickId).catch(() => null);
        const kickedDisplayName = kickedMember?.displayName || kickedUser.username;

        await interaction.update({ content: `${kickedDisplayName} foi expulso da raid pelo líder.`, components: [] });
        await thread.send(`O líder expulsou ${kickedDisplayName}.`);

        try {
            const leaderMember = await interaction.guild.members.fetch(leader.id).catch(() => null);
            const leaderDisplayName = leaderMember?.displayName || leader.username;

            await kickedUser.send(`Perdão 🥺💔! ${leaderDisplayName}, o líder da raid, tinha outros planos. Boa sorte na próxima 🙌!`);
        } catch (dmError) {
            console.error(`Não foi possível enviar DM para ${kickedUser.username}. Eles podem ter DMs desabilitadas.`);
            thread.send(`(Não foi possível notificar ${kickedUser} por DM.)`);
        }

        const raidState = raidStates.get(raidId);
        if(raidState) {
            raidState.delete(memberToKickId);
        }

        // Update stats for kick
        const leaderStats = userStats.get(requesterId) || { level: 1, xp: 0, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0 };
        leaderStats.kickedOthers += 1;
        userStats.set(requesterId, leaderStats);

        const kickedStats = userStats.get(memberToKickId) || { level: 1, xp: 0, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0 };
        kickedStats.wasKicked += 1;
        userStats.set(memberToKickId, kickedStats);


        const raidEmbed = EmbedBuilder.from(originalRaidMessage.embeds[0]);
        const membersField = raidEmbed.data.fields.find(f => f.name.includes('Membros na Equipe'));
        const memberCount = membersField.value.match(/\*\*(\d+)\/(\d+)\*\*/);
        let [, currentMembers, maxMembers] = memberCount.map(Number);
        currentMembers = Math.max(1, currentMembers - 1);

        raidEmbed.setFields({ name: '👥 Membros na Equipe', value: `**${currentMembers}/${maxMembers}**`, inline: true });
        const originalRow = ActionRowBuilder.from(originalRaidMessage.components[0]);
        const joinButton = originalRow.components.find(c => c.data.custom_id?.startsWith('raid_join'));
        if (joinButton) {
            joinButton.setDisabled(false).setLabel('Entrar');
        }
        await originalRaidMessage.edit({ embeds: [raidEmbed], components: [originalRow] });

    } catch(err) {
        console.error("Erro ao expulsar membro:", err);
        await interaction.followUp({ content: 'Não foi possível expulsar o membro.', ephemeral: true });
    }
}


client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.mentions.has(client.user.id)) {
    return;
  }

  const pergunta = message.content.replace(/<@!?\d+>/g, '').trim();

  if (!pergunta) {
    return;
  }

  try {
      const systemPrompt = `
      Analise a frase do usuário e categorize-a em uma das três categorias: "pergunta", "pedido", "conversa".
      - "pergunta": Para perguntas diretas que buscam uma informação específica (ex: "que horas são?", "quem descobriu o Brasil?").
      - "pedido": Para solicitações de criação, informação detalhada ou ajuda (ex: "me dê uma referência", "fale sobre a segunda guerra", "crie uma imagem").
      - "conversa": Para interações pessoais, saudações, desabafos ou comentários (ex: "e aí, como vai?", "estou triste", "você é uma IA?").
      Responda apenas com a palavra da categoria, em minúsculas.
    `;

    const categoryResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "google/gemini-2.5-pro-exp-03-25",
        "messages": [
          { "role": "system", "content": systemPrompt },
          { "role": "user", "content": pergunta }
        ]
      })
    });

    const categoryData = await categoryResponse.json();
    const categoria = categoryData.choices[0].message.content.toLowerCase().trim();

    let feedbackMessage = "Digitando...";
    if (categoria.includes('pergunta')) {
        feedbackMessage = "Pensando...🤔💡";
    } else if (categoria.includes('pedido')) {
        feedbackMessage = "Pensando no seu caso...🤔💡";
    } else if (categoria.includes('conversa')) {
        feedbackMessage = "Digitando nessa bagaça...";
    }

    const feedbackMsg = await message.channel.send(feedbackMessage);

    const mainResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "google/gemini-2.5-pro-exp-03-25",
        "messages": [{ "role": "user", "content": pergunta }]
      })
    });

    const mainData = await mainResponse.json();
    const resposta = mainData.choices[0].message.content;

    await feedbackMsg.delete();
    await message.reply(resposta.slice(0, 2000));
  } catch (err) {
    console.error("Erro ao responder menção:", err);
    await message.reply('Desculpe, ocorreu um erro ao tentar responder.');
  }
});

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    const oldChannel = oldState.channel;
    if (oldChannel && oldChannel.name.startsWith('Raid de ') && oldChannel.members.size === 0) {
        oldChannel.delete('Canal da raid ficou vazio.').catch(e => console.error("Failed to delete empty voice channel:", e));
    }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const roleName = 'limpo';
    const categoryId = '1395589412661887068'; 

    const oldHasRole = oldMember.roles.cache.some(role => role.name.toLowerCase() === roleName);
    const newHasRole = newMember.roles.cache.some(role => role.name.toLowerCase() === roleName);

    if (!oldHasRole && newHasRole) {
        console.log(`Usuário ${newMember.displayName} recebeu a role '${roleName}'. Criando canal e perfil.`);

        const guild = newMember.guild;
        const category = guild.channels.cache.get(categoryId);

        if (!category || category.type !== ChannelType.GuildCategory) {
            console.error(`Categoria com ID ${categoryId} não encontrada ou não é uma categoria.`);
            return;
        }

        try {
            const channel = await guild.channels.create({
                name: newMember.displayName,
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites: [
                    {
                        id: guild.id, // @everyone
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: newMember.id,
                        allow: [PermissionsBitField.Flags.ViewChannel],
                        deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageMessages]
                    },
                ],
            });

            console.log(`Canal #${channel.name} criado para ${newMember.displayName}.`);
            
            // Get user stats or create default if not exists
            const stats = userStats.get(newMember.id) || { level: 1, xp: 0, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0 };
            userStats.set(newMember.id, stats);

            // Gerar a imagem do perfil
            const profileImageBuffer = await generateProfileImage(newMember, stats);
            const attachment = new AttachmentBuilder(profileImageBuffer, { name: 'profile-card.png' });

            const profileMessage = await channel.send({
                content: `Bem-vindo, ${newMember}! Este é o seu espaço de perfil pessoal.`,
                files: [attachment]
            });
            
            // Store the profile channel and message IDs for future updates
            userProfiles.set(newMember.id, {
                channelId: channel.id,
                messageId: profileMessage.id
            });

        } catch (error) {
            console.error(`Falha ao criar canal ou perfil para ${newMember.displayName}:`, error);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

    