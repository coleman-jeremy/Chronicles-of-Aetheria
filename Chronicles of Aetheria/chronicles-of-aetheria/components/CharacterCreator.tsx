
import React, { useState } from 'react';
import { Race, Class } from '../types';

interface Props {
  onComplete: (name: string, race: Race, charClass: Class) => void;
}

const RACES: Race[] = ['Human', 'Elf', 'Dwarf', 'Orc', 'Halfling', 'Dragonborn'];
const CLASSES: Class[] = ['Warrior', 'Mage', 'Rogue', 'Paladin', 'Druid', 'Warlock'];

const CharacterCreator: React.FC<Props> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [race, setRace] = useState<Race>('Human');
  const [charClass, setCharClass] = useState<Class>('Warrior');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onComplete(name, race, charClass);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-stone-900 border border-stone-700 p-8 rounded-lg shadow-2xl mt-12">
      <h1 className="text-4xl text-amber-500 mb-6 text-center">Awaken, Hero</h1>
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
