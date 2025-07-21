// src/missions.js

export const missions = [
  // =====================
  // === Daily Missions ===
  // =====================
  {
    id: 'daily_create_raid_1',
    title: 'Chamado à Aventura',
    description: 'Inicie uma nova Raid para a comunidade.',
    type: 'RAID_CREATED',
    goal: 1,
    reward: { xp: 10, coins: 5 },
    category: 'daily'
  },
  {
    id: 'daily_help_raid_2',
    title: 'Apoiando a Tropa',
    description: 'Participe de duas Raids para ajudar outros jogadores.',
    type: 'RAID_HELPED',
    goal: 2,
    reward: { xp: 20, coins: 15 },
    category: 'daily'
  },
  {
    id: 'daily_rate_player_3',
    title: 'Feedback Construtivo',
    description: 'Avalie três companheiros de equipe após uma Raid.',
    type: 'RATE_PLAYER',
    goal: 3,
    reward: { xp: 15, coins: 10 },
    category: 'daily'
  },
  {
    id: 'daily_earn_coins_50',
    title: 'Pequena Fortuna',
    description: 'Acumule 50 Troup Coins através de suas atividades.',
    type: 'EARN_COINS',
    goal: 50,
    reward: { xp: 25, coins: 5 },
    category: 'daily'
  },

  // =====================
  // === Weekly Missions ===
  // =====================
  {
    id: 'weekly_help_raid_10',
    title: 'Campeão da Semana',
    description: 'Ajude em um total de 10 Raids durante a semana.',
    type: 'RAID_HELPED',
    goal: 10,
    reward: { item: 'pocao_fraca' },
    category: 'weekly'
  },
  {
    id: 'weekly_create_raid_5',
    title: 'Líder de Batalha Semanal',
    description: 'Organize 5 Raids para a comunidade esta semana.',
    type: 'RAID_CREATED',
    goal: 5,
    reward: { item: 'anel_simples' },
    category: 'weekly'
  },
  {
    id: 'weekly_high_reputation',
    title: 'Reputação Impecável',
    description: 'Receba 5 avaliações positivas de outros jogadores.',
    type: 'RATE_PLAYER', // Reutilizado, mas o contexto muda
    goal: 5, // A contagem seria de avaliações positivas
    reward: { item: 'botas_couro' },
    category: 'weekly'
  }
];
