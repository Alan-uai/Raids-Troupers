# Discord Raid & GPT Bot

Este é um bot para Discord criado para anunciar raids de jogos e interagir com usuários usando a API da OpenAI.

## Configuração

1.  **Instale as dependências:**
    ```bash
    npm install
    ```

2.  **Configure as variáveis de ambiente:**
    - Renomeie o arquivo `.env.example` para `.env`.
    - Preencha as variáveis com suas chaves e IDs do Discord e OpenAI.

3.  **Registre os Comandos:**
    - Antes de iniciar o bot pela primeira vez, você precisa registrar os slash commands no seu servidor do Discord.
    ```bash
    npm run deploy
    ```

4.  **Inicie o Bot:**
    ```bash
    npm start
    ```

## Comandos

-   `/raid <nivel> <dificuldade> [roblox_user_id]` - Anuncia uma nova raid no canal designado.
-   `/cap <mensagem>` - Inicia uma conversa com o assistente de IA (GPT).
