
import React, { useState, useEffect } from 'react';
import { Race, Class } from '../types';

interface Props {
  onComplete: (name: string, race: Race, charClass: Class) => void;
  onLoadSave?: () => void;
}

const RACES: Race[] = ['Human', 'Elf', 'Dwarf', 'Orc', 'Halfling', 'Dragonborn'];
const CLASSES: Class[] = ['Warrior', 'Mage', 'Rogue', 'Paladin', 'Druid', 'Warlock'];
const SAVE_KEY = 'chronicles-of-aetheria-save';

const CharacterCreator: React.FC<Props> = ({ onComplete, onLoadSave }) => {
  const [name, setName] = useState('');
  const [race, setRace] = useState<Race>('Human');
  const [charClass, setCharClass] = useState<Class>('Warrior');
  const [hasSave, setHasSave] = useState(false);
  const [saveInfo, setSaveInfo] = useState<{ characterName: string; savedAt: string } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const saveData = JSON.parse(saved);
        if (saveData.gameState && !saveData.gameState.isGameOver) {
          setHasSave(true);
          setSaveInfo({
            characterName: saveData.gameState.character.name,
            savedAt: saveData.savedAt || new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Failed to check save:', error);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onComplete(name, race, charClass);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-stone-900 border border-stone-700 p-8 rounded-lg shadow-2xl mt-12">
      <h1 className="text-4xl text-amber-500 mb-6 text-center">Awaken, Hero</h1>
      
      {hasSave && saveInfo && onLoadSave && (
        <div className="mb-6 p-4 bg-amber-900/20 border border-amber-800/50 rounded-lg">
          <p className="text-amber-400 text-sm mb-2">📜 Saved Adventure Found</p>
          <p className="text-stone-400 text-xs mb-3">
            Continue as <span className="text-amber-500 font-bold">{saveInfo.characterName}</span> (Saved: {formatDate(saveInfo.savedAt)})
          </p>
          <button
            onClick={onLoadSave}
            className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-2 px-6 rounded-lg transition-colors text-sm uppercase tracking-widest mb-3"
          >
            Continue Adventure
          </button>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-900/50 to-transparent my-4" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1 text-stone-400">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-stone-800 border border-stone-600 rounded p-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            placeholder="Enter your name..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-stone-400">Race</label>
          <div className="grid grid-cols-3 gap-2">
            {RACES.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRace(r)}
                className={`p-2 rounded text-sm transition ${race === r ? 'bg-amber-600 text-white' : 'bg-stone-800 hover:bg-stone-700'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-stone-400">Class</label>
          <div className="grid grid-cols-3 gap-2">
            {CLASSES.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCharClass(c)}
                className={`p-2 rounded text-sm transition ${charClass === c ? 'bg-amber-600 text-white' : 'bg-stone-800 hover:bg-stone-700'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg uppercase tracking-widest"
        >
          Begin Adventure
        </button>
      </form>
    </div>
  );
};

export default CharacterCreator;
