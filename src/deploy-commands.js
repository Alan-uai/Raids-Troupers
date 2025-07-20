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
    file.endsWith('.js') && !file.endsWith('.data.js') && !file.startsWith('clan_')
);

const clanCommandFiles = fs.readdirSync(commandsPath).filter(file => 
    file.endsWith('.js') && file.startsWith('clan_')
);

// Manually add the new clan commands
commandFiles.push('clan_aceitar.js');
commandFiles.push('clan_convidar.js');
commandFiles.push('clan_criar.js');
commandFiles.push('clan_expulsar.js');
commandFiles.push('clan_info.js');
commandFiles.push('clan_sair.js');
commandFiles.push('clan_convocar.js');
commandFiles.push('clan_dissolver.js');

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    
    // Check if the file is a real command or a .data.js file that might be misnamed
    if (file.endsWith('.data.js')) {
        console.log(`[AVISO] Ignorando arquivo de dados: ${file}`);
        continue;
    }

    try {
        const commandModule = await import(filePath);
        // Commands defined with 'export default'
        let commandData = commandModule.default?.data;

        // If not found, check for commands defined with 'export const data'
        if (!commandData && commandModule.data) {
             commandData = commandModule.data;
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
