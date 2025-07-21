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

const rarityOrder = Object.values(rarities);

const gearTypes = {
    cabeça: { base: ["Elmo", "Capacete", "Tiara", "Coroa", "Chapéu", "Gorro", "Capuz", "Máscara"], bonusMultiplier: 1.2 },
    tronco: { base: ["Peitoral", "Armadura", "Manto", "Casaco", "Robe", "Couraça"], bonusMultiplier: 1.8 },
    mãos: { base: ["Manoplas", "Luvas", "Braçadeiras"], bonusMultiplier: 1.1 },
    cintura: { base: ["Cinto", "Faixa", "Cinturão"], bonusMultiplier: 1.0 },
    pernas: { base: ["Grevas de Perna", "Kilt de Batalha", "Calças Reforçadas"], bonusMultiplier: 1.5 },
    pés: { base: ["Grevas", "Botas", "Sapatos", "Coturnos"], bonusMultiplier: 1.1 },
    pescoço: { base: ["Amuleto", "Colar", "Gargantilha", "Pingente"], bonusMultiplier: 1.3 },
    arma: { base: ["Lâmina", "Adaga", "Espada", "Machado", "Maça", "Cajado", "Arco", "Besta", "Pistola", "Canhão", "Escudo"], bonusMultiplier: 2.0 }
};

const cosmeticTypes = {
    fundo: ["Paisagem", "Cenário", "Vista", "Plano de Fundo"],
    borda_avatar: ["Aura", "Moldura", "Borda", "Círculo"],
    titulo: ["Título", "Epíteto", "Alcunha", "Denominação"]
};

const adjectives = ["Esquecido", "Brilhante", "Sombrio", "Antigo", "Místico", "Celestial", "Infernal", "Arcano", "Rúnico", "Quebrado", "Reforjado", "Sagrado", "Profano", "Glacial", "Vulcânico", "Etéreo", "Fantasma", "Dourado", "Prateado", "Obsidiana", "Tempestade", "Sussurrante"];
const places = ["da Perdição", "de Valhalla", "do Abismo", "da Aurora", "do Crepúsculo", "de Atlântida", "do Vazio", "da Coragem", "do Desespero", "da Esperança"];
const concepts = ["da Alma", "do Tempo", "do Espaço", "da Morte", "da Vida", "do Destino", "da Loucura", "da Sabedoria", "do Poder"];

function generateRandomName(base) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const place = places[Math.floor(Math.random() * places.length)];
    return `${base} ${adj} ${place}`;
}
function generateRandomDesc(name) {
    const concept = concepts[Math.floor(Math.random() * concepts.length)];
    return `Um item lendário conhecido como ${name}, imbuído com o poder ${concept}.`;
}

// Generate items procedurally
const allGeneratedItems = [];
const standardRarities = rarityOrder.filter(r => r !== rarities.KARDEC);

standardRarities.forEach((rarityName, rarityIndex) => {
    // Generate Gear Items
    for (const typeKey in gearTypes) {
        const typeInfo = gearTypes[typeKey];
        for (let i = 0; i < 25; i++) {
            const baseName = typeInfo.base[Math.floor(Math.random() * typeInfo.base.length)];
            const fullName = generateRandomName(baseName);
            
            // Calculate rarity base bonus
            const rarityBaseBonus = 0.333333333 + ((5 - 0.333333333) / (standardRarities.length - 1)) * rarityIndex;
            const finalBonus = parseFloat((rarityBaseBonus * typeInfo.bonusMultiplier).toFixed(2));

            allGeneratedItems.push({
                id: `${rarityName.toLowerCase().replace(/ /g, '_')}_${typeKey}_${i}`,
                name: fullName,
                description: generateRandomDesc(fullName),
                type: typeKey,
                rarity: rarityName,
                source: 'mission',
                bonus: finalBonus
            });
        }
    }
    
    // Generate Cosmetic Items
    for (const typeKey in cosmeticTypes) {
        const typeInfo = cosmeticTypes[typeKey];
        for (let i = 0; i < 25; i++) {
             const baseName = typeInfo[Math.floor(Math.random() * typeInfo.length)];
             const fullName = generateRandomName(baseName);
             allGeneratedItems.push({
                id: `${rarityName.toLowerCase().replace(/ /g, '_')}_${typeKey}_${i}`,
                name: fullName,
                description: generateRandomDesc(fullName),
                type: typeKey,
                url: typeKey === 'titulo' ? null : 'https://i.pinimg.com/originals/3a/0c/a6/3a0ca6840b784a3d6d53205763261a29.gif', // Placeholder URL
                rarity: rarityName,
                source: 'mission'
            });
        }
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
    type: 'fundo',
    rarity: rarities.COMUM,
    source: 'shop'
  },
  {
    id: 'fundo_floresta',
    name: 'Fundo Floresta Mística',
    description: 'Uma floresta encantada com luzes místicas.',
    price: 500,
    url: 'https://i.pinimg.com/originals/ef/d6/1f/efd61f1f505e6e85744837a7605d33a1.gif',
    type: 'fundo',
    rarity: rarities.COMUM,
    source: 'shop'
  },
  {
    id: 'fundo_espaco',
    name: 'Fundo Espaço Sideral',
    description: 'Viaje pelo cosmos com esta visão galáctica.',
    price: 750,
    url: 'https://i.pinimg.com/originals/a0/a7/92/a0a792c636f1cda8b1a4577889f41f4f.gif',
    type: 'fundo',
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
    type: 'fundo',
    rarity: rarities.LENDARIO,
    source: 'auction'
  },
  {
    id: 'borda_avatar_fogo',
    name: 'Borda de Avatar: Chamas Eternas',
    description: 'Uma borda de avatar animada com chamas que nunca se apagam.',
    min_bid: 1500,
    url: 'https://i.pinimg.com/originals/a4/1c/b3/a41cb3325a756b14f856429f5f68b356.gif',
    type: 'borda_avatar',
    rarity: rarities.RARO,
    source: 'auction'
  },
  {
    id: 'titulo_pioneiro',
    name: 'Título: Pioneiro da Tropa',
    description: 'Um título para aqueles que estiveram aqui desde o começo.',
    min_bid: 1000,
    url: null,
    type: 'titulo',
    rarity: rarities.MAIS_QUE_RARO,
    source: 'auction'
  },

  // =================================
  // ===== Itens de Raridade Kardec ====
  // =================================
  { id: 'kardec_mãos', name: 'Luvas do Vazio de Kardec', description: 'Canalizam o poder do nada absoluto.', type: 'mãos', rarity: rarities.KARDEC, source: 'mission', bonus: 10 },
  { id: 'kardec_cabeça', name: 'Coroa da Onisciência de Kardec', description: 'Concede vislumbres de todas as realidades.', type: 'cabeça', rarity: rarities.KARDEC, source: 'mission', bonus: 10 },
  { id: 'kardec_tronco', name: 'Sobretudo das Sombras de Kardec', description: 'Tecido com a própria escuridão entre as estrelas.', type: 'tronco', rarity: rarities.KARDEC, source: 'mission', bonus: 10 },
  { id: 'kardec_cintura', name: 'Fivela da Singularidade de Kardec', description: 'Dobra o espaço e o tempo ao seu redor.', type: 'cintura', rarity: rarities.KARDEC, source: 'mission', bonus: 10 },
  { id: 'kardec_pés', name: 'Botas do Caminhante de Kardec', description: 'Pisam em todos os caminhos e em nenhum.', type: 'pés', rarity: rarities.KARDEC, source: 'mission', bonus: 10 },
  { id: 'kardec_pernas', name: 'Calça Cargo do Paradoxo de Kardec', description: 'Seus bolsos contêm infinitos universos.', type: 'pernas', rarity: rarities.KARDEC, source: 'mission', bonus: 10 },
  { id: 'kardec_arma', name: 'Fragmento da Realidade de Kardec', description: 'Uma arma que reescreve as leis da física.', type: 'arma', rarity: rarities.KARDEC, source: 'mission', bonus: 10 },
  { id: 'kardec_pescoço', name: 'Olho de Kardec', description: 'Vê tudo, entende tudo, destrói tudo.', type: 'pescoço', rarity: rarities.KARDEC, source: 'mission', bonus: 10 },
  // Cosméticos Kardec
  { id: 'kardec_fundo', name: 'Fundo: Coração do Abismo', description: 'Um gradiente sangrento e pulsante.', url: 'https://i.pinimg.com/originals/85/4c/3b/854c3b75a661614b876a4b8f36214578.gif', type: 'fundo', rarity: rarities.KARDEC, source: 'mission' },
  { id: 'kardec_titulo', name: 'Título: A Entidade', description: 'Sua presença transcende a compreensão mortal.', url: null, type: 'titulo', rarity: rarities.KARDEC, source: 'mission' },
  { id: 'kardec_borda', name: 'Borda: Fúria Neon', description: 'Uma borda rosa choque que grita poder.', url: 'https://i.pinimg.com/originals/c9/1a/87/c91a87265e337198a287a176839441d8.gif', type: 'borda_avatar', rarity: rarities.KARDEC, source: 'mission' },
  
  // =================================
  // ===== Recompensas de Missão (Geradas) =====
  // =================================
  ...allGeneratedItems
];

// Helper para verificar se um item é cosmético
export function isCosmetic(item) {
    return ['fundo', 'borda_avatar', 'titulo'].includes(item.type);
}

// Helper para verificar se um item é de equipamento
export function isGear(item) {
     return Object.keys(gearTypes).includes(item.type);
}
