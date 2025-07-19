import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ComponentType
} from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { OpenAI } from 'openai';

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot está online!'));
app.listen(port, () => console.log(`HTTP server rodando na porta ${port}`));

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();

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

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'Erro ao executar o comando!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'Erro ao executar o comando!', ephemeral: true });
      }
    }
  } else if (interaction.isButton()) {
    const [action, subAction, requesterId] = interaction.customId.split('_');

    if (action === 'raid') {
      try {
        await handleRaidButton(interaction, subAction, requesterId);
      } catch (error) {
        console.error("Erro ao processar botão da raid:", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Ocorreu um erro ao processar sua ação.', ephemeral: true }).catch(() => {});
        }
      }
    }
  } else if (interaction.isStringSelectMenu()) {
      const [action, subAction, requesterId] = interaction.customId.split('_');
      if (action === 'raid' && subAction === 'kick') {
          await handleRaidKick(interaction, requesterId);
      }
  }
});

async function handleRaidButton(interaction, subAction, requesterId) {
    const raidMessage = interaction.message;
    const interactor = interaction.user;
    const isLeader = interactor.id === requesterId;

    let thread = raidMessage.thread;
    let originalRaidMessage = raidMessage;

    // If interaction is from within the thread, the original message is not `interaction.message`
    if (interaction.channel.isThread()) {
        thread = interaction.channel;
        originalRaidMessage = await thread.parent.messages.fetch(thread.id);
    }
    
    const raidEmbed = originalRaidMessage.embeds[0];
    const raidRequester = await client.users.fetch(requesterId);
    
    // --- LEADER ACTIONS ---
    if (isLeader) {
        if (subAction === 'start') {
            await thread.send(`Atenção, equipe! A raid foi iniciada pelo líder!`);
            const members = await thread.members.fetch();
            const helpers = members.filter(m => !m.user.bot && m.id !== requesterId);
            if(helpers.size > 0) {
                 await thread.send(`Obrigado a todos que ajudaram: ${helpers.map(m => `<@${m.id}>`).join(' ')}. Vocês são pessoas incríveis!`);
            }
            await originalRaidMessage.delete();
            await thread.setLocked(true);
            await thread.setArchived(true);
            return;
        }

        if (subAction === 'kick_menu') {
             const members = await thread.members.fetch();
             const memberOptions = members
                .filter(m => !m.user.bot && m.id !== requesterId)
                .map(member => ({
                    label: member.user.username,
                    value: member.id,
                    description: `Expulsar ${member.user.username} da raid.`
                }));

            if(memberOptions.length === 0){
                return await interaction.reply({ content: 'Não há membros para expulsar.', ephemeral: true });
            }

            const selectMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`raid_kick_${requesterId}`)
                    .setPlaceholder('Selecione um membro para expulsar')
                    .addOptions(memberOptions)
            );
            return await interaction.reply({ content: 'Quem você gostaria de expulsar?', components: [selectMenu], ephemeral: true });
        }
        
        if (subAction === 'close') {
            const members = await thread.members.fetch();
            const membersToMention = members.filter(m => !m.user.bot).map(m => `<@${m.id}>`).join(' ');
            
            await interaction.deferUpdate();
            await thread.send(`O líder fechou a Raid. ${membersToMention}`);
            if (members.size > 1) {
                await thread.send(`Agradeço a preocupação de todos.`);
            }
            await thread.send(`Fechando...`);
            
            await originalRaidMessage.delete();
            await thread.delete();
            return;
        }
    }
    
    // --- MEMBER ACTIONS ---
    if (subAction === 'leave') {
        if (isLeader) {
            return await interaction.reply({ content: 'O líder não pode sair da própria raid, apenas fechá-la.', ephemeral: true });
        }
        
        await interaction.deferUpdate();
        await thread.send(`${interactor} saiu da equipe da raid.`);
        await thread.members.remove(interactor.id);
        
        // Update embed
        const membersField = raidEmbed.fields.find(f => f.name === 'Membros na Equipe');
        let [currentMembers, maxMembers] = membersField.value.split('/').map(Number);
        currentMembers--;
        
        const newEmbed = EmbedBuilder.from(raidEmbed).setFields({ name: 'Membros na Equipe', value: `${currentMembers}/${maxMembers}`, inline: true });
        const originalRow = ActionRowBuilder.from(originalRaidMessage.components[0]);
        originalRow.components.find(c => c.customId && c.customId.startsWith('raid_join')).setDisabled(false).setLabel('Juntar-se à Raid');
        await originalRaidMessage.edit({ embeds: [newEmbed], components: [originalRow] });
        
        return;
    }


    // --- JOIN ACTION ---
    if (subAction === 'join') {
         if (!thread) {
            thread = await originalRaidMessage.startThread({
                name: `Raid de ${raidRequester.username}`,
                autoArchiveDuration: 1440,
            });
            await thread.members.add(raidRequester.id);
            
            const leaderControls = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`raid_start_${requesterId}`).setLabel('✅ Iniciar Raid').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`raid_kick_menu_${requesterId}`).setLabel('❌ Expulsar Membro').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId(`raid_close_${requesterId}`).setLabel('🔒 Fechar Raid').setStyle(ButtonStyle.Secondary)
                );

            const memberControls = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`raid_leave_${requesterId}`).setLabel('👋 Sair da Raid').setStyle(ButtonStyle.Primary)
                );

            await thread.send({ content: `Bem-vindo, ${raidRequester}! Este é o tópico para organizar sua raid.\n\n**Controles do Líder:**`, components: [leaderControls] });
            await thread.send({ content: `**Controles de Membro:**`, components: [memberControls] });
        }

        const members = await thread.members.fetch();
        if (members.has(interactor.id)) {
            return await interaction.reply({ content: 'Você já está nesta raid!', ephemeral: true });
        }
        
        const membersField = raidEmbed.fields.find(f => f.name === 'Membros na Equipe');
        let [currentMembers, maxMembers] = membersField.value.split('/').map(Number);
        
        if (currentMembers >= 5) {
            return await interaction.reply({ content: 'Esta raid já está cheia!', ephemeral: true });
        }

        await interaction.deferUpdate();
        await thread.members.add(interactor.id);
        await thread.send(`${interactor} entrou na equipe da raid!`);
        currentMembers++;

        // Update Embed
        const newEmbed = EmbedBuilder.from(raidEmbed).setFields({ name: 'Membros na Equipe', value: `${currentMembers}/${maxMembers}`, inline: true });
        const originalRow = ActionRowBuilder.from(originalRaidMessage.components[0]);
        const joinButton = originalRow.components.find(c => c.customId && c.customId.startsWith('raid_join'));
        
        if (currentMembers >= 5) {
            joinButton.setDisabled(true).setLabel('Completo');
        } else {
            joinButton.setDisabled(false).setLabel('Juntar-se à Raid');
        }
        
        await originalRaidMessage.edit({ embeds: [newEmbed], components: [originalRow] });
    }
}

async function handleRaidKick(interaction, requesterId) {
    if (interaction.user.id !== requesterId) {
        return await interaction.reply({ content: 'Apenas o líder da raid pode executar esta ação.', ephemeral: true });
    }
    const memberToKickId = interaction.values[0];
    const thread = interaction.channel;
    const leader = interaction.user;
    
    try {
        const kickedUser = await client.users.fetch(memberToKickId);
        
        await thread.members.remove(memberToKickId);
        await interaction.update({ content: `${kickedUser.username} foi expulso da raid pelo líder.`, components: [] });
        await thread.send(`O líder expulsou ${kickedUser}.`);
        
        // Send DM to kicked user
        try {
            await kickedUser.send(`Perdão 🥺💔! ${leader.username}, o líder da raid, tinha outros planos. Boa sorte na próxima 🙌!`);
        } catch (dmError) {
            console.error(`Não foi possível enviar DM para ${kickedUser.username}. Eles podem ter DMs desabilitadas.`);
            thread.send(`(Não foi possível notificar ${kickedUser} por DM.)`);
        }
        
        // Update original embed
        const originalRaidMessage = await thread.parent.messages.fetch(thread.id);
        if (originalRaidMessage) {
            const raidEmbed = originalRaidMessage.embeds[0];
            const membersField = raidEmbed.fields.find(f => f.name === 'Membros na Equipe');
            let [currentMembers, maxMembers] = membersField.value.split('/').map(Number);
            currentMembers--;
            
            const newEmbed = EmbedBuilder.from(raidEmbed).setFields({ name: 'Membros na Equipe', value: `${currentMembers}/${maxMembers}`, inline: true });
            const originalRow = ActionRowBuilder.from(originalRaidMessage.components[0]);
            originalRow.components.find(c => c.customId && c.customId.startsWith('raid_join')).setDisabled(false).setLabel('Juntar-se à Raid');
            await originalRaidMessage.edit({ embeds: [newEmbed], components: [originalRow] });
        }

    } catch(err) {
        console.error("Erro ao expulsar membro:", err);
        await interaction.followUp({ content: 'Não foi possível expulsar o membro.', ephemeral: true });
    }
}


client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.mentions.has(client.user.id)) {
    return;
  }

  const pergunta = message.content.replace(/<@!?\d+>/, '').trim();

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

    const categoryCompletion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: pergunta }
      ],
      max_tokens: 10,
    });
    
    const categoria = categoryCompletion.choices[0].message.content.toLowerCase().trim();
    
    let feedbackMessage = "Digitando...";
    if (categoria.includes('pergunta')) {
        feedbackMessage = "Pensando...🤔💡";
    } else if (categoria.includes('pedido')) {
        feedbackMessage = "Pensando no seu caso...🤔💡";
    } else if (categoria.includes('conversa')) {
        feedbackMessage = "Digitando nessa bagaça...";
    }

    const feedbackMsg = await message.channel.send(feedbackMessage);
    
    const mainCompletion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: pergunta }]
    });

    const resposta = mainCompletion.choices[0].message.content;
    await feedbackMsg.delete();
    await message.reply(resposta.slice(0, 2000));
  } catch (err) {
    console.error("Erro ao responder menção:", err);
    await message.reply('Desculpe, ocorreu um erro ao tentar responder.');
  }
});

client.login(process.env.DISCORD_TOKEN);

    