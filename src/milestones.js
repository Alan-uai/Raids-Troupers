// src/milestones.js
import { rarities } from './items.js';

export const milestones = [
    // 1. Raids Helded
    { 
      id: 'raids_helped', type: 'RAID_HELPED', stat: 'raidsHelped',
      tiers: [
        { level: 1, goal: 10 }, { level: 2, goal: 25 }, { level: 3, goal: 50 }, { level: 4, goal: 100 },
        { level: 5, goal: 150 }, { level: 6, goal: 250 }, { level: 7, goal: 500 }, { level: 8, goal: 750 },
        { level: 9, goal: 1000 }, { level: 10, goal: 1500 }
      ] 
    },
    // 2. Raids Created
    { 
      id: 'raids_created', type: 'RAID_CREATED', stat: 'raidsCreated',
      tiers: [
        { level: 1, goal: 5 }, { level: 2, goal: 15 }, { level: 3, goal: 30 }, { level: 4, goal: 60 },
        { level: 5, goal: 100 }, { level: 6, goal: 175 }, { level: 7, goal: 300 }, { level: 8, goal: 500 },
        { level: 9, goal: 750 }, { level: 10, goal: 1000 }
      ] 
    },
    // 3. Positive Ratings
    { 
      id: 'positive_ratings', type: 'RATE_PLAYER', stat: 'reputation',
      tiers: [
        { level: 1, goal: 20 }, { level: 2, goal: 50 }, { level: 3, goal: 100 }, { level: 4, goal: 200 },
        { level: 5, goal: 350 }, { level: 6, goal: 500 }, { level: 7, goal: 750 }, { level: 8, goal: 1000 },
        { level: 9, goal: 1250 }, { level: 10, goal: 1500 }
      ] 
    },
    // 4. Coins Earned
    { 
      id: 'coins_earned', type: 'EARN_COINS', stat: 'coins',
      tiers: [
        { level: 1, goal: 1000 }, { level: 2, goal: 5000 }, { level: 3, goal: 10000 }, { level: 4, goal: 25000 },
        { level: 5, goal: 50000 }, { level: 6, goal: 75000 }, { level: 7, goal: 100000 }, { level: 8, goal: 150000 },
        { level: 9, goal: 200000 }, { level: 10, goal: 250000 }
      ] 
    },
    // 5. Level Reached
    { 
      id: 'level_reached', type: 'LEVEL_UP', stat: 'level',
      tiers: [
        { level: 1, goal: 5 }, { level: 2, goal: 10 }, { level: 3, goal: 20 }, { level: 4, goal: 30 },
        { level: 5, goal: 40 }, { level: 6, goal: 50 }, { level: 7, goal: 60 }, { level: 8, goal: 75 },
        { level: 9, goal: 90 }, { level: 10, goal: 100 }
      ] 
    },
    // 6. Items Owned
    { 
      id: 'items_owned', type: 'ITEM_ACQUIRED', stat: 'inventory.length',
      tiers: [
        { level: 1, goal: 10 }, { level: 2, goal: 25 }, { level: 3, goal: 50 }, { level: 4, goal: 75 },
        { level: 5, goal: 100 }, { level: 6, goal: 150 }, { level: 7, goal: 200 }, { level: 8, goal: 250 },
        { level: 9, goal: 300 }, { level: 10, goal: 350 }
      ] 
    },
    // 7. Membro Leal
    { 
      id: 'loyal_member', type: 'STAY_LOYAL', stat: 'daysInClan',
      tiers: [
        { level: 1, goal: 3 }, { level: 2, goal: 7 }, { level: 3, goal: 14 }, { level: 4, goal: 21 },
        { level: 5, goal: 30 }, { level: 6, goal: 40 }, { level: 7, goal: 50 }, { level: 8, goal: 60 },
        { level: 9, goal: 70 }, { level: 10, goal: 73 }
      ] 
    },
    // 8. Colecionador de Raridades
    {
      id: 'rarity_collector', type: 'COLLECT_RARITIES', stat: { name: 'rarityCollector' }, // Stat is complex, handled in system
      tiers: [
        { level: 1, goal: 1, rarity: rarities.MAIS_QUE_COMUM },
        { level: 2, goal: 1, rarity: rarities.COMUM },
        { level: 3, goal: 1, rarity: rarities.INCOMUM },
        { level: 4, goal: 1, rarity: rarities.RARO },
        { level: 5, goal: 1, rarity: rarities.MAIS_QUE_RARO },
        { level: 6, goal: 1, rarity: rarities.ULTRA_RARO },
        { level: 7, goal: 1, rarity: rarities.MENOS_QUE_LENDARIO },
        { level: 8, goal: 1, rarity: rarities.LENDARIO },
        { level: 9, goal: 1, rarity: rarities.MAIS_QUE_LENDARIO },
        { level: 10, goal: 1, rarity: rarities.ULTRA_LENDARIO }
      ],
      secret_tier: {
        goal: 1, 
        rarity: rarities.KARDEC
      }
    },
    // 9. (Placeholder)
    { 
      id: 'placeholder_1', type: 'PLACEHOLDER', stat: 'placeholder',
      tiers: [ { level: 1, goal: 9999 } ]
    },
    // 10. (Placeholder)
    { 
      id: 'placeholder_2', type: 'PLACEHOLDER', stat: 'placeholder',
      tiers: [ { level: 1, goal: 9999 } ]
    },
    // 11. Secret Milestone (Unlocks after completing all others)
    {
      id: 'secret_mastery', type: 'SECRET', stat: 'level', // The stat is just a placeholder, logic is custom
      tiers: [], // Tiers are not applicable here, it's a single secret achievement
      secret_tier: {
        goal: 1, // Get 1 Kardec item
      }
    }
];
