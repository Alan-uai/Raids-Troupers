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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, 'commands');

// Read only .js files that are not .data.js files
const commandFiles = fs.readdirSync(commandsPath).filter(file => 
    file.endsWith('.js') && !file.endsWith('.data.js')
);

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const dataFilePath = path.join(commandsPath, file.replace('.js', '.data.js'));
    let commandData = null;

    try {
        // Try to load from .data.js first if it exists
        if (fs.existsSync(dataFilePath)) {
            const dataModule = await import(dataFilePath);
            commandData = dataModule.data;
        } else {
            // Otherwise, load from the main .js file
            const commandModule = await import(filePath);
            commandData = commandModule.data || (commandModule.default && commandModule.default.data);
        }
        
        if (commandData) {
            commands.push(commandData.toJSON());
        } else {
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
