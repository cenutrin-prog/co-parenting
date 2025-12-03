import React from 'react';

const SetupScreen = ({ parents, setParents, children, setChildren, setCurrentUser, setStep }) => {

  const handleParentChange = (field, value) => {
    setParents(prev => ({ ...prev, [field]: value }));
  };

  const handleChildChange = (field, value) => {
    setChildren(prev => ({ ...prev, [field]: value }));
  };

  const saveAndContinue = (user) => {
    // Guardar nombres en localStorage
    localStorage.setItem('coparenting_parents', JSON.stringify(parents));
    localStorage.setItem('coparenting_children', JSON.stringify(children));

    // Establecer usuario actual y pasar a la pantalla principal
    setCurrentUser(user);
    setStep('main');
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white min-h-screen flex flex-col justify-center">
      <h1 className="text-2xl font-bold text-center mb-8 text-blue-600">CoParenting</h1>

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Nombre del padre 1"
          value={parents.parent1}
          onChange={(e) => handleParentChange("parent1", e.target.value)}
          className="w-full p-2 border rounded"
        />

        <input
          type="text"
          placeholder="Nombre del padre 2"
          value={parents.parent2}
          onChange={(e) => handleParentChange("parent2", e.target.value)}
          className="w-full p-2 border rounded"
        />

        <input
          type="text"
          placeholder="Nombre hija 1"
          value={children.child1}
          onChange={(e) => handleChildChange("child1", e.target.value)}
          className="w-full p-2 border rounded"
        />

        <input
          type="text"
          placeholder="Nombre hija 2"
          value={children.child2}
          onChange={(e) => handleChildChange("child2", e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {parents.parent1 && (
          <button
            onClick={() => saveAndContinue('parent1')}
            className="w-full text-white py-3 rounded-lg font-medium text-lg bg-blue-500"
          >
            Continuar como {parents.parent1}
          </button>
        )}
        {parents.parent2 && (
          <button
            onClick={() => saveAndContinue('parent2')}
            className="w-full text-white py-3 rounded-lg font-medium text-lg bg-blue-500"
          >
            Continuar como {parents.parent2}
          </button>
        )}
        {children.child1 && (
          <button
            onClick={() => saveAndContinue('child1')}
            className="w-full text-white py-3 rounded-lg font-medium text-lg bg-blue-500"
          >
            Continuar como {children.child1}
          </button>
        )}
        {children.child2 && (
          <button
            onClick={() => saveAndContinue('child2')}
            className="w-full text-white py-3 rounded-lg font-medium text-lg bg-blue-500"
          >
            Continuar como {children.child2}
          </button>
        )}
      </div>
    </div>
  );
};

export default SetupScreen;
