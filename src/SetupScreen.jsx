import React from 'react';

const SetupScreen = ({ parents, setParents, children, setChildren, setCurrentUser, setStep, currentUser, saveAndContinue }) => {
  const [tapCount, setTapCount] = React.useState(0);
  const [showFullMenu, setShowFullMenu] = React.useState(false);

  // Truco: pulsar 3 veces en el título para ver menú completo
  const handleTitleTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount >= 3) {
      setShowFullMenu(true);
      setTapCount(0);
    }
    // Reset después de 2 segundos si no llega a 3
    setTimeout(() => setTapCount(0), 2000);
  };

  const handleParentChange = (field, value) => {
    setParents(prev => ({ ...prev, [field]: value }));
  };

  const handleChildChange = (field, value) => {
    setChildren(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAndContinue = (user) => {
    localStorage.setItem('coparenting_parents', JSON.stringify(parents));
    localStorage.setItem('coparenting_children', JSON.stringify(children));
    localStorage.setItem('coparenting_currentUser', user);
    setCurrentUser(user);
    setStep('main');
  };

  const inputColors = {
    parent1: '#FFE4CC',
    parent2: '#D4F4DD',
    child1: '#FFF9C4',
    child2: '#D0F4F7',
    other: '#FFE0F0'
  };

  const buttonColors = {
    parent1: '#FF8C42',
    parent2: '#86efac',
    child1: '#FDD835',
    child2: '#00BCD4'
  };

  // Título clickeable (para el truco de 3 toques)
  const Title = () => (
    <h1 
      onClick={handleTitleTap}
      className="text-2xl font-bold text-center mb-8 text-blue-600 cursor-pointer select-none"
    >
      CoParenting
    </h1>
  );

  // VISTA PARA PADRE (parent1): muestra todo (inputs + todos los botones)
  // También se muestra si showFullMenu está activo (truco de 3 toques)
  if (!currentUser || currentUser === 'parent1' || showFullMenu) {
    return (
      <div className="p-4 max-w-md mx-auto bg-white min-h-screen flex flex-col justify-center">
        <Title />
        
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
        <Title />
        
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
        <Title />
        
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

  return null;
};

export default SetupScreen;
