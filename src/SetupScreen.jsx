import React from 'react';

const SetupScreen = ({ parents, setParents, children, setChildren, saveAndContinue, showNameEntry, setShowNameEntry }) => {
  if (!showNameEntry && parents.parent1 && parents.parent2 && children.child1 && children.child2) {
    return (
      <div className="p-4 max-w-md mx-auto bg-white min-h-screen flex flex-col justify-center">
        <h1 className="text-2xl font-bold text-center mb-8 text-blue-600">CoParenting</h1>
        <div className="space-y-3">
          <button onClick={() => saveAndContinue('parent1')} className="w-full text-white py-4 rounded-lg font-medium text-lg" style={{ backgroundColor: '#86efac', color: '#065f46' }}>
            Continuar como {parents.parent1}
          </button>
          <button onClick={() => saveAndContinue('parent2')} className="w-full text-white py-4 rounded-lg font-medium text-lg" style={{ backgroundColor: '#fde047', color: '#713f12' }}>
            Continuar como {parents.parent2}
          </button>
          <button onClick={() => saveAndContinue('child1')} className="w-full text-white py-4 rounded-lg font-medium text-lg" style={{ backgroundColor: '#60a5fa', color: '#1e3a8a' }}>
            Continuar como {children.child1}
          </button>
          <button onClick={() => saveAndContinue('child2')} className="w-full text-white py-4 rounded-lg font-medium text-lg" style={{ backgroundColor: '#f9a8d4', color: '#831843' }}>
            Continuar como {children.child2}
          </button>
        </div>
        <div className="text-center mt-8">
          <button onClick={() => setShowNameEntry(true)} className="text-blue-600 underline text-sm">
            Volver a nombres
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-white min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">CoParenting</h1>
      <div className="space-y-4">
        {[
          { label: 'Padre', key: 'parent1', bg: '#86efac20', border: 'green-400' },
          { label: 'Madre', key: 'parent2', bg: '#fde04720', border: 'yellow-400' },
          { label: 'Otro Cuidador (opcional)', key: 'other', bg: '#10B98120', border: 'green-400' },
        ].map(({ label, key, bg, border }) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <input
              type="text"
              value={parents[key]}
              onChange={(e) => setParents(prev => ({ ...prev, [key]: e.target.value }))}
              className={`w-full px-3 py-2 text-base border-2 rounded focus:outline-none focus:border-${border}`}
              placeholder={label}
              style={{ backgroundColor: bg }}
              autoComplete="off"
            />
          </div>
        ))}

        {[
          { label: 'Hijo/a 1', key: 'child1', bg: '#60a5fa20', border: 'blue-400' },
          { label: 'Hijo/a 2', key: 'child2', bg: '#f9a8d420', border: 'pink-400' },
        ].map(({ label, key, bg, border }) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <input
              type="text"
              value={children[key]}
              onChange={(e) => setChildren(prev => ({ ...prev, [key]: e.target.value }))}
              className={`w-full px-3 py-2 text-base border-2 rounded focus:outline-none focus:border-${border}`}
              placeholder={label}
              style={{ backgroundColor: bg }}
              autoComplete="off"
            />
          </div>
        ))}

        <div className="space-y-2 pt-2">
          {['parent1', 'parent2', 'child1', 'child2'].map((key) => (
            <button
              key={key}
              onClick={() => saveAndContinue(key)}
              className="w-full text-white py-3 rounded-lg font-medium text-base"
              style={{ backgroundColor: key === 'parent1' ? '#86efac' : key === 'parent2' ? '#fde047' : key === 'child1' ? '#60a5fa' : '#f9a8d4' }}
              disabled={!parents.parent1 || !parents.parent2 || !children.child1 || !children.child2}
            >
              Continuar como {key === 'parent1' ? parents.parent1 : key === 'parent2' ? parents.parent2 : key === 'child1' ? children.child1 : children.child2}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
