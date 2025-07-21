// src/items.js
// Arquivo centralizado para todos os itens do jogo.

export const rarities = {
  MAIS_QUE_COMUM: 'Mais que Comum',
  COMUM: 'Comum',
  INCOMUM: 'Incomum',
  RARO: 'Raro',
  MAIS_QUE_RARO: 'Mais que Raro',
  ULTRA_RARO: 'Ultra Raro',
  MENOS_QUE_LENDARIO: 'Menos que Lendário',
  LENDARIO: 'Lendário',
  MAIS_QUE_LENDARIO: 'Mais que Lendário',
  ULTRA_LENDARIO: 'Ultra Lendário',
  MENOS_QUE_MISTICO: 'Menos que Místico',
  MISTICO: 'Místico',
  MAIS_QUE_MISTICO: 'Mais que Místico',
  ULTRA_MISTICO: 'Ultra Místico',
  MAIS_QUE_ULTRA_MISTICO: 'Mais que Ultra Místico',
  KARDEC: 'Kardec'
};

const createItems = (rarity, count, itemType, descriptions) => {
    const items = [];
    for (let i = 1; i <= count; i++) {
        const { name, desc } = descriptions[i-1];
        items.push({
            id: `${rarity.toLowerCase().replace(/ /g, '_')}_${itemType}_${i}`,
            name,
            description: desc,
            rarity: rarities[rarity.toUpperCase().replace(/ /g, '_')],
            type: itemType,
            source: 'mission'
        });
    }
    return items;
};

// Templates for item names and descriptions
const gearTemplates = {
    arma: ["Lâmina", "Adaga", "Espada", "Machado", "Maça", "Cajado", "Arco", "Besta", "Pistola", "Canhão"],
    capacete: ["Elmo", "Capacete", "Tiara", "Coroa", "Chapéu", "Gorro", "Capuz", "Máscara"],
    luva: ["Manoplas", "Luvas", "Braçadeiras"],
    bota: ["Grevas", "Botas", "Sapatos", "Coturnos"],
    casaco: ["Peitoral", "Armadura", "Manto", "Casaco", "Robe", "Couraça"],
    cinto: ["Cinto", "Faixa", "Cinturão"],
    colar: ["Amuleto", "Colar", "Gargantilha"],
    minisaia: ["Kilt", "Saia", "Tanga de Batalha"]
};

const cosmeticTemplates = {
    fundo: ["Paisagem", "Cenário", "Vista", "Plano de Fundo"],
    borda_avatar: ["Aura", "Moldura", "Borda", "Círculo"],
    titulo: ["Título", "Epíteto", "Alcunha", "Denominação"]
};

const adjectives = ["Esquecido", "Brilhante", "Sombrio", "Antigo", "Místico", "Celestial", "Infernal", "Arcano", "Rúnico", "Quebrado", "Reforjado", "Sagrado", "Profano", "Glacial", "Vulcânico", "Etéreo", "Fantasma", "Dourado", "Prateado", "Obsidiana", "Tempestade", "Sussurrante"];
const places = ["da Perdição", "de Valhalla", "do Abismo", "da Aurora", "do Crepúsculo", "de Atlântida", "do Vazio", "da Coragem", "do Desespero", "da Esperança"];
const concepts = ["da Alma", "do Tempo", "do Espaço", "da Morte", "da Vida", "do Destino", "da Loucura", "da Sabedoria", "do Poder"];

function generateRandomName(base) {
    return `${base} ${adjectives[Math.floor(Math.random() * adjectives.length)]} ${places[Math.floor(Math.random() * places.length)]}`;
}
function generateRandomDesc(name) {
    return `Um item lendário conhecido como ${name}, imbuído com o poder ${concepts[Math.floor(Math.random() * concepts.length)]}.`;
}

// Generate 25 gear + 25 cosmetic items for each rarity
const allGeneratedItems = [];

Object.values(rarities).forEach(rarityName => {
    if (rarityName === rarities.KARDEC) return;

    // 25 Gear Items
    for (let i = 0; i < 25; i++) {
        const gearTypeKeys = Object.keys(gearTemplates);
        const randomType = gearTypeKeys[Math.floor(Math.random() * gearTypeKeys.length)];
        const randomBase = gearTemplates[randomType][Math.floor(Math.random() * gearTemplates[randomType].length)];
        const name = generateRandomName(randomBase);
        allGeneratedItems.push({
            id: `${rarityName.toLowerCase().replace(/ /g, '_')}_gear_${i}`,
            name: name,
            description: generateRandomDesc(name),
            type: randomType,
            rarity: rarityName,
            source: 'mission'
        });
    }

    // 25 Cosmetic Items
    for (let i = 0; i < 25; i++) {
        const cosmeticTypeKeys = Object.keys(cosmeticTemplates);
        const randomType = cosmeticTypeKeys[Math.floor(Math.random() * cosmeticTypeKeys.length)];
        const randomBase = cosmeticTemplates[randomType][Math.floor(Math.random() * cosmeticTemplates[randomType].length)];
        const name = generateRandomName(randomBase);
        allGeneratedItems.push({
            id: `${rarityName.toLowerCase().replace(/ /g, '_')}_cosmetic_${i}`,
            name: name,
            description: generateRandomDesc(name),
            type: randomType,
            url: randomType === 'titulo' ? null : 'https://i.pinimg.com/originals/3a/0c/a6/3a0ca6840b784a3d6d53205763261a29.gif', // Placeholder URL
            rarity: rarityName,
            source: 'mission'
        });
    }
});


export const allItems = [
  // =================================
  // ===== Itens da Loja Principal =====
  // =================================
  {
    id: 'fundo_neon',
    name: 'Fundo Neon City',
    description: 'Um fundo animado e vibrante de uma cidade à noite.',
    price: 500,
    url: 'https://i.pinimg.com/originals/b5/a4/6c/b5a46c3b583f819ed9551a37c446538b.gif',
    type: 'background',
    rarity: rarities.COMUM,
    source: 'shop'
  },
  {
    id: 'fundo_floresta',
    name: 'Fundo Floresta Mística',
    description: 'Uma floresta encantada com luzes místicas.',
    price: 500,
    url: 'https://i.pinimg.com/originals/ef/d6/1f/efd61f1f505e6e85744837a7605d33a1.gif',
    type: 'background',
    rarity: rarities.COMUM,
    source: 'shop'
  },
  {
    id: 'fundo_espaco',
    name: 'Fundo Espaço Sideral',
    description: 'Viaje pelo cosmos com esta visão galáctica.',
    price: 750,
    url: 'https://i.pinimg.com/originals/a0/a7/92/a0a792c636f1cda8b1a4577889f41f4f.gif',
    type: 'background',
    rarity: rarities.INCOMUM,
    source: 'shop'
  },
  
  // =================================
  // ====== Itens Raros (Leilão) =======
  // =================================
  {
    id: 'fundo_lendario_dragao',
    name: 'Fundo Lendário: Covil do Dragão',
    description: 'Um fundo lendário mostrando o covil de um dragão majestoso.',
    min_bid: 2000,
    url: 'https://i.pinimg.com/originals/7b/25/f8/7b25f8b9e671f5407d7fb0f88219c8f2.gif',
    type: 'background',
    rarity: rarities.LENDARIO,
    source: 'auction'
  },
  {
    id: 'borda_avatar_fogo',
    name: 'Borda de Avatar: Chamas Eternas',
    description: 'Uma borda de avatar animada com chamas que nunca se apagam.',
    min_bid: 1500,
    url: 'https://i.pinimg.com/originals/a4/1c/b3/a41cb3325a756b14f856429f5f68b356.gif',
    type: 'avatar_border',
    rarity: rarities.RARO,
    source: 'auction'
  },
  {
    id: 'titulo_pioneiro',
    name: 'Título: Pioneiro da Tropa',
    description: 'Um título para aqueles que estiveram aqui desde o começo.',
    min_bid: 1000,
    url: null,
    type: 'title',
    rarity: rarities.MAIS_QUE_RARO,
    source: 'auction'
  },

  // =================================
  // ===== Itens de Raridade Kardec ====
  // =================================
  { id: 'kardec_luva', name: 'Luvas do Vazio de Kardec', description: 'Canalizam o poder do nada absoluto.', type: 'luva', rarity: rarities.KARDEC, source: 'mission' },
  { id: 'kardec_coroa', name: 'Coroa da Onisciência de Kardec', description: 'Concede vislumbres de todas as realidades.', type: 'capacete', rarity: rarities.KARDEC, source: 'mission' },
  { id: 'kardec_casaco', name: 'Sobretudo das Sombras de Kardec', description: 'Tecido com a própria escuridão entre as estrelas.', type: 'casaco', rarity: rarities.KARDEC, source: 'mission' },
  { id: 'kardec_cinto', name: 'Fivela da Singularidade de Kardec', description: 'Dobra o espaço e o tempo ao seu redor.', type: 'cinto', rarity: rarities.KARDEC, source: 'mission' },
  { id: 'kardec_bota', name: 'Botas do Caminhante de Kardec', description: 'Pisam em todos os caminhos e em nenhum.', type: 'bota', rarity: rarities.KARDEC, source: 'mission' },
  { id: 'kardec_calca', name: 'Calça Cargo do Paradoxo de Kardec', description: 'Seus bolsos contêm infinitos universos.', type: 'minisaia', rarity: rarities.KARDEC, source: 'mission' }, // Usando minisaia como tipo base para calças
  // Cosméticos Kardec
  { id: 'kardec_fundo', name: 'Fundo: Coração do Abismo', description: 'Um gradiente sangrento e pulsante.', url: 'https://i.pinimg.com/originals/85/4c/3b/854c3b75a661614b876a4b8f36214578.gif', type: 'background', rarity: rarities.KARDEC, source: 'mission' },
  { id: 'kardec_titulo', name: 'Título: A Entidade', description: 'Sua presença transcende a compreensão mortal.', url: null, type: 'title', rarity: rarities.KARDEC, source: 'mission' },
  { id: 'kardec_borda', name: 'Borda: Fúria Neon', description: 'Uma borda rosa choque que grita poder.', url: 'https://i.pinimg.com/originals/c9/1a/87/c91a87265e337198a287a176839441d8.gif', type: 'avatar_border', rarity: rarities.KARDEC, source: 'mission' },
  
  // =================================
  // ===== Recompensas de Missão (Geradas) =====
  // =================================
  ...allGeneratedItems
];
