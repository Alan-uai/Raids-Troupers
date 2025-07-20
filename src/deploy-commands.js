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
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Apenas importa a propriedade 'data' para evitar carregar dependências pesadas
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        // Carrega o módulo dinamicamente
        const commandModule = await import(filePath);
        const command = commandModule.default;
        
        // Verifica se a propriedade 'data' existe antes de adicioná-la
        if (command && 'data' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[AVISO] O comando em ${filePath} está faltando a propriedade "data" ou está malformado.`);
        }
    } catch (error) {
        console.error(`Erro ao carregar os dados do comando de ${filePath}:`, error);
    }
}


const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`🔁 Atualizando ${commands.length} comandos Slash (/).`);

        // Verifica se há comandos para registrar
        if (commands.length === 0) {
            console.log('Nenhum comando encontrado para registrar.');
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
