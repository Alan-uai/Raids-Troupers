import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const commands = [];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Ajuste no caminho para ler a partir de 'src/commands'
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  // O caminho para importação agora precisa ser construído corretamente
  const filePath = path.join(commandsPath, file);
  // Usamos um import dinâmico para carregar o módulo
  const command = (await import(filePath)).default;
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.log(`[AVISO] O comando em ${filePath} está faltando a propriedade "data" ou "execute".`);
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🔁 Atualizando ${commands.length} comandos Slash (/).`);
    
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log(`✅ ${data.length} comandos Slash (/) registrados com sucesso.`);
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
})();
