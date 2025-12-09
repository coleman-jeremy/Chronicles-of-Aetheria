
import { GoogleGenAI, Type } from "@google/genai";
import { GameState, DMResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are the Dungeon Master for "Chronicles of Aetheria: The Second Life". 

THE PREMISE:
This is an Isekai adventure. The player died an absurd, accidental death on Earth (e.g., slipped on a banana peel while chasing a bus). They are currently meeting a sheepish God in the "Great In-Between". 

CORE DM RULES:
1. STATS MATTER: Refer to Strength (STR), Agility (AGI), Intelligence (INT), and Vitality (VIT) when narrating. A player with high STR should effortlessly kick down massive dungeon doors. A player with low INT might struggle to understand magical graffiti.
2. CHRONICLE MEMORY: Read the "World Memory" carefully. This is the absolute source of truth for narrative history. If memory says the player chose a specific gift from God, that gift is part of their destiny.
3. CONTEXTUAL CHOICES: Provide 4 distinct choices that represent different approaches (Brute force, Finesse, Cunning, Magical).
4. RESPONSE FORMAT: Strict JSON.

ISEKAI BEGINNING:
If history is empty, describe the God apologizing for the "administrative error" regarding the player's death. He must offer the player THREE BOONS (gifts) for their reincarnation. The player will select these via the choices provided.

RESPONSE STRUCTURE:
- updateMemory: Narrative facts to store in long-term memory (e.g., "Obtained the 'Mana Well' boon from God").
- xpGain: 15-25 for combat/major milestones.
- goldGain: Loot found.
- stats check: Mention how current stats influenced the outcome.`;

export const getDMResponse = async (gameState: GameState, userInput: string): Promise<DMResponse> => {
  const model = 'gemini-2.5-pro';
  
  const historyString = gameState.history
    .slice(-12) 
    .map(h => `${h.role === 'user' ? 'Player' : 'DM'}: ${h.content}`)
    .join('\n');

  const context = `
[CURRENT SYSTEM STATUS]
Isekai Phase: ${gameState.isekaiPhase}
Player Name: ${gameState.character.name}
Class: ${gameState.character.race} ${gameState.character.class}
Stats: [STR: ${gameState.character.stats.str}, AGI: ${gameState.character.stats.agi}, INT: ${gameState.character.stats.int}, VIT: ${gameState.character.stats.vit}]
Level: ${gameState.character.level}
Chronicle Memory: ${gameState.worldMemory.join(' | ')}

[PLAYER ACTION]
${userInput}

[NARRATIVE RECAP]
${historyString}
`;

  const response = await ai.models.generateContent({
    model,
    contents: context,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          narration: { type: Type.STRING },
          choices: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          hpChange: { type: Type.NUMBER },
          mpChange: { type: Type.NUMBER },
          xpGain: { type: Type.NUMBER },
          goldGain: { type: Type.NUMBER },
          newItem: { type: Type.STRING },
          updateMemory: { type: Type.STRING }
        },
        required: ["narration", "choices", "hpChange", "mpChange", "xpGain", "goldGain"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse DM response", e);
    return {
      narration: "The voice of the DM wavers as the reality glitches...",
      choices: ["Try again"],
      hpChange: 0,
      mpChange: 0,
      xpGain: 0,
      goldGain: 0
    };
  }
};
