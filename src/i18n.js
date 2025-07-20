import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localesPath = path.join(__dirname, 'locales');

const translations = new Map();

// Carrega todas as traduções na memória
async function loadTranslations() {    
    try {
        const files = await fs.readdir(localesPath);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const locale = path.basename(file, '.json');
                const data = await fs.readFile(path.join(localesPath, file), 'utf-8');
                translations.set(locale, JSON.parse(data));
            }
        }
        console.log(`Loaded translations for: ${[...translations.keys()].join(', ')}`);
    } catch(e) {
        console.error("Could not load translation files.", e);
    }
}

// Inicializa as traduções
loadTranslations();

// Função que obtém o tradutor para um usuário
export async function getTranslator(userId, userStats, forceLocale = null) {
    let locale = 'pt-BR'; // Default
    if (forceLocale) {
        locale = forceLocale;
    } else {
        const stats = userStats.get(userId);
        if (stats && stats.locale) {
            locale = stats.locale;
        }
    }

    // Simplifica o código do local (ex: 'en-US' -> 'en')
    const baseLocale = locale.split('-')[0];
    const supportedLocales = [...translations.keys()];

    // Usa o idioma base se a variação regional não for suportada
    const finalLocale = supportedLocales.includes(locale) ? locale 
                      : supportedLocales.includes(baseLocale) ? baseLocale
                      : 'pt'; // Fallback final

    const t = (key, options = {}) => {
        const langPack = translations.get(finalLocale) || translations.get('pt');
        let text = langPack[key] || key;

        // Substitui as variáveis (ex: {username})
        for (const [optionKey, value] of Object.entries(options)) {
            text = text.replace(new RegExp(`{${optionKey}}`, 'g'), String(value));
        }

        return text;
    };

    return t;
}
