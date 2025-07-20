// src/deploy-commands.js

// Este script é usado para registrar/atualizar os slash commands
// do seu bot no Discord. Execute `npm run deploy` para usá-lo.

import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const commands = [];
const processedCommandNames = new Set(); // To track processed commands and avoid duplicates

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, 'commands');

// Get all .js files, including .data.js files initially
const allJsFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of allJsFiles) {
    const filePath = path.join(commandsPath, file);
    const commandName = file.replace('.js', ''); // e.g., 'equipar' or 'equipar.data'
    const baseCommandName = commandName.replace('.data', ''); // e.g., 'equipar'

    if (processedCommandNames.has(baseCommandName)) {
        // This command (or its data file) has already been processed
        continue;
    }

    const dataFilePath = path.join(commandsPath, `${baseCommandName}.data.js`);
    let commandData = null;

    try {
        if (fs.existsSync(dataFilePath)) {
            // Prioritize loading from the .data.js file if it exists
            const dataModule = await import(dataFilePath);
            commandData = dataModule.data;
        } else if (!file.endsWith('.data.js')) {
            // If no .data.js exists, and it's a regular .js file, load from it
            const commandModule = await import(filePath);
            commandData = commandModule.data || (commandModule.default && commandModule.default.data);
        }
        
        if (commandData) {
            commands.push(commandData.toJSON());
            processedCommandNames.add(baseCommandName); // Mark this command as processed
        } else if (!file.endsWith('.data.js')) { // Only warn for main command files without data
            console.log(`[AVISO] O arquivo de comando em ${filePath} está faltando a propriedade "data" ou está malformado.`);
        }
    } catch (error) {
        console.error(`[ERRO] Falha ao carregar os dados do comando de ${filePath}:`, error);
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`🔁 Atualizando ${commands.length} comandos Slash (/).`);

        if (commands.length === 0) {
            console.log('Nenhum comando válido encontrado para registrar.');
            return;
        }

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ ${data.length} comandos Slash (/) registrados com sucesso.`);
    } catch (error) {
        console.error('❌ Erro ao registrar os comandos:', error);
    }
})();
