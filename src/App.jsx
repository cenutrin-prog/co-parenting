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
              onClick={() => {
                setCurrentUser('parent1');
                setStep('main');
              }}
              className="w-full text-white py-4 rounded-lg font-medium text-lg"
              style={{ backgroundColor: '#86efac', color: '#065f46' }}
            >
              Continuar como {parents.parent1}
            </button>
            
            <button
              onClick={() => {
                setCurrentUser('parent2');
                setStep('main');
              }}
              className="w-full text-white py-4 rounded-lg font-medium text-lg"
              style={{ backgroundColor: '#fde047', color: '#713f12' }}
            >
              Continuar como {parents.parent2}
            </button>
            
            <button
              onClick={() => {
                setCurrentUser('child1');
                setStep('main');
              }}
              className="w-full text-white py-4 rounded-lg font-medium text-lg"
              style={{ backgroundColor: '#60a5fa', color: '#1e3a8a' }}
            >
              Continuar como {children.child1}
            </button>
            
            <button
              onClick={() => {
                setCurrentUser('child2');
                setStep('main');
              }}
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
              onChange={(e) => {
                const newParents = {...parents, parent1: e.target.value};
                setParents(newParents);
              }}
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
              onChange={(e) => {
                const newParents = {...parents, parent2: e.target.value};
                setParents(newParents);
              }}
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
              onChange={(e) => {
                const newParents = {...parents, other: e.target.value};
                setParents(newParents);
              }}
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
              onChange={(e) => {
                const newChildren = {...children, child1: e.target.value};
                setChildren(newChildren);
              }}
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
              onChange={(e) => {
                const newChildren = {...children, child2: e.target.value};
                setChildren(newChildren);
              }}
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

  const DailyView = () => {
    const dateStr = formatDate(currentDate);
    const dayName = daysOfWeek[currentDate.getDay()];

    return (
      <div className="p-2">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 1);
            setCurrentDate(d);
          }} className="p-1"><ChevronLeft size={20} /></button>
          <div className="text-sm font-medium">{dayName} {currentDate.getDate()}/{currentDate.getMonth() + 1}</div>
          <button onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 1);
            setCurrentDate(d);
          }} className="p-1"><ChevronRight size={20} /></button>
        </div>

        {periods.map(period => (
          <div key={period} className="mb-3 border rounded p-2">
            <div className="text-xs font-bold mb-2 uppercase">{period}</div>
            <div className="grid grid-cols-2 gap-2">
              {['child1', 'child2'].map(child => (
                <div key={child} className="border rounded p-2">
                  <div className="text-xs font-medium mb-1">{children[child]}</div>
                  <select
                    value={schedule[getScheduleKey(currentDate, child, period)] || ''}
                    onChange={(e) => setSchedule({...schedule, [getScheduleKey(currentDate, child, period)]: e.target.value})}
                    className="w-full text-xs p-1 border rounded"
                    style={{ backgroundColor: schedule[getScheduleKey(currentDate, child, period)] ? colors[schedule[getScheduleKey(currentDate, child, period)]] + '20' : 'white' }}
                  >
                    <option value="">Seleccionar</option>
                    <option value="parent1">{parents.parent1}</option>
                    <option value="parent2">{parents.parent2}</option>
                    {parents.other && <option value="other">{parents.other}</option>}
                  </select>
                  <input
                    type="text"
                    placeholder="Nota..."
                    value={notes[getScheduleKey(currentDate, child, period)] || ''}
                    onChange={(e) => setNotes({...notes, [getScheduleKey(currentDate, child, period)]: e.target.value})}
                    className="w-full text-xs p-1 border rounded mt-1"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-4 border-t pt-3">
          <div className="text-xs font-bold mb-2">Resumen del Mes</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {['child1', 'child2'].map(child => (
              <div key={child} className="border rounded p-2">
                <div className="font-medium mb-1">{children[child]}</div>
                {['parent1', 'parent2', ...(parents.other ? ['other'] : [])].map(parent => {
                  const count = Object.keys(schedule).filter(k => {
                    const [d, c, p] = k.split('_');
                    return c === child && schedule[k] === parent;
                  }).length;
                  return (
                    <div key={parent} className="flex justify-between" style={{ color: colors[parent] }}>
                      <span>{parents[parent]}:</span>
                      <span className="font-bold">{count}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const WeekView = () => {
    const weekDates = getWeekDates(currentDate);

    return (
      <div className="p-2 overflow-x-auto">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 7);
            setCurrentDate(d);
          }} className="p-1"><ChevronLeft size={18} /></button>
          <div className="text-xs font-medium">Semana {Math.ceil(currentDate.getDate() / 7)}</div>
          <button onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 7);
            setCurrentDate(d);
          }} className="p-1"><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs">
          {weekDates.map((date, i) => (
            <div key={i} className="border rounded p-1">
              <div className="font-bold text-center mb-1">{daysOfWeek[date.getDay()]} {date.getDate()}</div>
              {periods.map(period => (
                <div key={period} className="mb-1">
                  <div className="text-xs font-medium">{period[0].toUpperCase()}</div>
                  {['child1', 'child2'].map(child => {
                    const parent = schedule[getScheduleKey(date, child, period)];
                    return (
                      <div key={child} className="text-xs px-1 rounded" style={{ backgroundColor: parent ? colors[parent] + '40' : '#f3f4f6' }}>
                        {parent ? parents[parent].substring(0, 3) : '-'}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const MonthView = () => {
    const monthDates = getMonthDates(currentDate);

    return (
      <div className="p-2">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => {
            const d = new Date(currentDate);
            d.setMonth(d.getMonth() - 1);
            setCurrentDate(d);
          }} className="p-1"><ChevronLeft size={18} /></button>
          <div className="text-sm font-medium">{currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</div>
          <button onClick={() => {
            const d = new Date(currentDate);
            d.setMonth(d.getMonth() + 1);
            setCurrentDate(d);
          }} className="p-1"><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {daysOfWeek.map(day => (
            <div key={day} className="text-xs font-bold text-center">{day}</div>
          ))}
          {monthDates.map((date, i) => (
            <div key={i} className="border rounded p-1 min-h-16">
              {date && (
                <>
                  <div className="text-xs font-bold">{date.getDate()}</div>
                  {periods.map(period => (
                    <div key={period} className="flex gap-0.5">
                      {['child1', 'child2'].map(child => {
                        const parent = schedule[getScheduleKey(date, child, period)];
                        return (
                          <div key={child} className="flex-1 h-1.5 rounded" style={{ backgroundColor: parent ? colors[parent] : '#e5e7eb' }} />
                        );
                      })}
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const StatsView = () => {
    const stats = getStats();

    return (
      <div className="p-2 overflow-x-auto">
        <div className="text-sm font-bold mb-3">Estadísticas Detalladas</div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-1 text-left">Período</th>
              <th className="border p-1" colSpan={3}>{children.child1}</th>
              <th className="border p-1" colSpan={3}>{children.child2}</th>
              <th className="border p-1">Total</th>
            </tr>
            <tr className="bg-gray-50">
              <th className="border p-1"></th>
              <th className="border p-1">M</th>
              <th className="border p-1">T</th>
              <th className="border p-1">N</th>
              <th className="border p-1">M</th>
              <th className="border p-1">T</th>
              <th className="border p-1">N</th>
              <th className="border p-1"></th>
            </tr>
          </thead>
          <tbody>
            {['parent1', 'parent2', ...(parents.other ? ['other'] : [])].map(parent => (
              <React.Fragment key={parent}>
                <tr style={{ backgroundColor: colors[parent] + '10' }}>
                  <td className="border p-1 font-medium">{parents[parent]} - Total</td>
                  <td className="border p-1 text-center">{stats.child1[parent].total}</td>
                  <td className="border p-1 text-center">{stats.child1[parent].total}</td>
                  <td className="border p-1 text-center">{stats.child1[parent].total}</td>
                  <td className="border p-1 text-center">{stats.child2[parent].total}</td>
                  <td className="border p-1 text-center">{stats.child2[parent].total}</td>
                  <td className="border p-1 text-center">{stats.child2[parent].total}</td>
                  <td className="border p-1 text-center font-bold">{stats.child1[parent].total + stats.child2[parent].total}</td>
                </tr>
                <tr style={{ backgroundColor: colors[parent] + '08' }}>
                  <td className="border p-1 pl-4">L-V</td>
                  <td className="border p-1 text-center">{stats.child1[parent].weekday}</td>
                  <td className="border p-1 text-center">{stats.child1[parent].weekday}</td>
                  <td className="border p-1 text-center">{stats.child1[parent].weekday}</td>
                  <td className="border p-1 text-center">{stats.child2[parent].weekday}</td>
                  <td className="border p-1 text-center">{stats.child2[parent].weekday}</td>
                  <td className="border p-1 text-center">{stats.child2[parent].weekday}</td>
                  <td className="border p-1 text-center">{stats.child1[parent].weekday + stats.child2[parent].weekday}</td>
                </tr>
                <tr style={{ backgroundColor: colors[parent] + '08' }}>
                  <td className="border p-1 pl-4">S-D</td>
                  <td className="border p-1 text-center">{stats.child1[parent].weekend}</td>
                  <td className="border p-1 text-center">{stats.child1[parent].weekend}</td>
                  <td className="border p-1 text-center">{stats.child1[parent].weekend}</td>
                  <td className="border p-1 text-center">{stats.child2[parent].weekend}</td>
                  <td className="border p-1 text-center">{stats.child2[parent].weekend}</td>
                  <td className="border p-1 text-center">{stats.child2[parent].weekend}</td>
                  <td className="border p-1 text-center">{stats.child1[parent].weekend + stats.child2[parent].weekend}</td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (step === 'setup') {
    return <SetupScreen />;
  }

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-white">
      <div className="bg-blue-600 text-white p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} />
          <span className="font-bold text-sm">CoParenting</span>
        </div>
        <button onClick={() => setStep('setup')} className="text-xs bg-blue-700 px-2 py-1 rounded">
          {currentUser === 'parent1' ? parents.parent1 : currentUser === 'parent2' ? parents.parent2 : currentUser === 'child1' ? children.child1 : children.child2}
        </button>
      </div>

      <div className="flex gap-1 p-2 border-b overflow-x-auto">
        <button
          onClick={() => setCurrentView('daily')}
          className={`px-3 py-1 text-xs rounded flex items-center gap-1 whitespace-nowrap ${currentView === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          <Calendar size={14} />
          Día
        </button>
        <button
          onClick={() => setCurrentView('week')}
          className={`px-3 py-1 text-xs rounded whitespace-nowrap ${currentView === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Semana
        </button>
        <button
          onClick={() => setCurrentView('month')}
          className={`px-3 py-1 text-xs rounded whitespace-nowrap ${currentView === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Mes
        </button>
        <button
          onClick={() => setCurrentView('stats')}
          className={`px-3 py-1 text-xs rounded flex items-center gap-1 whitespace-nowrap ${currentView === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          <BarChart3 size={14} />
          Estadísticas
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {currentView === 'daily' && <DailyView />}
        {currentView === 'week' && <WeekView />}
        {currentView === 'month' && <MonthView />}
        {currentView === 'stats' && <StatsView />}
      </div>
    </div>
  );
};

export default CoParentingApp;
