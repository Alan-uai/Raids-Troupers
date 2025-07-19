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
  InteractionResponseFlags,
} from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import { REST, Routes } from 'discord.js';

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
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      const replyOptions = { content: 'Erro ao executar o comando!', flags: [InteractionResponseFlags.Ephemeral] };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions);
      } else {
        await interaction.reply(replyOptions);
      }
    }
  } else if (interaction.isButton()) {
    const [action, subAction, requesterId, raidId] = interaction.customId.split('_');

    if (action === 'raid') {
      try {
        if (subAction === 'vc') { // vc_opt_in becomes vc_opt
          await handleVoiceOptIn(interaction, requesterId, raidId);
        } else {
          await handleRaidButton(interaction, subAction, requesterId, raidId);
        }
      } catch (error) {
        console.error("Erro ao processar botão da raid:", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Ocorreu um erro ao processar sua ação.', flags: [InteractionResponseFlags.Ephemeral] }).catch(() => {});
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

    // Use the raidId (which is the original message ID) to fetch the message
    const originalRaidMessage = await interaction.channel.messages.fetch(raidId).catch(() => null);

    if (!originalRaidMessage) {
        return interaction.followUp({ content: "Não foi possível encontrar a mensagem de anúncio da raid original.", flags: [InteractionResponseFlags.Ephemeral] });
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
                .map(member => ({
                    label: client.users.cache.get(member.id).username,
                    value: member.id,
                    description: `Expulsar ${client.users.cache.get(member.id).username} da raid.`
                }));

            if (memberOptions.length === 0) {
                return await interaction.followUp({ content: 'Não há membros para expulsar.', flags: [InteractionResponseFlags.Ephemeral] });
            }

            const selectMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`raid_kick_${requesterId}_${raidId}`)
                    .setPlaceholder('Selecione um membro para expulsar')
                    .addOptions(memberOptions)
            );
            return await interaction.followUp({ content: 'Quem você gostaria de expulsar?', components: [selectMenu], flags: [InteractionResponseFlags.Ephemeral] });
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
            return await interaction.followUp({ content: 'O líder não pode sair da própria raid, apenas fechá-la.', flags: [InteractionResponseFlags.Ephemeral] });
        }
        
        await thread.send(`${interactor} saiu da equipe da raid.`);
        await thread.members.remove(interactor.id);
        
        const raidState = raidStates.get(raidId);
        if(raidState) {
            raidState.delete(interactor.id);
        }
        
        const membersField = raidEmbed.data.fields.find(f => f.name === 'Membros na Equipe');
        let [currentMembers, maxMembers] = membersField.value.split('/').map(Number);
        currentMembers = Math.max(1, currentMembers - 1);
        
        raidEmbed.setFields({ name: 'Membros na Equipe', value: `${currentMembers}/${maxMembers}`, inline: true });
        const originalRow = ActionRowBuilder.from(originalRaidMessage.components[0]);
        const joinButton = originalRow.components.find(c => c.data.custom_id?.startsWith('raid_join'));
        if (joinButton) {
            joinButton.setDisabled(false).setLabel('Juntar-se à Raid');
        }
        await originalRaidMessage.edit({ embeds: [raidEmbed], components: [originalRow] });
        
        return;
    }

    if (subAction === 'join') {
        let currentThread = thread;
        
        if (!currentThread) {
             raidStates.set(raidId, new Map()); // Use raidId from the start
             
             currentThread = await originalRaidMessage.startThread({
                name: `Raid de ${raidRequester.username}`,
                autoArchiveDuration: 1440,
            }).catch(e => {
                console.error("Error creating thread:", e);
                return null;
            });

            if (!currentThread) return;

            await currentThread.members.add(raidRequester.id).catch(e => console.error(`Failed to add leader ${raidRequester.id} to thread:`, e));
            await currentThread.send(`Bem-vindo, <@${raidRequester.id}>! Este é o tópico para organizar sua raid.`);
            
            const leaderControls = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`raid_start_${requesterId}_${raidId}`).setLabel('✅ Iniciar Raid').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`raid_kickmenu_${requesterId}_${raidId}`).setLabel('❌ Expulsar Membro').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId(`raid_close_${requesterId}_${raidId}`).setLabel('🔒 Fechar Raid').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`raid_vc_opt_${requesterId}_${raidId}`).setEmoji('🔉').setStyle(ButtonStyle.Primary)
                );
            
            await interaction.followUp({ content: `**Controles do Líder:**`, components: [leaderControls], flags: [InteractionResponseFlags.Ephemeral] });
        }

        const members = await currentThread.members.fetch();
        if (members.has(interactor.id)) {
            return await interaction.followUp({ content: 'Você já está nesta raid!', flags: [InteractionResponseFlags.Ephemeral] });
        }
        
        const membersField = raidEmbed.data.fields.find(f => f.name === 'Membros na Equipe');
        let [currentMembers, maxMembers] = membersField.value.split('/').map(Number);
        
        if (currentMembers >= 5) {
            return await interaction.followUp({ content: 'Esta raid já está cheia!', flags: [InteractionResponseFlags.Ephemeral] });
        }

        await currentThread.members.add(interactor.id).catch(e => console.error(`Failed to add member ${interactor.id} to thread:`, e));
        await currentThread.send(`${interactor} entrou na equipe da raid!`);
        currentMembers++;
        
        const memberControls = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`raid_leave_${requesterId}_${raidId}`).setLabel('👋 Sair da Raid').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`raid_vc_opt_${requesterId}_${raidId}`).setEmoji('🔉').setStyle(ButtonStyle.Primary)
            );
        await interaction.followUp({ content: '**Controles de Membro:**', components: [memberControls], flags: [InteractionResponseFlags.Ephemeral] });

        raidEmbed.setFields({ name: 'Membros na Equipe', value: `${currentMembers}/${maxMembers}`, inline: true });
        const originalRow = ActionRowBuilder.from(originalRaidMessage.components[0]);
        const joinButton = originalRow.components.find(c => c.data.custom_id?.startsWith('raid_join'));
        
        if (joinButton) {
            if (currentMembers >= 5) {
                joinButton.setDisabled(true).setLabel('Completo');
            } else {
                joinButton.setDisabled(false).setLabel('Juntar-se à Raid');
            }
        }
        
        await originalRaidMessage.edit({ embeds: [raidEmbed], components: [originalRow] });
    }
}

async function handleVoiceOptIn(interaction, requesterId, raidId) {
    if (!raidId) {
        return interaction.reply({ content: 'Não foi possível encontrar os dados desta raid para ativar o chat de voz.', flags: [InteractionResponseFlags.Ephemeral] });
    }

    const raidState = raidStates.get(raidId);
    if (!raidState) {
        return interaction.reply({ content: 'Esta raid não parece estar mais ativa.', flags: [InteractionResponseFlags.Ephemeral] });
    }

    const userHasOptedIn = raidState.get(interaction.user.id) || false;
    raidState.set(interaction.user.id, !userHasOptedIn);

    const feedbackMessage = !userHasOptedIn
        ? 'Você ativou a entrada automática no chat de voz quando a raid começar.'
        : 'Você desativou a entrada automática no chat de voz.';
    
    await interaction.reply({ content: feedbackMessage, flags: [InteractionResponseFlags.Ephemeral] });
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
                // We can't update ephemeral messages, so we send a new one
                await user.send({ content: `A raid começou e um chat de voz foi criado!`, components: [joinVCButton] });
            } catch (dmError) {
                console.log(`Could not DM user ${user.id}`);
            }
        }
    }

    if (helpers.length > 0) {
        await thread.send(`Obrigado a todos que ajudaram: ${helpers.map(m => `<@${m.id}>`).join(' ')}. Vocês são pessoas incríveis!`);
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
        return await interaction.reply({ content: 'Apenas o líder da raid pode executar esta ação.', flags: [InteractionResponseFlags.Ephemeral] });
    }
    const memberToKickId = interaction.values[0];
    
    // We need to fetch the original message from the original channel, not the thread.
    const raidChannelId = '1395591154208084049'; 
    const raidChannel = await client.channels.fetch(raidChannelId);
    const originalRaidMessage = await raidChannel.messages.fetch(raidId).catch(() => null);

    if (!originalRaidMessage || !originalRaidMessage.thread) {
        return await interaction.reply({ content: 'Não foi possível encontrar a raid ou o tópico associado.', flags: [InteractionResponseFlags.Ephemeral] });
    }

    const thread = originalRaidMessage.thread;
    const leader = interaction.user;
    
    try {
        const kickedUser = await client.users.fetch(memberToKickId);
        
        await thread.members.remove(memberToKickId);
        await interaction.update({ content: `${kickedUser.username} foi expulso da raid pelo líder.`, components: [] });
        await thread.send(`O líder expulsou ${kickedUser}.`);
        
        try {
            await kickedUser.send(`Perdão 🥺💔! ${leader.username}, o líder da raid, tinha outros planos. Boa sorte na próxima 🙌!`);
        } catch (dmError) {
            console.error(`Não foi possível enviar DM para ${kickedUser.username}. Eles podem ter DMs desabilitadas.`);
            thread.send(`(Não foi possível notificar ${kickedUser} por DM.)`);
        }
        
        const raidState = raidStates.get(raidId);
        if(raidState) {
            raidState.delete(memberToKickId);
        }

        const raidEmbed = EmbedBuilder.from(originalRaidMessage.embeds[0]);
        const membersField = raidEmbed.data.fields.find(f => f.name === 'Membros na Equipe');
        let [currentMembers, maxMembers] = membersField.value.split('/').map(Number);
        currentMembers = Math.max(1, currentMembers - 1);
        
        raidEmbed.setFields({ name: 'Membros na Equipe', value: `${currentMembers}/${maxMembers}`, inline: true });
        const originalRow = ActionRowBuilder.from(originalRaidMessage.components[0]);
        const joinButton = originalRow.components.find(c => c.data.custom_id?.startsWith('raid_join'));
        if (joinButton) {
            joinButton.setDisabled(false).setLabel('Juntar-se à Raid');
        }
        await originalRaidMessage.edit({ embeds: [raidEmbed], components: [originalRow] });

    } catch(err) {
        console.error("Erro ao expulsar membro:", err);
        await interaction.followUp({ content: 'Não foi possível expulsar o membro.', flags: [InteractionResponseFlags.Ephemeral] });
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

client.login(process.env.DISCORD_TOKEN);
