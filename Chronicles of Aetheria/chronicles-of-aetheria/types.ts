
export type Race = 'Human' | 'Elf' | 'Dwarf' | 'Orc' | 'Halfling' | 'Dragonborn';
export type Class = 'Warrior' | 'Mage' | 'Rogue' | 'Paladin' | 'Druid' | 'Warlock';

export interface Attributes {
  str: number;
  agi: number;
  int: number;
  vit: number;
}

export interface GameState {
  character: {
    name: string;
    race: Race;
    class: Class;
    level: number;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    xp: number;
    gold: number;
    inventory: string[];
    stats: Attributes;
    statPoints: number;
  };
  history: GameLog[];
  worldMemory: string[];
  isGameOver: boolean;
  isekaiPhase: 'death' | 'boons' | 'alive';
}

export interface GameLog {
  role: 'user' | 'assistant';
  content: string;
}

export interface DMResponse {
  narration: string;
  choices: string[];
  hpChange: number;
  mpChange: number;
  xpGain: number;
  goldGain: number;
  newItem?: string;
  updateMemory?: string;
}
