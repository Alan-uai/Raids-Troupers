// src/deploy-commands.js

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

// Função para ler todos os arquivos .js de um diretório recursivamente
function getAllCommandFiles(dir) {
    let files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        if (item.isDirectory()) {
            files = [...files, ...getAllCommandFiles(path.join(dir, item.name))];
        } else if (item.name.endsWith('.js')) {
            files.push(path.join(dir, item.name));
        }
    }
    return files;
}

const commandFiles = getAllCommandFiles(commandsPath);
const processedCommandNames = new Set(); // Para rastrear comandos e evitar duplicatas

for (const file of commandFiles) {
    // Extrai o nome base do comando (ex: 'equipar' de 'equipar.js' ou 'equipar.data.js')
    const baseCommandName = path.basename(file, '.js').replace('.data', '');

    if (processedCommandNames.has(baseCommandName)) {
        continue; // Já processou este comando (ou seu arquivo .data)
    }

    const dataFilePath = path.join(commandsPath, `${baseCommandName}.data.js`);
    let commandData = null;

    try {
        if (fs.existsSync(dataFilePath)) {
            // Prioriza o .data.js se ele existir
            const { data } = await import(path.resolve(dataFilePath).replace(/\\/g, '/'));
            commandData = data;
        } else if (!file.endsWith('.data.js')) {
            // Se não, carrega do arquivo de comando principal
            const commandModule = await import(path.resolve(file).replace(/\\/g, '/'));
            commandData = commandModule.data || (commandModule.default && commandModule.default.data);
        }

        if (commandData) {
            commands.push(commandData.toJSON());
            processedCommandNames.add(baseCommandName);
            console.log(`[SUCESSO] Comando "${baseCommandName}" carregado de ${file}`);
        } else if (!file.endsWith('.data.js')) {
            console.log(`[AVISO] O arquivo de comando em ${file} está faltando a propriedade "data".`);
        }
    } catch (error) {
        console.error(`[ERRO] Falha ao carregar o comando de ${file}:`, error);
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
