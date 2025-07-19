// src/rare-items.js
// Este arquivo define itens raros que só podem ser obtidos via leilão ou eventos especiais.

export const rareItems = [
  {
    id: 'fundo_lendario_dragao',
    name: 'Fundo Lendário: Covil do Dragão',
    min_bid: 2000,
    url: 'https://i.pinimg.com/originals/7b/25/f8/7b25f8b9e671f5407d7fb0f88219c8f2.gif',
    type: 'background'
  },
  {
    id: 'borda_avatar_fogo',
    name: 'Borda de Avatar: Chamas Eternas',
    min_bid: 1500,
    url: 'https://i.pinimg.com/originals/a4/1c/b3/a41cb3325a756b14f856429f5f68b356.gif', // URL para a imagem da borda
    type: 'avatar_border' // Este tipo ainda não é usado, mas define a estrutura
  },
  {
    id: 'titulo_pioneiro',
    name: 'Título: Pioneiro da Tropa',
    min_bid: 1000,
    url: null, // Títulos não têm URL de imagem
    type: 'title'
  }
];
