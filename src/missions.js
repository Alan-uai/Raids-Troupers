// src/missions.js

export const missions = [
  {
    id: 'create_raid_1',
    description: 'Crie 1 Raid',
    type: 'RAID_CREATED',
    goal: 1,
    reward: { xp: 10, coins: 5 }
  },
  {
    id: 'help_raid_3',
    description: 'Ajude em 3 Raids',
    type: 'RAID_HELPED',
    goal: 3,
    reward: { xp: 50, coins: 25 }
  },
  {
    id: 'kick_member_1',
    description: 'Expulse 1 membro de uma raid',
    type: 'KICK_MEMBER',
    goal: 1,
    reward: { xp: 5, coins: 0 }
  },
    {
    id: 'rate_player_5',
    description: 'Avalie 5 jogadores após uma raid',
    type: 'RATE_PLAYER',
    goal: 5,
    reward: { xp: 20, coins: 10 }
  },
  {
    id: 'create_raid_5',
    description: 'Crie 5 Raids',
    type: 'RAID_CREATED',
    goal: 5,
    reward: { xp: 60, coins: 30 }
  },
  {
    id: 'help_raid_10',
    description: 'Ajude em 10 Raids',
    type: 'RAID_HELPED',
    goal: 10,
    reward: { xp: 150, coins: 75 }
  },
];
