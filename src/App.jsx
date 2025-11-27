import React, { useState } from 'react';
import { Calendar, Users, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';

const CoParentingApp = () => {
  // Inicializar con datos guardados o vacíos
  const savedParents = typeof window !== 'undefined' ? localStorage.getItem('coparenting_parents') : null;
  const savedChildren = typeof window !== 'undefined' ? localStorage.getItem('coparenting_children') : null;
  
  const [step, setStep] = useState('setup');
  const [showNameEntry, setShowNameEntry] = useState(!savedParents || !savedChildren);
  const [parents, setParents] = useState(savedParents ? JSON.parse(savedParents) : { parent1: '', parent2: '', other: '' });
  const [children, setChildren] = useState(savedChildren ? JSON.parse(savedChildren) : { child1: '', child2: '' });
  const [colors] = useState({ parent1: '#86efac', parent2: '#fde047', child1: '#60a5fa', child2: '#f9a8d4', other: '#10B981' });
  const [currentUser, setCurrentUser] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [notes, setNotes] = useState({});
  const [currentView, setCurrentView] = useState('daily');
  const [currentDate, setCurrentDate] = useState(new Date());

  const periods = ['mañana', 'tarde', 'noche'];
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Guardar datos cuando cambien
  const saveAndContinue = (user) => {
    localStorage.setItem('coparenting_parents', JSON.stringify(parents));
    localStorage.setItem('coparenting_children', JSON.stringify(children));
    setCurrentUser(user);
    setShowNameEntry(false);
    setStep('main');
  };

  const getWeekDates = (date) => {
    const curr = new Date(date);
    const first = curr.getDate() - curr.getDay();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(curr);
      d.setDate(first + i);
      return d;
    });
  };

  const getMonthDates = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dates = [];
    
    for (let i = 0; i < firstDay.getDay(); i++) {
      dates.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      dates.push(new Date(year, month, i));
    }
    
    return dates;
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getScheduleKey = (date, child, period) => {
    return `${formatDate(date)}_${child}_${period}`;
  };

  const getStats = () => {
    const stats = {
      child1: { parent1: { total: 0, weekday: 0, weekend: 0 }, parent2: { total: 0, weekday: 0, weekend: 0 }, other: { total: 0, weekday: 0, weekend: 0 } },
      child2: { parent1: { total: 0, weekday: 0, weekend: 0 }, parent2: { total: 0, weekday: 0, weekend: 0 }, other: { total: 0, weekday: 0, weekend: 0 } }
    };

    Object.keys(schedule).forEach(key => {
      const [dateStr, child, period] = key.split('_');
      const date = new Date(dateStr);
      const day = date.getDay();
      const isWeekend = day === 0 || day === 6;
      const parent = schedule[key];

      if (parent && stats[child] && stats[child][parent]) {
        stats[child][parent].total++;
        if (isWeekend) {
          stats[child][parent].weekend++;
        } else {
          stats[child][parent].weekday++;
        }
      }
    });

    return stats;
  };

  const SetupScreen = () => {
    // Si ya hay nombres guardados y no se quiere editar, mostrar solo botones
    if (!showNameEntry && parents.parent1 && parents.parent2 && children.child1 && children.child2) {
      return (
        <div className="p-4 max-w-md mx-auto bg-white min-h-screen flex flex-col justify-center">
          <h1 className="text-2xl font-bold text-center mb-8 text-blue-600">CoParenting</h1>
          
          <div className="space-y-3">
            <button
              onClick={() => { setCurrentUser('parent1'); setStep('main'); }}
              className="w-full text-white py-4 rounded-lg font-medium text-lg"
              style={{ backgroundColor: '#86efac', color: '#065f46' }}
            >
              Continuar como {parents.parent1}
            </button>
            
            <button
              onClick={() => { setCurrentUser('parent2'); setStep('main'); }}
              className="w-full text-white py-4 rounded-lg font-medium text-lg"
              style={{ backgroundColor: '#fde047', color: '#713f12' }}
            >
              Continuar como {parents.parent2}
            </button>
            
            <button
              onClick={() => { setCurrentUser('child1'); setStep('main'); }}
              className="w-full text-white py-4 rounded-lg font-medium text-lg"
              style={{ backgroundColor: '#60a5fa', color: '#1e3a8a' }}
            >
              Continuar como {children.child1}
            </button>
            
            <button
              onClick={() => { setCurrentUser('child2'); setStep('main'); }}
              className="w-full text-white py-4 rounded-lg font-medium text-lg"
              style={{ backgroundColor: '#f9a8d4', color: '#831843' }}
            >
              Continuar como {children.child2}
            </button>
          </div>
          
          <div className="text-center mt-8">
            <button 
              onClick={() => setShowNameEntry(true)}
              className="text-blue-600 underline text-sm"
            >
              Volver a nombres
            </button>
          </div>
        </div>
      );
    }

    // Pantalla de entrada de nombres
    return (
      <div className="p-4 max-w-md mx-auto bg-white min-h-screen">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">CoParenting</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Padre</label>
            <input
              type="text"
              value={parents.parent1}
              onChange={(e) => setParents(prev => ({ ...prev, parent1: e.target.value }))}
              className="w-full px-3 py-2 text-base border-2 rounded focus:outline-none focus:border-green-400"
              placeholder="Nombre del padre"
              style={{ backgroundColor: '#86efac20' }}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Madre</label>
            <input
              type="text"
              value={parents.parent2}
              onChange={(e) => setParents(prev => ({ ...prev, parent2: e.target.value }))}
              className="w-full px-3 py-2 text-base border-2 rounded focus:outline-none focus:border-yellow-400"
              placeholder="Nombre de la madre"
              style={{ backgroundColor: '#fde04720' }}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Otro Cuidador (opcional)</label>
            <input
              type="text"
              value={parents.other}
              onChange={(e) => setParents(prev => ({ ...prev, other: e.target.value }))}
              className="w-full px-3 py-2 text-base border-2 rounded focus:outline-none focus:border-green-400"
              placeholder="Ej: Abuelos"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hijo/a 1</label>
            <input
              type="text"
              value={children.child1}
              onChange={(e) => setChildren(prev => ({ ...prev, child1: e.target.value }))}
              className="w-full px-3 py-2 text-base border-2 rounded focus:outline-none focus:border-blue-400"
              placeholder="Nombre del hijo/a 1"
              style={{ backgroundColor: '#60a5fa20' }}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hijo/a 2</label>
            <input
              type="text"
              value={children.child2}
              onChange={(e) => setChildren(prev => ({ ...prev, child2: e.target.value }))}
              className="w-full px-3 py-2 text-base border-2 rounded focus:outline-none focus:border-pink-400"
              placeholder="Nombre del hijo/a 2"
              style={{ backgroundColor: '#f9a8d420' }}
              autoComplete="off"
            />
          </div>
          
          <div className="space-y-2 pt-2">
            <button
              onClick={() => saveAndContinue('parent1')}
              className="w-full text-white py-3 rounded-lg font-medium text-base"
              style={{ backgroundColor: '#86efac', color: '#065f46' }}
              disabled={!parents.parent1 || !parents.parent2 || !children.child1 || !children.child2}
            >
              Continuar como {parents.parent1 || 'Padre'}
            </button>
            
            <button
              onClick={() => saveAndContinue('parent2')}
              className="w-full text-white py-3 rounded-lg font-medium text-base"
              style={{ backgroundColor: '#fde047', color: '#713f12' }}
              disabled={!parents.parent1 || !parents.parent2 || !children.child1 || !children.child2}
            >
              Continuar como {parents.parent2 || 'Madre'}
            </button>
            
            <button
              onClick={() => saveAndContinue('child1')}
              className="w-full text-white py-3 rounded-lg font-medium text-base"
              style={{ backgroundColor: '#60a5fa', color: '#1e3a8a' }}
              disabled={!parents.parent1 || !parents.parent2 || !children.child1 || !children.child2}
            >
              Continuar como {children.child1 || 'Hijo/a 1'}
            </button>
            
            <button
              onClick={() => saveAndContinue('child2')}
              className="w-full text-white py-3 rounded-lg font-medium text-base"
              style={{ backgroundColor: '#f9a8d4', color: '#831843' }}
              disabled={!parents.parent1 || !parents.parent2 || !children.child1 || !children.child2}
            >
              Continuar como {children.child2 || 'Hijo/a 2'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // El resto de tus vistas (DailyView, WeekView, MonthView, StatsView) se quedan exactamente igual
  // ...

  if (step === 'setup') {
    return <SetupScreen />;
  }

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-white">
      {/* Cabecera y selector de usuario */}
      {/* Menú de vistas y contenido */}
      {/* Aquí se mantiene todo igual que tu código original */}
    </div>
  );
};

export default CoParentingApp;
