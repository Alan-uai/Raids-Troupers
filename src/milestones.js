// src/milestones.js
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
        { level: 1, goal: 5 }, { level: 2, goal: 10 }, { level: 3, goal: 20 }, { level: 4, goal: 35 },
        { level: 5, goal: 50 }, { level: 6, goal: 75 }, { level: 7, goal: 100 }, { level: 8, goal: 125 },
        { level: 9, goal: 150 }, { level: 10, goal: 200 }
      ] 
    },
    // 7. Guia da Tropa
    { 
      id: 'troop_guide', type: 'GUIDE_TROOP', stat: 'guidedTroop',
      tiers: [
        { level: 1, goal: 10 }, { level: 2, goal: 25 }, { level: 3, goal: 50 }, { level: 4, goal: 75 },
        { level: 5, goal: 100 }, { level: 6, goal: 150 }, { level: 7, goal: 200 }, { level: 8, goal: 300 },
        { level: 9, goal: 400 }, { level: 10, goal: 500 }
      ] 
    },
    // 8. Membro Leal
    { 
      id: 'loyal_member', type: 'STAY_LOYAL', stat: 'daysInClan',
      tiers: [
        { level: 1, goal: 7 }, { level: 2, goal: 14 }, { level: 3, goal: 30 }, { level: 4, goal: 60 },
        { level: 5, goal: 90 }, { level: 6, goal: 120 }, { level: 7, goal: 180 }, { level: 8, goal: 270 },
        { level: 9, goal: 365 }, { level: 10, goal: 500 }
      ] 
    },
    // 9. Mentor de Elite
    { 
      id: 'elite_mentor', type: 'MENTOR_PLAYER', stat: 'mentoredPlayers',
      tiers: [
        { level: 1, goal: 5 }, { level: 2, goal: 10 }, { level: 3, goal: 20 }, { level: 4, goal: 30 },
        { level: 5, goal: 50 }, { level: 6, goal: 75 }, { level: 7, goal: 100 }, { level: 8, goal: 150 },
        { level: 9, goal: 200 }, { level: 10, goal: 250 }
      ] 
    },
    // 10. Auctions Won
    { 
      id: 'auctions_won', type: 'AUCTION_WON', stat: 'auctionsWon',
      tiers: [
        { level: 1, goal: 1 }, { level: 2, goal: 3 }, { level: 3, goal: 5 }, { level: 4, goal: 10 },
        { level: 5, goal: 15 }, { level: 6, goal: 20 }, { level: 7, goal: 30 }, { level: 8, goal: 40 },
        { level: 9, goal: 50 }, { level: 10, goal: 75 }
      ] 
    },
    // 11. Secret Milestone
    {
      id: 'secret_mastery', type: 'SECRET', stat: 'level', // The stat is just a placeholder, the logic is custom
      tiers: [
        { level: 1, goal: 150 }, { level: 2, goal: 200 }, { level: 3, goal: 250 }, { level: 4, goal: 300 },
        { level: 5, goal: 350 }, { level: 6, goal: 400 }, { level: 7, goal: 450 }, { level: 8, goal: 500 },
        { level: 9, goal: 750 }, { level: 10, goal: 1000 }
      ]
    }
];
