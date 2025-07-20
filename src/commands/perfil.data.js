import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Exibe ou cria o seu perfil de aventureiro.')
    .setDescriptionLocalizations({ "en-US": "Displays or creates your adventurer profile." })
    .addUserOption(option =>
        option.setName('usuario')
            .setDescription('O usuário cujo perfil você quer ver.')
            .setDescriptionLocalizations({ "en-US": "The user whose profile you want to see." })
            .setRequired(false));
