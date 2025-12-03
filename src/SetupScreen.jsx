import React, { useState } from 'react';
import { supabase } from './supabaseClient.js';

const SetupScreen = ({ parents, setParents, children, setChildren, saveAndContinue, showNameEntry, setShowNameEntry }) => {
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('Mañana');

  const guardarAsignaciones = async () => {
    if (!selectedDay || !parents.parent1 || !parents.parent2 || !children.child1 || !children.child2) {
      alert('Rellena todos los campos antes de guardar.');
      return;
    }

    const padre1 = await supabase.from('padres').select('id').eq('nombre', parents.parent1).single();
    const padre2 = await supabase.from('padres').select('id').eq('nombre', parents.parent2).single();
    const hija1 = await supabase.from('hijas').select('id').eq('nombre', children.child1).single();
    const hija2 = await supabase.from('hijas').select('id').eq('nombre', children.child2).single();

    if (!padre1.data || !padre2.data || !hija1.data || !hija2.data) {
      alert('No se encontró algún padre o hija en la base de datos.');
      return;
    }

    const inserts = [
      { padre_id: padre1.data.id, hija_id: hija1.data.id, fecha: selectedDay, periodo: selectedPeriod },
      { padre_id: padre1.data.id, hija_id: hija2.data.id, fecha: selectedDay, periodo: selectedPeriod },
      { padre_id: padre2.data.id, hija_id: hija1.data.id, fecha: selectedDay, periodo: selectedPeriod },
      { padre_id: padre2.data.id, hija_id: hija2.data.id, fecha: selectedDay, periodo: selectedPeriod },
    ];

    const { data, error } = await supabase.from('asignaciones').insert(inserts);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      alert('Asignaciones guardadas correctamente.');
    }
  };

  if (!showNameEntry && parents.parent1 && parents.parent2 && children.child1 && children.child2) {
    return (
      <div className="p-4 max-w-md mx-auto bg-white min-h-screen flex flex-col justify-center">
        <h1 className="text-2xl font-bold text-center mb-8 text-blue-600">CoParenting</h1>
        <div className="space-y-3">
          <input type="date" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="w-full p-2 border rounded" />
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="w-full p-2 border rounded">
            <option value="Mañana">Mañana</option>
            <option value="Tarde">Tarde</option>
          </select>
          <button onClick={guardarAsignaciones} className="w-full text-white py-4 rounded-lg font-medium text-lg bg-green-500">
            Guardar todas las asignaciones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-white min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">CoParenting</h1>
    </div>
  );
};

export default SetupScreen;
