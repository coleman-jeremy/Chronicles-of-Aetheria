
import React, { useState, useEffect, useRef } from 'react';
import { GameState, Race, Class, GameLog, Attributes } from './types';
import CharacterCreator from './components/CharacterCreator';
import { getDMResponse } from './services/geminiService';

const SAVE_KEY = 'chronicles-of-aetheria-save';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChoices, setCurrentChoices] = useState<string[]>([]);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Save game state to localStorage
  const saveGame = (state: GameState | null, choices: string[]) => {
    if (state) {
      const saveData = {
        gameState: state,
        currentChoices: choices,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    }
  };

  // Load game state from localStorage
  const loadGame = (): { gameState: GameState; currentChoices: string[] } | null => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const saveData = JSON.parse(saved);
        return {
          gameState: saveData.gameState,
          currentChoices: saveData.currentChoices || []
        };
      }
    } catch (error) {
      console.error('Failed to load save:', error);
    }
    return null;
  };

  // Delete save
  const deleteSave = () => {
    localStorage.removeItem(SAVE_KEY);
  };

  // Note: We don't auto-load saves on mount - let the user choose via CharacterCreator

  // Auto-save whenever game state changes
  useEffect(() => {
    if (gameState) {
      saveGame(gameState, currentChoices);
    }
  }, [gameState, currentChoices]);

  const startNewGame = (name: string, race: Race, charClass: Class) => {
    // Clear any existing save when starting a new game
    deleteSave();
    const initialState: GameState = {
      character: {
        name,
        race,
        class: charClass,
        level: 1,
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        xp: 0,
        gold: 0,
        inventory: [],
        stats: { str: 10, agi: 10, int: 10, vit: 10 },
        statPoints: 0
      },
      history: [],
      worldMemory: [`Died tragically but ridiculously on Earth. Soullessly adrift in the Void.`],
      isGameOver: false,
      isekaiPhase: 'death'
    };
    setGameState(initialState);
    triggerInitialNarration(initialState);
  };

  const triggerInitialNarration = async (state: GameState) => {
    setIsLoading(true);
    try {
      const introPrompt = `You find yourself in an infinite expanse of white. Before you stands a nervous God with a clipboard. "Listen," he says, sweating. "My bad. Huge mistake. Reincarnation program... strictly intended for heroic deaths. You? You hit your head on a falling melon. I need to fix this. I'm sending you to Aetheria. Pick three gifts."`;
      const response = await getDMResponse(state, introPrompt);
      updateStateWithResponse(response);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStateWithResponse = (res: any) => {
    setGameState(prev => {
      if (!prev) return null;
      
      let newHp = prev.character.hp + res.hpChange;
      let newMp = prev.character.mp + res.mpChange;
      let newXp = prev.character.xp + res.xpGain;
      let newGold = prev.character.gold + res.goldGain;
      let newLevel = prev.character.level;
      let newStatPoints = prev.character.statPoints;

      // Correct Leveling Logic
      if (newXp >= 100) {
        const levelsGained = Math.floor(newXp / 100);
        newLevel += levelsGained;
        newXp %= 100;
        newStatPoints += levelsGained * 5;
        newHp = prev.character.maxHp; // Heal on level up
      }

      const updatedInventory = [...prev.character.inventory];
      if (res.newItem) updatedInventory.push(res.newItem);

      const updatedMemory = [...prev.worldMemory];
      if (res.updateMemory) updatedMemory.push(res.updateMemory);

      // Simple phase transition logic
      let nextPhase = prev.isekaiPhase;
      if (prev.isekaiPhase === 'death') nextPhase = 'boons';
      else if (prev.isekaiPhase === 'boons' && updatedMemory.length > 2) nextPhase = 'alive';

      return {
        ...prev,
        character: {
          ...prev.character,
          hp: Math.max(0, Math.min(newHp, prev.character.maxHp)),
          mp: Math.min(newMp, prev.character.maxMp),
          xp: newXp,
          gold: newGold,
          level: newLevel,
          inventory: updatedInventory,
          statPoints: newStatPoints
        },
        worldMemory: updatedMemory,
        history: [...prev.history, { role: 'assistant', content: res.narration }],
        isGameOver: newHp <= 0,
        isekaiPhase: nextPhase
      };
    });
    setCurrentChoices(res.choices);
  };

  const handleAction = async (action: string) => {
    if (!gameState || isLoading) return;
    
    setIsLoading(true);
    setGameState(prev => prev ? {
      ...prev,
      history: [...prev.history, { role: 'user', content: action }]
    } : null);

    try {
      const response = await getDMResponse(gameState, action);
      updateStateWithResponse(response);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const allocatePoint = (stat: keyof Attributes) => {
    setGameState(prev => {
      if (!prev || prev.character.statPoints <= 0) return prev;
      return {
        ...prev,
        character: {
          ...prev.character,
          statPoints: prev.character.statPoints - 1,
          stats: {
            ...prev.character.stats,
            [stat]: prev.character.stats[stat] + 1
          },
          maxHp: stat === 'vit' ? prev.character.maxHp + 15 : prev.character.maxHp,
          maxMp: stat === 'int' ? prev.character.maxMp + 10 : prev.character.maxMp,
        }
      };
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState?.history]);

  const handleLoadSave = () => {
    const saved = loadGame();
    if (saved) {
      setGameState(saved.gameState);
      setCurrentChoices(saved.currentChoices);
    }
  };

  const handleNewGame = () => {
    if (confirm('Start a new game? This will delete your current save.')) {
      deleteSave();
      setGameState(null);
      setCurrentChoices([]);
    }
  };

  if (!gameState) {
    return <CharacterCreator onComplete={startNewGame} onLoadSave={handleLoadSave} />;
  }

  const { character, history, worldMemory, isGameOver } = gameState;

  return (
    <div className="flex flex-col h-screen max-w-6xl mx-auto p-4 gap-4 overflow-hidden">
      {/* HUD: Improved Visibility */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 bg-stone-900 border border-stone-800 p-4 rounded-xl shadow-lg z-20 backdrop-blur-md">
        <div className="md:col-span-1">
          <p className="text-amber-500 font-bold fantasy-font truncate uppercase">{character.name}</p>
          <p className="text-[10px] text-stone-500">Lv {character.level} {character.race} {character.class}</p>
        </div>
        <div className="hidden md:block">
          <p className="text-[10px] text-stone-400 font-bold flex justify-between">
            <span>HP</span> 
            <span className="text-stone-300">{character.hp}/{character.maxHp}</span>
          </p>
          <div className="bg-stone-800 h-2 rounded-full overflow-hidden mt-1 border border-stone-700">
            <div className="bg-red-600 h-full transition-all duration-500" style={{ width: `${(character.hp / character.maxHp) * 100}%` }} />
          </div>
        </div>
        <div className="hidden md:block">
          <p className="text-[10px] text-stone-400 font-bold flex justify-between">
            <span>XP</span> 
            <span className="text-stone-300">{character.xp}/100</span>
          </p>
          <div className="bg-stone-800 h-2 rounded-full overflow-hidden mt-1 border border-stone-700">
            <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${character.xp}%` }} />
          </div>
        </div>
        <div className="flex flex-col justify-center items-center md:col-span-2">
          {character.statPoints > 0 ? (
            <button 
              onClick={() => setShowLevelUp(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] px-4 py-2 rounded-full animate-bounce font-bold tracking-widest uppercase shadow-lg shadow-amber-900/40 border border-amber-400/30"
            >
              🔥 Distribute {character.statPoints} Stats
            </button>
          ) : (
             <div className="flex gap-4 text-[11px] text-stone-300 font-mono tracking-wider">
               <span title="Strength">STR {character.stats.str}</span>
               <span title="Agility">AGI {character.stats.agi}</span>
               <span title="Intelligence">INT {character.stats.int}</span>
               <span title="Vitality">VIT {character.stats.vit}</span>
             </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3">
          <div className="font-mono text-amber-500 text-sm drop-shadow-sm">
            🪙 {character.gold}
          </div>
          <button
            onClick={handleNewGame}
            className="text-[10px] text-stone-500 hover:text-stone-300 px-2 py-1 rounded border border-stone-700 hover:border-stone-600 transition-all"
            title="Start a new game"
          >
            🆕 New Game
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Chronicle: Narrative Identity */}
        <div className="hidden lg:flex w-72 flex-col gap-4">
          <div className="flex-1 bg-stone-900/80 border border-stone-800 rounded-xl p-4 overflow-y-auto">
            <h3 className="text-amber-600 text-[10px] font-black uppercase tracking-[0.3em] mb-4 border-b border-stone-800 pb-2">📜 Chronicle of History</h3>
            <div className="space-y-4">
              {worldMemory.map((fact, i) => (
                <div key={i} className="group">
                  <p className="text-[11px] text-stone-400 leading-relaxed border-l-2 border-amber-900/30 pl-3 group-hover:border-amber-600 transition-colors">{fact}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-stone-900/80 border border-stone-800 rounded-xl p-4 flex flex-col min-h-0">
            <h3 className="text-amber-600 text-[10px] font-black uppercase tracking-[0.3em] mb-3 border-b border-stone-800 pb-2 flex-shrink-0">🎒 Inventory</h3>
            <div className="flex flex-wrap gap-2 overflow-y-auto min-h-0">
              {character.inventory.length > 0 ? character.inventory.map((item, i) => (
                <span key={i} className="text-[10px] bg-stone-800 text-stone-300 px-2 py-1 rounded border border-stone-700">{item}</span>
              )) : <span className="text-[10px] text-stone-600 italic">Empty bags...</span>}
            </div>
          </div>
        </div>

        {/* Story Content */}
        <div className="flex-1 flex flex-col bg-stone-950/40 border border-stone-800 rounded-2xl relative min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
            {history.map((log, idx) => (
              <div key={idx} className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-5 rounded-xl text-[13px] leading-relaxed max-w-[85%] shadow-xl ${
                  log.role === 'user' ? 'bg-amber-900/20 text-amber-100 border border-amber-800/50 italic' : 'bg-stone-900/70 text-stone-200 border border-stone-800/50'
                }`}>
                  {log.content}
                </div>
              </div>
            ))}
            {isLoading && (
               <div className="flex items-center gap-3 text-stone-500 italic text-sm">
                 <div className="w-4 h-4 border-2 border-stone-700 border-t-amber-600 rounded-full animate-spin" />
                 Whispering to the Void...
               </div>
            )}
            {isGameOver && (
               <div className="py-20 text-center animate-pulse">
                 <h2 className="text-5xl text-red-600 fantasy-font mb-4">You have perished.</h2>
                 <p className="text-stone-500 mb-8">Even God makes mistakes twice.</p>
                 <div className="flex gap-4 justify-center">
                   <button onClick={() => { deleteSave(); window.location.reload(); }} className="bg-stone-800 hover:bg-stone-700 text-white px-10 py-3 rounded-full uppercase text-xs tracking-[0.2em] transition-all border border-stone-600 shadow-lg shadow-red-900/20">Reincarnate Again</button>
                 </div>
               </div>
            )}
          </div>

          {!isGameOver && (
            <div className="p-6 bg-stone-900/90 backdrop-blur-md border-t border-stone-800">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {currentChoices.map((choice, i) => (
                  <button
                    key={i}
                    disabled={isLoading}
                    onClick={() => handleAction(choice)}
                    className="text-left bg-stone-800 hover:bg-stone-700 text-stone-200 p-4 rounded-xl border border-stone-700 text-[12px] transition-all hover:scale-[1.02] active:scale-95 shadow-lg group"
                  >
                    <span className="text-amber-500 font-bold mr-3 group-hover:text-amber-400">#{(i+1)}</span> {choice}
                  </button>
                ))}
              </div>
              <input 
                type="text"
                placeholder="Declare your intent..."
                className="w-full bg-stone-950/80 border border-stone-700 rounded-xl p-4 text-stone-200 text-sm focus:border-amber-600 focus:ring-1 focus:ring-amber-900 focus:outline-none transition-all placeholder:italic placeholder:text-stone-700 shadow-inner"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    handleAction(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Ascension Modal */}
      {showLevelUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-all">
          <div className="bg-stone-900 border border-stone-700 p-10 rounded-3xl w-full max-w-sm shadow-[0_0_50px_-12px_rgba(217,119,6,0.25)]">
            <h2 className="text-3xl text-amber-500 fantasy-font mb-2 text-center">Ascension</h2>
            <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-900/50 to-transparent mb-6" />
            <p className="text-stone-400 text-xs text-center uppercase tracking-[0.2em] mb-8">Unspent Potential: <span className="text-amber-500 font-mono">{character.statPoints}</span></p>
            
            <div className="space-y-6">
              {[
                { key: 'str', label: 'Strength', desc: 'Raw Might' },
                { key: 'agi', label: 'Agility', desc: 'Speed & Stealth' },
                { key: 'int', label: 'Intelligence', desc: 'Mana & Knowledge' },
                { key: 'vit', label: 'Vitality', desc: 'HP & Endurance' }
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between group">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-stone-300 uppercase tracking-tighter">{label}</span>
                    <span className="text-[9px] text-stone-600 uppercase tracking-widest">{desc}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xl text-amber-100 font-mono group-hover:text-amber-400 transition-colors">{character.stats[key as keyof Attributes]}</span>
                    <button 
                      disabled={character.statPoints <= 0}
                      onClick={() => allocatePoint(key as keyof Attributes)}
                      className="bg-amber-600/10 hover:bg-amber-600 text-amber-500 hover:text-white w-10 h-10 rounded-xl border border-amber-900/30 flex items-center justify-center disabled:opacity-5 transition-all active:scale-90"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setShowLevelUp(false)}
              className="w-full mt-10 py-4 bg-stone-800/50 hover:bg-stone-800 text-stone-300 rounded-2xl text-xs uppercase font-bold tracking-[0.4em] border border-stone-700 transition-all active:translate-y-1"
            >
              Confirm Growth
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
