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
  // ===== Recompensas de Missão =====
  // =================================
  {
    id: 'espada_comum',
    name: 'Espada Comum',
    description: 'Uma espada básica, porém confiável.',
    type: 'gear', // Tipo genérico para item não equipável visualmente
    rarity: rarities.COMUM,
    source: 'mission'
  },
  {
    id: 'escudo_madeira',
    name: 'Escudo de Madeira',
    description: 'Oferece proteção mínima.',
    type: 'gear',
    rarity: rarities.COMUM,
    source: 'mission'
  },
    {
    id: 'pocao_fraca',
    name: 'Poção Fraca',
    description: 'Recupera uma pequena quantidade de vida.',
    type: 'consumable',
    rarity: rarities.MAIS_QUE_COMUM,
    source: 'mission'
  },
  {
    id: 'anel_simples',
    name: 'Anel Simples',
    description: 'Um anel simples, sem propriedades especiais.',
    type: 'gear',
    rarity: rarities.MAIS_QUE_COMUM,
    source: 'mission'
  },
  {
    id: 'botas_couro',
    name: 'Botas de Couro',
    description: 'Botas de couro padrão.',
    type: 'gear',
    rarity: rarities.COMUM,
    source: 'mission'
  },

  // Placeholder para mais itens... vou adicionar apenas alguns por categoria por enquanto.
  { id: 'adaga_ferro', name: 'Adaga de Ferro', description: 'Uma adaga de ferro.', type: 'gear', rarity: rarities.INCOMUM, source: 'mission'},
  { id: 'elmo_aco', name: 'Elmo de Aço', description: 'Um elmo de aço resistente.', type: 'gear', rarity: rarities.RARO, source: 'mission'},
  { id: 'peitoral_runico', name: 'Peitoral Rúnico', description: 'Um peitoral com runas de proteção.', type: 'gear', rarity: rarities.MAIS_QUE_RARO, source: 'mission'},
  { id: 'grevas_velocidade', name: 'Grevas da Velocidade', description: 'Aumenta a velocidade de movimento.', type: 'gear', rarity: rarities.ULTRA_RARO, source: 'mission'},
  { id: 'amuleto_pre_lendario', name: 'Amuleto Pré-Lendário', description: 'Um amuleto de grande poder.', type: 'gear', rarity: rarities.MENOS_QUE_LENDARIO, source: 'mission'},
  { id: 'espada_excalibur', name: 'Espada Excalibur', description: 'A lendária espada do poder.', type: 'gear', rarity: rarities.LENDARIO, source: 'mission'},
  { id: 'coroa_sol', name: 'Coroa do Sol', description: 'Uma coroa que brilha como o sol.', type: 'gear', rarity: rarities.MAIS_QUE_LENDARIO, source: 'mission'},
  { id: 'armadura_celestial', name: 'Armadura Celestial', description: 'Forjada nas estrelas.', type: 'gear', rarity: rarities.ULTRA_LENDARIO, source: 'mission'},
  { id: 'essencia_mistica', name: 'Essência Mística', description: 'Um frasco com pura magia.', type: 'consumable', rarity: rarities.MENOS_QUE_MISTICO, source: 'mission'},
  { id: 'cajado_arcanjo', name: 'Cajado do Arcanjo', description: 'Um cajado com poder divino.', type: 'gear', rarity: rarities.MISTICO, source: 'mission'},
  { id: 'manto_infinito', name: 'Manto do Infinito', description: 'Um manto tecido com o próprio tempo.', type: 'gear', rarity: rarities.MAIS_QUE_MISTICO, source: 'mission'},
  { id: 'olho_realidade', name: 'O Olho da Realidade', description: 'Permite ver além do véu.', type: 'gear', rarity: rarities.ULTRA_MISTICO, source: 'mission'},
  { id: 'fragmento_criacao', name: 'Fragmento da Criação', description: 'Um pedaço do universo primordial.', type: 'material', rarity: rarities.MAIS_QUE_ULTRA_MISTICO, source: 'mission'},
  {
    id: 'aura_kardec',
    name: 'Aura de Kardec',
    description: 'A manifestação do poder absoluto. Concede um cargo exclusivo no servidor.',
    type: 'cosmetic',
    rarity: rarities.KARDEC,
    source: 'mission'
  }
];

    