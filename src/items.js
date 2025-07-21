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

const missionItem = (id, name, description, rarity) => ({
    id, name, description, rarity, type: 'gear', source: 'mission'
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
  // ===== Recompensas de Missão =====
  // =================================

  // Mais que Comum
  missionItem('mqc_anel_simples', 'Anel Simples', 'Um anel simples, sem propriedades especiais.', rarities.MAIS_QUE_COMUM),
  missionItem('mqc_pocao_fraca', 'Poção Fraca', 'Recupera uma pequena quantidade de vida.', rarities.MAIS_QUE_COMUM),
  ...Array.from({ length: 23 }, (_, i) => missionItem(`mqc_item_${i+1}`, `Bugiganga Comum ${i+1}`, 'Um item mais que comum, encontrado facilmente.', rarities.MAIS_QUE_COMUM)),

  // Comum
  missionItem('com_espada_comum', 'Espada Comum', 'Uma espada básica, porém confiável.', rarities.COMUM),
  missionItem('com_escudo_madeira', 'Escudo de Madeira', 'Oferece proteção mínima.', rarities.COMUM),
  missionItem('com_botas_couro', 'Botas de Couro', 'Botas de couro padrão.', rarities.COMUM),
  ...Array.from({ length: 22 }, (_, i) => missionItem(`com_item_${i+1}`, `Tranqueira Comum ${i+1}`, 'Um item comum, mas útil.', rarities.COMUM)),

  // Incomum
  missionItem('inc_adaga_ferro', 'Adaga de Ferro', 'Uma adaga de ferro, melhor que nada.', rarities.INCOMUM),
  ...Array.from({ length: 24 }, (_, i) => missionItem(`inc_item_${i+1}`, `Artefato Incomum ${i+1}`, 'Um item incomum com certo potencial.', rarities.INCOMUM)),

  // Raro
  missionItem('rar_elmo_aco', 'Elmo de Aço', 'Um elmo de aço resistente.', rarities.RARO),
  ...Array.from({ length: 24 }, (_, i) => missionItem(`rar_item_${i+1}`, `Relíquia Rara ${i+1}`, 'Um item raro, difícil de encontrar.', rarities.RARO)),

  // Mais que Raro
  missionItem('mqr_peitoral_runico', 'Peitoral Rúnico', 'Um peitoral com runas de proteção.', rarities.MAIS_QUE_RARO),
  ...Array.from({ length: 24 }, (_, i) => missionItem(`mqr_item_${i+1}`, `Tesouro Raro ${i+1}`, 'Um item notavelmente raro e valioso.', rarities.MAIS_QUE_RARO)),

  // Ultra Raro
  missionItem('ulr_grevas_velocidade', 'Grevas da Velocidade', 'Aumenta a velocidade de movimento.', rarities.ULTRA_RARO),
  ...Array.from({ length: 24 }, (_, i) => missionItem(`ulr_item_${i+1}`, `Joia Ultra Rara ${i+1}`, 'Um item de raridade excepcional.', rarities.ULTRA_RARO)),

  // Menos que Lendário
  missionItem('mql_amuleto_pre_lendario', 'Amuleto Pré-Lendário', 'Um amuleto de grande poder.', rarities.MENOS_QUE_LENDARIO),
  ...Array.from({ length: 24 }, (_, i) => missionItem(`mql_item_${i+1}`, `Fragmento Lendário ${i+1}`, 'Um item que beira a lenda.', rarities.MENOS_QUE_LENDARIO)),

  // Lendário
  missionItem('len_espada_excalibur', 'Espada Excalibur', 'A lendária espada do poder.', rarities.LENDARIO),
  ...Array.from({ length: 24 }, (_, i) => missionItem(`len_item_${i+1}`, `Herança Lendária ${i+1}`, 'Um item digno de lendas.', rarities.LENDARIO)),

  // Mais que Lendário
  missionItem('mql2_coroa_sol', 'Coroa do Sol', 'Uma coroa que brilha como o sol.', rarities.MAIS_QUE_LENDARIO),
  ...Array.from({ length: 24 }, (_, i) => missionItem(`mql2_item_${i+1}`, `Dádiva Lendária ${i+1}`, 'Um item que supera as lendas.', rarities.MAIS_QUE_LENDARIO)),

  // Ultra Lendário
  missionItem('ull_armadura_celestial', 'Armadura Celestial', 'Forjada nas estrelas.', rarities.ULTRA_LENDARIO),
  ...Array.from({ length: 24 }, (_, i) => missionItem(`ull_item_${i+1}`, `Epopeia Lendária ${i+1}`, 'Um item de poderio ultra lendário.', rarities.ULTRA_LENDARIO)),

  // Menos que Místico
  missionItem('mqm_essencia_mistica', 'Essência Mística', 'Um frasco com pura magia.', rarities.MENOS_QUE_MISTICO),
  ...Array.from({ length: 24 }, (_, i) => missionItem(`mqm_item_${i+1}`, `Sussurro Místico ${i+1}`, 'Um item que prenuncia o poder místico.', rarities.MENOS_QUE_MISTICO)),

  // Místico
  missionItem('mis_cajado_arcanjo', 'Cajado do Arcanjo', 'Um cajado com poder divino.', rarities.MISTICO),
  ...Array.from({ length: 24 }, (_, i) => missionItem(`mis_item_${i+1}`, `Manifestação Mística ${i+1}`, 'Um item de pura essência mística.', rarities.MISTICO)),

  // Mais que Místico
  missionItem('mqm2_manto_infinito', 'Manto do Infinito', 'Um manto tecido com o próprio tempo.', rarities.MAIS_QUE_MISTICO),
  ...Array.from({ length: 24 }, (_, i) => missionItem(`mqm2_item_${i+1}`, `Paradoxo Místico ${i+1}`, 'Um item que transcende a magia conhecida.', rarities.MAIS_QUE_MISTICO)),

  // Ultra Místico
  missionItem('ulm_olho_realidade', 'O Olho da Realidade', 'Permite ver além do véu.', rarities.ULTRA_MISTICO),
  ...Array.from({ length: 24 }, (_, i) => missionItem(`ulm_item_${i+1}`, `Singularidade Mística ${i+1}`, 'Um item de poder quase absoluto.', rarities.ULTRA_MISTICO)),
  
  // Mais que Ultra Místico
  missionItem('mqum_fragmento_criacao', 'Fragmento da Criação', 'Um pedaço do universo primordial.', rarities.MAIS_QUE_ULTRA_MISTICO),
  ...Array.from({ length: 24 }, (_, i) => missionItem(`mqum_item_${i+1}`, `Eco do Big Bang ${i+1}`, 'Um item que ressoa com a criação.', rarities.MAIS_QUE_ULTRA_MISTICO)),

  // Kardec
  {
    id: 'aura_kardec',
    name: 'Aura de Kardec',
    description: 'A manifestação do poder absoluto. Concede um cargo exclusivo no servidor.',
    type: 'cosmetic',
    rarity: rarities.KARDEC,
    source: 'mission'
  }
];
