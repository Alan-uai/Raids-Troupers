import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const commands = [];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = (await import(path.resolve(filePath).replace(/\\/g, '/'))).default;
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.log(`[AVISO] O comando em ${filePath} está faltando a propriedade "data" ou "execute".`);
    }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`Iniciada a atualização de ${commands.length} comandos de aplicativo (/).`);

        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log(`✅ ${data.length} comandos de aplicativo (/) recarregados com sucesso.`);
    } catch (error) {
        console.error(error);
    }
})();
