// Este arquivo define as classes ou especializações que os jogadores podem escolher.

export const classes = [
  {
    id: 'guerreiro',
    name: 'Guerreiro',
    icon: '⚔️',
    color: '#E74C3C',
    description: 'Focado na linha de frente, causa dano massivo e resiste a ataques poderosos.',
    // Futuramente: bonus: { type: 'damage_increase', value: 0.05 }
  },
  {
    id: 'curandeiro',
    name: 'Curandeiro',
    icon: '❤️‍🩹',
    color: '#2ECC71',
    description: 'Mestre da recuperação, mantém a equipe viva com curas e buffs de proteção.',
    // Futuramente: bonus: { type: 'xp_boost_party', value: 0.05 }
  },
  {
    id: 'mago',
    name: 'Mago',
    icon: '🧙',
    color: '#3498DB',
    description: 'Controla os elementos para causar dano em área e aplicar debuffs nos inimigos.',
    // Futuramente: bonus: { type: 'coin_find', value: 0.10 }
  },
  {
    id: 'tank',
    name: 'Tank',
    icon: '🛡️',
    color: '#95A5A6',
    description: 'Inabalável, protege os aliados atraindo a atenção dos inimigos e absorvendo dano.',
    // Futuramente: bonus: { type: 'kick_resist', value: 0.25 }
  },
  {
    id: 'arqueiro',
    name: 'Arqueiro',
    icon: '🏹',
    color: '#F1C40F',
    description: 'Especialista em dano à distância, abate alvos prioritários com precisão mortal.',
  },
  {
    id: 'ladino',
    name: 'Ladino',
    icon: '🗡️',
    color: '#717D7E',
    description: 'Mestre da furtividade, ataca das sombras e causa dano crítico inesperado.',
  }
];
