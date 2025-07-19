import { Client, GatewayIntentBits, Collection, Events, ChannelType } from 'discord.js';
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
    GatewayIntentBits.MessageContent
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
    if (!command) {
      console.error(`Comando não encontrado: ${interaction.commandName}`);
      return;
    }

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
    const [action, announcementId, requesterId, chatType] = interaction.customId.split('_');

    if (action === 'join_raid') {
        try {
            const raidMessage = interaction.message;
            const raidRequester = await client.users.fetch(requesterId);
            const joiner = interaction.user;

            const threadName = `Raid de ${raidRequester.username}`;
            
            let thread = raidMessage.thread;

            if (!thread) {
                if (raidMessage.channel.type === ChannelType.GuildText) {
                    thread = await raidMessage.startThread({
                        name: threadName,
                        autoArchiveDuration: 60,
                        reason: `Tópico para a raid de ${raidRequester.username}`,
                    });

                    await thread.members.add(raidRequester.id);
                    await thread.send(`Bem-vindo, ${raidRequester}! Este é o tópico para organizar sua raid. ${joiner} acabou de se juntar.`);
                }
            } else {
                 await thread.members.add(joiner.id);
                 await thread.send(`${joiner} entrou na equipe da raid!`);
            }
            
            if (chatType === 'voz') {
                await thread.send('Lembrete: Este é um chat de voz! Por favor, entrem em um canal de voz para coordenar.');
            }

            await interaction.reply({ content: `Você se juntou à raid! Vá para o tópico <#${thread.id}> para conversar.`, ephemeral: true });

        } catch (error) {
            console.error("Erro ao processar o botão da raid:", error);
            await interaction.reply({ content: 'Ocorreu um erro ao tentar juntar-se à raid. Verifique se tenho permissão para criar tópicos (threads).', ephemeral: true });
        }
    }
  }
});

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

    await message.channel.send(feedbackMessage);
    
    const mainCompletion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: pergunta }]
    });

    const resposta = mainCompletion.choices[0].message.content;

    await message.reply(resposta.slice(0, 2000));
  } catch (err) {
    console.error("Erro ao responder menção:", err);
    await message.reply('Desculpe, ocorreu um erro ao tentar responder.');
  }
});

client.login(process.env.DISCORD_TOKEN);
