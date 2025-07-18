// src/scripts/register-commands.ts
import { config } from 'dotenv';
import { REST, Routes, ApplicationCommandOptionType } from 'discord.js';

config({ path: '.env' });

const commands = [
  {
    name: 'raid',
    description: 'Cria um anúncio de raid.',
    options: [
      {
        name: 'level',
        description: 'O nível da raid (ex: 200, 600, 1200)',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'dificuldade',
        description: 'A dificuldade da raid.',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
            { name: 'Fácil', value: 'fácil' },
            { name: 'Médio', value: 'médio' },
            { name: 'Difícil', value: 'difícil' },
        ],
      },
    ],
  },
];

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_SERVER_ID;

if (!token || !clientId || !guildId) {
  throw new Error('Missing Discord environment variables (TOKEN, CLIENT_ID, or SERVER_ID)');
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
