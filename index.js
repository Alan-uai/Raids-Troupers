import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  // Correctly format the path for dynamic import on different OS
  const command = (await import(path.resolve(filePath).replace(/\\/g, '/'))).default;
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
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'Ocorreu um erro ao executar este comando!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'Ocorreu um erro ao executar este comando!', ephemeral: true });
		}
  }
});

client.login(process.env.DISCORD_TOKEN);
