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

// Adicionando manualmente para garantir a ordem ou apenas para listar
const commandFileNames = [
    'raid.js',
    'classes.js',
    'escolher_classe.js',
    'loja.js',
    'comprar.js',
    'inventario.js',
    'equipar.js',
    'iniciar_leilao.js',
    'dar_lance.js',
    'missoes.js',
    'cla_criar.js',
    'cla_convidar.js',
    'cla_aceitar.js',
    'cla_sair.js',
    'cla_info.js',
    'cla_expulsar.js'
];

for (const file of commandFileNames) {
    const filePath = path.join(commandsPath, file);
    if (fs.existsSync(filePath)) {
        try {
            const commandModule = await import(filePath);
            const command = commandModule.default;
            if (command && 'data' in command) {
                commands.push(command.data.toJSON());
            } else {
                console.log(`[AVISO] O comando em ${filePath} está faltando a propriedade "data".`);
            }
        } catch (error) {
            console.error(`Erro ao carregar o comando de ${filePath}:`, error);
        }
    } else {
        console.log(`[AVISO] O arquivo de comando ${file} não foi encontrado.`);
    }
}


const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`🔁 Atualizando ${commands.length} comandos Slash (/).`);

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ ${data.length} comandos Slash (/) registrados com sucesso.`);
    } catch (error) {
        console.error(error);
    }
})();
