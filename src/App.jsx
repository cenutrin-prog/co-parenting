import React, { useState, useCallback } from 'react';
import { Calendar, Users, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import SetupScreen from './SetupScreen';
import { supabase } from './supabaseClient.js';

const CoParentingApp = () => {
  // Estado inicial desde localStorage
  const savedParents = typeof window !== 'undefined' ? localStorage.getItem('coparenting_parents') : null;
  const savedChildren = typeof window !== 'undefined' ? localStorage.getItem('coparenting_children') : null;

  const [parents, setParents] = useState(savedParents ? JSON.parse(savedParents) : { parent1: '', parent2: '' });
  const [children, setChildren] = useState(savedChildren ? JSON.parse(savedChildren) : { child1: '', child2: '' });
  const [step, setStep] = useState(savedParents && savedChildren ? 'main' : 'setup');
  const [currentUser, setCurrentUser] = useState(null);

  // Colores y bordes
  const colors = { parent1: '#86efac', parent2: '#fde047', child1: '#60a5fa', child2: '#f9a8d4', other: '#10B981' };
  const borderColors = { parent1: '#065f46', parent2: '#713f12', child1: '#1e3a8a', child2: '#831843', other: '#065f46' };

  // Estado principal
  const [schedule, setSchedule] = useState({});
  const [notes, setNotes] = useState({});
  const [currentView, setCurrentView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [popupObs, setPopupObs] = useState(null);

  const periods = ['Mañana', 'Tarde', 'Noche'];
  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Persistir nombres y entrar
  const saveAndContinue = (user) => {
    localStorage.setItem('coparenting_parents', JSON.stringify(parents));
    localStorage.setItem('coparenting_children', JSON.stringify(children));
    setCurrentUser(user);
    setStep('main');
    setCurrentView('week');
  };

  // Utilidades de fecha y keys estables
  const formatDate = useCallback((d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toISOString().split('T')[0];
  }, []);

  const getScheduleKey = useCallback((date, child, period) => 
    `${formatDate(date)}_${child}_${period}`, [formatDate]
  );

  const getWeekDates = useCallback((date) => {
    const curr = new Date(date);
    const day = curr.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, []);

  const getMonthDates = useCallback((date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dates = [];
    const firstWeekDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < firstWeekDay; i++) dates.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) dates.push(new Date(year, month, i));
    return dates;
  }, []);

  const addDays = (d, days) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + days);
    return nd;
  };

  const addMonths = (d, months) => {
    const nd = new Date(d);
    nd.setMonth(nd.getMonth() + months);
    return nd;
  };

  // Handlers memorizados
  const handleNoteChange = useCallback((key, value) => {
    setNotes(prev => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  const handleScheduleChange = useCallback((key, value) => {
    setSchedule(prev => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  // Guardar schedule en Supabase
  const saveScheduleInSupabase = async () => {
    try {
      const keys = Object.keys(schedule).filter(k => schedule[k]);
      if (keys.length === 0) {
        alert('No hay asignaciones para guardar.');
        return;
      }

      const inserts = [];

      for (const k of keys) {
        const parts = k.split('_');
        if (parts.length < 3) continue;
        const fecha = parts[0];
        const childKey = parts[1];
        const periodo = parts.slice(2).join('_');
        const parentKey = schedule[k];
        const padreNombre = parents[parentKey];
        const hijaNombre = children[childKey];

        if (!padreNombre || !hijaNombre) continue;

        const { data: padreData, error: padreErr } = await supabase
          .from('padres')
          .select('id')
          .eq('nombre', padreNombre)
          .limit(1)
          .maybeSingle();

        if (padreErr || !padreData) {
          console.warn('Padre no encontrado:', padreNombre);
          continue;
        }

        const { data: hijaData, error: hijaErr } = await supabase
          .from('hijas')
          .select('id')
          .eq('nombre', hijaNombre)
          .limit(1)
          .maybeSingle();

        if (hijaErr || !hijaData) {
          console.warn('Hija no encontrada:', hijaNombre);
          continue;
        }

        inserts.push({
          padre_id: padreData.id,
          hija_id: hijaData.id,
          fecha,
          periodo
        });
      }

      if (inserts.length === 0) {
        alert('No se generaron inserts (comprueba que padres/hijas existen en la base de datos).');
        return;
      }

      const { data, error } = await supabase.from('asignaciones').insert(inserts);

      if (error) {
        console.error('Error insert asignaciones:', error);
        alert('Error guardando en Supabase: ' + (error.message || JSON.stringify(error)));
      } else {
        alert('Asignaciones guardadas correctamente.');
      }
    } catch (err) {
      console.error(err);
      alert('Error inesperado al guardar: ' + (err.message || err));
    }
  };

  // Componente de celda memoizado
  const DayPeriodCell = React.memo(({ scheduleKey, child, isDisabled }) => {
    const childName = children[child] || (child === 'child1' ? 'Hijo 1' : 'Hijo 2');
    const scheduleValue = schedule[scheduleKey] || '';
    const noteValue = notes[scheduleKey] || '';

    return (
      <div className="border rounded p-1">
        <div className="text-[10px] font-medium mb-1">{childName}</div>

        <select
          value={scheduleValue}
          onChange={(e) => handleScheduleChange(scheduleKey, e.target.value)}
          disabled={isDisabled}
          className="w-full text-[10px] p-1 border rounded"
          style={{ backgroundColor: scheduleValue ? colors[scheduleValue] + '40' : 'white' }}
        >
          <option value="">Seleccionar</option>
          <option value="parent1">{parents.parent1 || 'Papá'}</option>
          <option value="parent2">{parents.parent2 || 'Mamá'}</option>
          {parents.other && <option value="other">{parents.other}</option>}
        </select>

        <textarea
          key={scheduleKey}
          placeholder="Observaciones..."
          defaultValue={noteValue}
          onBlur={(e) => handleNoteChange(scheduleKey, e.target.value)}
          onChange={(e) => {
            notes[scheduleKey] = e.target.value;
          }}
          disabled={isDisabled}
          className="w-full text-[10px] p-1 border rounded mt-1"
          style={{ minHeight: 36, resize: 'vertical' }}
        />
      </div>
    );
  });

  // VISTAS
  const DailyView = () => {
    const isChildUser = currentUser === 'child1' || currentUser === 'child2';
    const childrenToShow = isChildUser ? [currentUser] : ['child1', 'child2'];

    return (
      <div className="p-1 flex flex-col gap-1" style={{ fontSize: 10 }}>
        <div className="flex justify-between items-center mb-1">
          <button onClick={() => setCurrentDate(d => addDays(d, -1))} className="px-2 py-1 border rounded text-[10px]">◀</button>
          <div className="font-bold text-[12px] text-center">
            {daysOfWeek[currentDate.getDay() === 0 ? 6 : currentDate.getDay()-1]} {currentDate.getDate()}
          </div>
          <button onClick={() => setCurrentDate(d => addDays(d, 1))} className="px-2 py-1 border rounded text-[10px]">▶</button>
        </div>
        {periods.map((period) => (
          <div key={period} className="mb-1 border rounded p-1">
            <div className="text-[10px] font-bold mb-1 uppercase">{period}</div>
            <div className="grid grid-cols-2 gap-1">
              {childrenToShow.map((child) => {
                const sk = getScheduleKey(currentDate, child, period);
                return (
                  <DayPeriodCell
                    key={sk}
                    scheduleKey={sk}
                    child={child}
                    isDisabled={isChildUser}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const WeekCalendar = ({ childFilter = null, showChildName = false }) => {
    const weekDates = getWeekDates(currentDate);
    const firstMonth = weekDates[0].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const lastMonth = weekDates[6].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const monthLabel = firstMonth === lastMonth ? firstMonth : `${firstMonth} / ${lastMonth}`;
    
    const childName = childFilter ? (children[childFilter] || (childFilter === 'child1' ? 'Hijo 1' : 'Hijo 2')).toUpperCase() : '';

    return (
      <div className="mb-1">
        {showChildName && (
          <div className="text-[9px] font-bold text-center mb-1">{childName}</div>
        )}
        <div className="text-[9px] font-medium text-center mb-1">{monthLabel}</div>
        
        <div className="grid" style={{ gridTemplateColumns: '30px repeat(7, 1fr)', gap: 1, fontSize: 8 }}>
          <div />
          {weekDates.map((d, i) => (
            <div key={formatDate(d)} className="text-center font-bold text-[8px]">
              {daysOfWeek[i]} {d.getDate()}
            </div>
          ))}

          {periods.map((period) => (
            <React.Fragment key={period}>
              <div className="font-bold text-[8px]">{period.substring(0, 3)}</div>
              {weekDates.map((d) => {
                const date = d;
                return (
                  <div 
                    key={`${formatDate(date)}_${period}`} 
                    className="border rounded p-0.5 min-h-[24px] flex items-center justify-center"
                  >
                    {(childFilter ? [childFilter] : ['child1', 'child2']).map((child) => {
                      const sk = getScheduleKey(date, child, period);
                      const assigned = schedule[sk];
                      const obs = notes[sk] || '';
                      
                      if (currentUser === 'parent1' || currentUser === 'parent2') {
                        const isWithThisParent = assigned === currentUser;
                        const displayName = isWithThisParent ? (children[child] || (child === 'child1' ? 'Hijo 1' : 'Hijo 2')) : '-';
                        return (
                          <div 
                            key={sk}
                            onClick={() => obs && setPopupObs(obs)}
                            className="text-[7px] text-center rounded px-0.5 cursor-pointer"
                            style={{ backgroundColor: isWithThisParent ? colors[child] : '#f3f4f6' }}
                          >
                            {displayName}
                            {obs && <span className="ml-0.5">*</span>}
                          </div>
                        );
                      } else {
                        const displayName = assigned ? (assigned === 'parent1' ? 'Papá' : assigned === 'parent2' ? 'Mamá' : parents.other || 'Otro') : '-';
                        return (
                          <div 
                            key={sk}
                            onClick={() => obs && setPopupObs(obs)}
                            className="text-[7px] text-center rounded px-0.5 cursor-pointer"
                            style={{ backgroundColor: assigned ? colors[assigned] : '#f3f4f6' }}
                          >
                            {displayName}
                            {obs && <span className="ml-0.5">*</span>}
                          </div>
                        );
                      }
                    })}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const GlobalWeekCalendar = () => {
    const weekDates = getWeekDates(currentDate);
    const caregivers = [
      { key: 'parent1', initial: (parents.parent1 || 'Papá')[0].toUpperCase() },
      { key: 'parent2', initial: (parents.parent2 || 'Mamá')[0].toUpperCase() },
      ...(parents.other ? [{ key: 'other', initial: parents.other[0].toUpperCase() }] : [])
    ];

    return (
      <div className="mb-2 border-t-2 pt-2">
        <div className="text-[9px] font-bold text-center mb-1">CALENDARIO GLOBAL</div>
        
        <div className="grid" style={{ gridTemplateColumns: '30px repeat(7, 1fr)', gap: 1, fontSize: 8 }}>
          <div />
          {weekDates.map((d, i) => (
            <div key={formatDate(d)} className="text-center font-bold text-[8px]">
              {daysOfWeek[i]} {d.getDate()}
            </div>
          ))}

          {periods.map((period) => (
            <React.Fragment key={period}>
              <div className="font-bold text-[8px]">{period.substring(0, 3)}</div>
              {weekDates.map((d) => (
                <div 
                  key={`${formatDate(d)}_${period}_global`} 
                  className="border rounded p-0.5 min-h-[28px]"
                >
                  {caregivers.map(caregiver => {
                    const child1Key = getScheduleKey(d, 'child1', period);
                    const child2Key = getScheduleKey(d, 'child2', period);
                    const child1Assigned = schedule[child1Key] === caregiver.key;
                    const child2Assigned = schedule[child2Key] === caregiver.key;
                    
                    const child1Initial = child1Assigned ? (children.child1 || 'Hijo 1')[0].toUpperCase() : '-';
                    const child2Initial = child2Assigned ? (children.child2 || 'Hijo 2')[0].toUpperCase() : '-';

                    return (
                      <div key={caregiver.key} className="flex items-center gap-0.5 mb-0.5 text-[7px]">
                        <span className="font-bold">{caregiver.initial}</span>
                        <span 
                          className="px-0.5 rounded"
                          style={{ backgroundColor: child1Assigned ? colors.child1 : '#f3f4f6' }}
                        >
                          {child1Initial}
                        </span>
                        <span 
                          className="px-0.5 rounded"
                          style={{ backgroundColor: child2Assigned ? colors.child2 : '#f3f4f6' }}
                        >
                          {child2Initial}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const WeekView = () => {
    const weekDates = getWeekDates(currentDate);
    const firstMonth = weekDates[0].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const lastMonth = weekDates[6].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const monthLabel = firstMonth === lastMonth ? firstMonth : `${firstMonth} / ${lastMonth}`;
    
    if (currentUser === 'child1' || currentUser === 'child2') {
      const firstChild = currentUser;
      const secondChild = currentUser === 'child1' ? 'child2' : 'child1';
      
      return (
        <div className="p-1" style={{ fontSize: 10 }}>
          <div className="flex items-center justify-between mb-1">
            <button onClick={() => setCurrentDate(d => addDays(d, -7))} className="p-1 text-[10px]">
              <ChevronLeft size={14} />
            </button>
            <div className="text-xs font-medium">Semana</div>
            <button onClick={() => setCurrentDate(d => addDays(d, 7))} className="p-1 text-[10px]">
              <ChevronRight size={14} />
            </button>
          </div>

          <WeekCalendar childFilter={firstChild} showChildName={true} />
          <WeekCalendar childFilter={secondChild} showChildName={true} />
        </div>
      );
    }

    const parentName = currentUser === 'parent1' ? parents.parent1.toUpperCase() : parents.parent2.toUpperCase();
    
    return (
      <div className="p-1" style={{ fontSize: 10 }}>
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => setCurrentDate(d => addDays(d, -7))} className="p-1 text-[10px]">
            <ChevronLeft size={14} />
          </button>
          <div className="text-xs font-medium">{monthLabel} - {parentName}</div>
          <button onClick={() => setCurrentDate(d => addDays(d, 7))} className="p-1 text-[10px]">
            <ChevronRight size={14} />
          </button>
        </div>

        <WeekCalendar />
        <GlobalWeekCalendar />
      </div>
    );
  };

  const MonthView = () => {
    const monthDates = getMonthDates(currentDate);
    const monthLabel = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    return (
      <div className="p-1" style={{ fontSize: 9 }}>
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => setCurrentDate(d => addMonths(d, -1))} className="p-1 text-[10px]">
            <ChevronLeft size={14} />
          </button>
          <div className="text-xs font-medium">{monthLabel}</div>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-1 text-[10px]">
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {daysOfWeek.map(d => (
            <div key={d} className="text-[8px] font-bold text-center">{d}</div>
          ))}

          {monthDates.map((date, idx) => {
            const dateKey = date ? formatDate(date) : `empty-${idx}`;
            return (
              <div key={dateKey} className="border rounded p-0.5 min-h-[50px] flex flex-col text-[8px]">
                {date ? (
                  <>
                    <div className="font-bold mb-0.5">{date.getDate()}</div>
                    {periods.map((period) => {
                      const assignedParent = schedule[getScheduleKey(date, 'child1', period)] === currentUser ? 'parent1' : schedule[getScheduleKey(date, 'child2', period)] === currentUser ? 'parent2' : null;
                      const obs = notes[getScheduleKey(date, 'child1', period)] || notes[getScheduleKey(date, 'child2', period)] || '';
                      return (
                        <div
                          key={`${dateKey}_${period}`}
                          onClick={() => obs && setPopupObs(obs)}
                          className="text-[7px] text-center border-b py-0.5 cursor-pointer"
                          style={{ backgroundColor: assignedParent ? colors[assignedParent] : '#f3f4f6' }}
                        >
                          {assignedParent ? (assignedParent === 'parent1' ? 'Papá' : 'Mamá') : '-'}
                          {obs && <span className="ml-0.5">*</span>}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="text-center text-[8px]">-</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // RENDER PRINCIPAL
  if (step === 'setup') {
    return (
      <SetupScreen
        parents={parents}
        setParents={setParents}
        children={children}
        setChildren={setChildren}
        setCurrentUser={setCurrentUser}
        setStep={setStep}
      />
    );
  }

  const topBarColor = currentUser ? colors[currentUser] : '#3b82f6';
  const profileBorder = currentUser ? borderColors[currentUser] : '#ffffff';
  const displayName = currentUser === 'child1' ? children.child1 : 
                      currentUser === 'child2' ? children.child2 : 
                      currentUser === 'parent1' ? parents.parent1 : 
                      currentUser === 'parent2' ? parents.parent2 : 'Usuario';

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-white">
      <div 
        className="flex items-center justify-between p-2" 
        style={{ backgroundColor: topBarColor }}
      >
        <div className="flex items-center gap-2 text-white">
          <Users size={18} />
          <span className="font-bold text-sm">CoParenting</span>
        </div>
        <button
          onClick={() => { setStep('setup'); }}
          className="text-xs px-2 py-1 rounded border-2 font-medium"
          style={{ 
            borderColor: profileBorder, 
            backgroundColor: 'white', 
            color: topBarColor 
          }}
        >
          {displayName}
        </button>
      </div>

      <div className="flex gap-1 p-2 border-b overflow-x-auto">
        {!(currentUser === 'child1' || currentUser === 'child2') && (
          <button 
            onClick={() => setCurrentView('daily')} 
            className={`px-3 py-1 text-xs rounded ${currentView === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            <Calendar size={14} /> Día
          </button>
        )}
        <button 
          onClick={() => setCurrentView('week')} 
          className={`px-3 py-1 text-xs rounded ${currentView === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Semana
        </button>
        <button 
          onClick={() => setCurrentView('month')} 
          className={`px-3 py-1 text-xs rounded ${currentView === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Mes
        </button>
        {!(currentUser === 'child1' || currentUser === 'child2') && (
          <>
          <button 
            onClick={() => setCurrentView('stats')} 
            className={`px-3 py-1 text-xs rounded ${currentView === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            <BarChart3 size={14} /> Estadísticas
          </button>
          <button
            onClick={saveScheduleInSupabase}
            className="px-3 py-1 text-xs rounded bg-green-600 text-white"
          >
            Guardar
          </button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {currentView === 'daily' && <DailyView />}
        {currentView === 'week' && <WeekView />}
        {currentView === 'month' && <MonthView />}
      </div>

      {popupObs && (
        <div 
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" 
          onClick={() => setPopupObs(null)}
        >
          <div 
            className="bg-white p-4 rounded-lg shadow-lg max-w-sm mx-4" 
            onClick={e => e.stopPropagation()}
          >
            <div className="text-xs font-bold mb-2">Observaciones:</div>
            <div className="text-sm mb-3">{popupObs}</div>
            <div className="text-right">
              <button 
                onClick={() => setPopupObs(null)} 
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoParentingApp;
