import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';

const SetupScreen = ({
  parents,
  setParents,
  children,
  setChildren,
  saveAndContinue,
  showNameEntry,
  setShowNameEntry
}) => {

  // Inicializa valores si vienen vacíos
  useEffect(() => {
    if (!parents.parent1) setParents(prev => ({ ...prev, parent1: '' }));
    if (!parents.parent2) setParents(prev => ({ ...prev, parent2: '' }));
    if (!parents.other) setParents(prev => ({ ...prev, other: '' }));
    if (!children.child1) setChildren(prev => ({ ...prev, child1: '' }));
    if (!children.child2) setChildren(prev => ({ ...prev, child2: '' }));
  }, []);

  const handleParentChange = (field, value) => {
    setParents(prev => ({ ...prev, [field]: value }));
  };

  const handleChildChange = (field, value) => {
    setChildren(prev => ({ ...prev, [field]: value }));
  };

  if (showNameEntry) {
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
            placeholder="Otro cuidador (opcional)"
            value={parents.other}
            onChange={(e) => handleParentChange("other", e.target.value)}
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

          <button
            onClick={() => {
              if (!parents.parent1 || !parents.parent2 || !children.child1 || !children.child2) {
                alert("Completa todos los campos obligatorios.");
                return;
              }

              // Guardado local opcional (para evitar errores si App.jsx no pasa todo perfecto)
              localStorage.setItem('coparenting_parents', JSON.stringify({ parents, children }));

              saveAndContinue("parent1");
            }}
            className="w-full text-white py-3 rounded-lg font-medium text-lg bg-blue-500"
          >
            Guardar y continuar
          </button>

        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-white min-h-screen flex flex-col justify-center">
      <h1 className="text-2xl font-bold text-center mb-8 text-blue-600">CoParenting</h1>

      <button
        onClick={() => setShowNameEntry(true)}
        className="w-full text-white py-3 rounded-lg font-medium text-lg bg-blue-500"
      >
        Cambiar nombres
      </button>
    </div>
  );
};

export default SetupScreen;
