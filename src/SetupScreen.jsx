import React from 'react';

const SetupScreen = ({ parents, setParents, children, setChildren, setCurrentUser, setStep, currentUser, saveAndContinue }) => {
  const handleParentChange = (field, value) => {
    setParents(prev => ({ ...prev, [field]: value }));
  };

  const handleChildChange = (field, value) => {
    setChildren(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAndContinue = (user) => {
    // Guardar nombres en localStorage
    localStorage.setItem('coparenting_parents', JSON.stringify(parents));
    localStorage.setItem('coparenting_children', JSON.stringify(children));
    localStorage.setItem('coparenting_currentUser', user);
    // Establecer usuario actual y pasar a la pantalla principal
    setCurrentUser(user);
    setStep('main');
  };

  // Colores apagados (pastel) para los inputs
  const inputColors = {
    parent1: '#FFE4CC', // Naranja apagado
    parent2: '#D4F4DD', // Verde apagado
    child1: '#FFF9C4',  // Amarillo apagado
    child2: '#D0F4F7',  // Cian apagado
    other: '#FFE0F0'    // Rosa apagado
  };

  // Colores vivos para los botones
  const buttonColors = {
    parent1: '#FF8C42', // Naranja vivo
    parent2: '#86efac', // Verde vivo
    child1: '#FDD835',  // Amarillo vivo
    child2: '#00BCD4'   // Cian vivo
  };

  // VISTA PARA PADRE (parent1): muestra todo (inputs + todos los botones)
  if (!currentUser || currentUser === 'parent1') {
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
            style={{ backgroundColor: inputColors.parent1 }}
          />
          
          <input
            type="text"
            placeholder="Nombre del padre 2"
            value={parents.parent2}
            onChange={(e) => handleParentChange("parent2", e.target.value)}
            className="w-full p-2 border rounded"
            style={{ backgroundColor: inputColors.parent2 }}
          />
          
          <input
            type="text"
            placeholder="Nombre hija 1"
            value={children.child1}
            onChange={(e) => handleChildChange("child1", e.target.value)}
            className="w-full p-2 border rounded"
            style={{ backgroundColor: inputColors.child1 }}
          />
          
          <input
            type="text"
            placeholder="Nombre hija 2"
            value={children.child2}
            onChange={(e) => handleChildChange("child2", e.target.value)}
            className="w-full p-2 border rounded"
            style={{ backgroundColor: inputColors.child2 }}
          />

          <input
            type="text"
            placeholder="Otro cuidador (opcional)"
            value={parents.other || ''}
            onChange={(e) => handleParentChange("other", e.target.value)}
            className="w-full p-2 border rounded"
            style={{ backgroundColor: inputColors.other }}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {parents.parent1 && (
            <button
              onClick={() => handleSaveAndContinue('parent1')}
              className="w-full text-white py-3 rounded-lg font-medium text-lg"
              style={{ backgroundColor: buttonColors.parent1 }}
            >
              Continuar como {parents.parent1}
            </button>
          )}
          
          {parents.parent2 && (
            <button
              onClick={() => handleSaveAndContinue('parent2')}
              className="w-full text-white py-3 rounded-lg font-medium text-lg"
              style={{ backgroundColor: buttonColors.parent2 }}
            >
              Continuar como {parents.parent2}
            </button>
          )}
          
          {children.child1 && (
            <button
              onClick={() => handleSaveAndContinue('child1')}
              className="w-full text-white py-3 rounded-lg font-medium text-lg"
              style={{ backgroundColor: buttonColors.child1 }}
            >
              Continuar como {children.child1}
            </button>
          )}
          
          {children.child2 && (
            <button
              onClick={() => handleSaveAndContinue('child2')}
              className="w-full text-white py-3 rounded-lg font-medium text-lg"
              style={{ backgroundColor: buttonColors.child2 }}
            >
              Continuar como {children.child2}
            </button>
          )}
        </div>
      </div>
    );
  }

  // VISTA PARA MADRE (parent2): sin inputs, solo botones madre + hijos
  if (currentUser === 'parent2') {
    return (
      <div className="p-4 max-w-md mx-auto bg-white min-h-screen flex flex-col justify-center">
        <h1 className="text-2xl font-bold text-center mb-8 text-blue-600">CoParenting</h1>
        
        <div className="mt-4 flex flex-col gap-2">
          {parents.parent2 && (
            <button
              onClick={() => handleSaveAndContinue('parent2')}
              className="w-full text-white py-3 rounded-lg font-medium text-lg"
              style={{ backgroundColor: buttonColors.parent2 }}
            >
              Continuar como {parents.parent2}
            </button>
          )}
          
          {children.child1 && (
            <button
              onClick={() => handleSaveAndContinue('child1')}
              className="w-full text-white py-3 rounded-lg font-medium text-lg"
              style={{ backgroundColor: buttonColors.child1 }}
            >
              Continuar como {children.child1}
            </button>
          )}
          
          {children.child2 && (
            <button
              onClick={() => handleSaveAndContinue('child2')}
              className="w-full text-white py-3 rounded-lg font-medium text-lg"
              style={{ backgroundColor: buttonColors.child2 }}
            >
              Continuar como {children.child2}
            </button>
          )}
        </div>
      </div>
    );
  }

  // VISTA PARA HIJOS (child1 o child2): sin inputs, solo botones de los dos hijos
  if (currentUser === 'child1' || currentUser === 'child2') {
    return (
      <div className="p-4 max-w-md mx-auto bg-white min-h-screen flex flex-col justify-center">
        <h1 className="text-2xl font-bold text-center mb-8 text-blue-600">CoParenting</h1>
        
        <div className="mt-4 flex flex-col gap-2">
          {children.child1 && (
            <button
              onClick={() => handleSaveAndContinue('child1')}
              className="w-full text-white py-3 rounded-lg font-medium text-lg"
              style={{ backgroundColor: buttonColors.child1 }}
            >
              Continuar como {children.child1}
            </button>
          )}
          
          {children.child2 && (
            <button
              onClick={() => handleSaveAndContinue('child2')}
              className="w-full text-white py-3 rounded-lg font-medium text-lg"
              style={{ backgroundColor: buttonColors.child2 }}
            >
              Continuar como {children.child2}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Fallback por si acaso
  return null;
};

export default SetupScreen;
