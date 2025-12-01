import React, { useState, useCallback } from 'react';
import { Calendar, Users, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import SetupScreen from './SetupScreen';

const CoParentingApp = () => {
  // --- Persistencia nombres ---
  const savedParents = typeof window !== 'undefined' ? localStorage.getItem('coparenting_parents') : null;
  const savedChildren = typeof window !== 'undefined' ? localStorage.getItem('coparenting_children') : null;

  const [step, setStep] = useState('setup');
  const [showNameEntry, setShowNameEntry] = useState(!savedParents || !savedChildren);
  const [parents, setParents] = useState(savedParents ? JSON.parse(savedParents) : { parent1: '', parent2: '', other: '' });
  const [children, setChildren] = useState(savedChildren ? JSON.parse(savedChildren) : { child1: '', child2: '' });

  // colores y bordes
  const colors = { parent1: '#86efac', parent2: '#fde047', child1: '#60a5fa', child2: '#f9a8d4', other: '#10B981' };
  const borderColors = { parent1: '#065f46', parent2: '#713f12', child1: '#1e3a8a', child2: '#831843', other: '#065f46' };

  // estado principal
  const [currentUser, setCurrentUser] = useState(null);
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
    setShowNameEntry(false);
    setStep('main');
    setCurrentView('week');
  };

  // --- utilidades de fecha y keys estables ---
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

  // Handlers memorizados para evitar recreación
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

  // Componente individual de celda memoizado
  const DayPeriodCell = React.memo(({ scheduleKey, child, isDisabled }) => {
    const childName = children[child] || (child === 'child1' ? 'Hijo 1' : 'Hijo 2');
    const scheduleValue = schedule[scheduleKey] || '';
    const noteValue = notes[scheduleKey] || '';

    return (
      <div className="border rounded p-1">
        <div className="text-xs font-medium mb-1">{childName}</div>

        <select
          value={scheduleValue}
          onChange={(e) => handleScheduleChange(scheduleKey, e.target.value)}
          disabled={isDisabled}
          className="w-full text-xs p-1 border rounded"
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
          className="w-full text-xs p-1 border rounded mt-1"
          style={{ minHeight: 44, resize: 'vertical' }}
        />
      </div>
    );
  });

  // ---------- VISTAS ----------
  const DailyView = () => {
    const isChildUser = currentUser === 'child1' || currentUser === 'child2';
    const childrenToShow = isChildUser ? [currentUser] : ['child1', 'child2'];

    return (
      <div className="p-2" style={{ fontSize: 12 }}>
        {periods.map((period) => (
          <div key={period} className="mb-2 border rounded p-1">
            <div className="text-xs font-bold mb-1 uppercase">{period}</div>

            <div className="grid grid-cols-2 gap-2">
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

  // Componente de calendario semanal individual
  const WeekCalendar = ({ childFilter = null, showChildName = false }) => {
    const weekDates = getWeekDates(currentDate);
    const firstMonth = weekDates[0].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const lastMonth = weekDates[6].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const monthLabel = firstMonth === lastMonth ? firstMonth : `${firstMonth} / ${lastMonth}`;
    
    const childName = childFilter ? (children[childFilter] || (childFilter === 'child1' ? 'Hijo 1' : 'Hijo 2')).toUpperCase() : '';

    return (
      <div className="mb-2">
        {showChildName && (
          <div className="text-[10px] font-bold text-center mb-1">{childName}</div>
        )}
        <div className="text-[10px] font-medium text-center mb-1">{monthLabel}</div>
        
        <div className="grid" style={{ gridTemplateColumns: '40px repeat(7, 1fr)', gap: 2, fontSize: 9 }}>
          <div />
          {weekDates.map((d, i) => (
            <div key={formatDate(d)} className="text-center font-bold text-[9px]">
              {daysOfWeek[i]} {d.getDate()}
            </div>
          ))}

          {periods.map((period) => (
            <React.Fragment key={period}>
              <div className="font-bold text-[9px]">{period.substring(0, 3)}</div>
              {weekDates.map((d) => (
                <div 
                  key={`${formatDate(d)}_${period}`} 
                  className="border rounded p-0.5 min-h-[24px] flex items-center justify-center"
                >
                  {(childFilter ? [childFilter] : ['child1', 'child2']).map((child) => {
                    const sk = getScheduleKey(d, child, period);
                    const assigned = schedule[sk];
                    const obs = notes[sk] || '';
                    
                    if (currentUser === 'parent1' || currentUser === 'parent2') {
                      const isWithThisParent = assigned === currentUser;
                      const displayName = isWithThisParent ? (children[child] || (child === 'child1' ? 'Hijo 1' : 'Hijo 2')) : '-';
                      return (
                        <div 
                          key={sk}
                          onClick={() => obs && setPopupObs(obs)}
                          className="text-[8px] text-center rounded px-0.5 cursor-pointer"
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
                          className="text-[8px] text-center rounded px-0.5 cursor-pointer"
                          style={{ backgroundColor: assigned ? colors[assigned] : '#f3f4f6' }}
                        >
                          {displayName}
                          {obs && <span className="ml-0.5">*</span>}
                        </div>
                      );
                    }
                  })}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  // Calendario GLOBAL para padres
  const GlobalWeekCalendar = () => {
    const weekDates = getWeekDates(currentDate);
    const caregivers = [
      { key: 'parent1', initial: (parents.parent1 || 'Papá')[0].toUpperCase() },
      { key: 'parent2', initial: (parents.parent2 || 'Mamá')[0].toUpperCase() },
      ...(parents.other ? [{ key: 'other', initial: parents.other[0].toUpperCase() }] : [])
    ];

    return (
      <div className="mb-2 border-t-2 pt-2">
        <div className="text-[10px] font-bold text-center mb-1">CALENDARIO GLOBAL</div>
        
        <div className="grid" style={{ gridTemplateColumns: '40px repeat(7, 1fr)', gap: 2, fontSize: 8 }}>
          <div />
          {weekDates.map((d, i) => (
            <div key={formatDate(d)} className="text-center font-bold text-[9px]">
              {daysOfWeek[i]} {d.getDate()}
            </div>
          ))}

          {periods.map((period) => (
            <React.Fragment key={period}>
              <div className="font-bold text-[9px]">{period.substring(0, 3)}</div>
              {weekDates.map((d) => (
                <div 
                  key={`${formatDate(d)}_${period}_global`} 
                  className="border rounded p-0.5 min-h-[32px]"
                >
                  {caregivers.map(caregiver => {
                    const child1Key = getScheduleKey(d, 'child1', period);
                    const child2Key = getScheduleKey(d, 'child2', period);
                    const child1Assigned = schedule[child1Key] === caregiver.key;
                    const child2Assigned = schedule[child2Key] === caregiver.key;
                    
                    const child1Initial = child1Assigned ? (children.child1 || 'Hijo 1')[0].toUpperCase() : '-';
                    const child2Initial = child2Assigned ? (children.child2 || 'Hijo 2')[0].toUpperCase() : '-';

                    return (
                      <div key={caregiver.key} className="flex items-center gap-0.5 mb-0.5 text-[8px]">
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
    
    // Si es perfil de hijo, mostrar ambos calendarios
    if (currentUser === 'child1' || currentUser === 'child2') {
      const firstChild = currentUser;
      const secondChild = currentUser === 'child1' ? 'child2' : 'child1';
      
      return (
        <div className="p-1" style={{ fontSize: 11 }}>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setCurrentDate(d => addDays(d, -7))} className="p-1">
              <ChevronLeft size={16} />
            </button>
            <div className="text-xs font-medium">Semana</div>
            <button onClick={() => setCurrentDate(d => addDays(d, 7))} className="p-1">
              <ChevronRight size={16} />
            </button>
          </div>

          <WeekCalendar childFilter={firstChild} showChildName={true} />
          <WeekCalendar childFilter={secondChild} showChildName={true} />
        </div>
      );
    }

    // Para padres, mostrar calendario normal + global
    const parentName = currentUser === 'parent1' ? parents.parent1.toUpperCase() : parents.parent2.toUpperCase();
    
    return (
      <div className="p-1" style={{ fontSize: 11 }}>
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setCurrentDate(d => addDays(d, -7))} className="p-1">
            <ChevronLeft size={16} />
          </button>
          <div className="text-xs font-medium">{monthLabel} - {parentName}</div>
          <button onClick={() => setCurrentDate(d => addDays(d, 7))} className="p-1">
            <ChevronRight size={16} />
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
      <div className="p-1" style={{ fontSize: 10 }}>
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => setCurrentDate(d => addMonths(d, -1))} className="p-1">
            <ChevronLeft size={16} />
          </button>
          <div className="text-xs font-medium">{monthLabel}</div>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-1">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {daysOfWeek.map(d => (
            <div key={d} className="text-[8px] font-bold text-center">{d}</div>
          ))}

          {monthDates.map((date, idx) => {
            const dateKey = date ? formatDate(date) : `empty-${idx}`;
            return (
              <div key={dateKey} className="border rounded p-0.5 min-h-[56px] flex flex-col">
                {date ? (
                  <>
                    <div className="text-[8px] font-bold mb-0.5">{date.getDate()}</div>
                    {periods.map((period) => {
                      if (currentUser === 'parent1' || currentUser === 'parent2') {
                        // Mostrar ambos hijos si están con este padre
                        const child1Assigned = schedule[getScheduleKey(date, 'child1', period)] === currentUser;
                        const child2Assigned = schedule[getScheduleKey(date, 'child2', period)] === currentUser;
                        
                        const obs1 = child1Assigned ? notes[getScheduleKey(date, 'child1', period)] : '';
                        const obs2 = child2Assigned ? notes[getScheduleKey(date, 'child2', period)] : '';
                        const hasObs = obs1 || obs2;
                        
                        const displayNames = [];
                        if (child1Assigned) displayNames.push(children.child1 || 'H1');
                        if (child2Assigned) displayNames.push(children.child2 || 'H2');
                        const displayText = displayNames.length > 0 ? displayNames.join(', ') : '-';
                        
                        const bg = child1Assigned && child2Assigned ? '#d1d5db' : 
                                   child1Assigned ? colors.child1 : 
                                   child2Assigned ? colors.child2 : '#f3f4f6';
                        
                        return (
                          <div 
                            key={`${dateKey}_${period}`} 
                            onClick={() => hasObs && setPopupObs(obs1 || obs2)}
                            className="text-[7px] text-center border-b py-0.5 cursor-pointer" 
                            style={{ backgroundColor: bg }}
                          >
                            <span>{displayText}</span>
                            {hasObs && <span className="ml-0.5">*</span>}
                          </div>
                        );
                      } else {
                        const assignedParent = schedule[getScheduleKey(date, currentUser, period)];
                        const obs = notes[getScheduleKey(date, currentUser, period)];
                        return (
                          <div 
                            key={`${dateKey}_${period}`} 
                            onClick={() => obs && setPopupObs(obs)}
                            className="text-[7px] text-center border-b py-0.5 cursor-pointer" 
                            style={{ backgroundColor: assignedParent ? colors[assignedParent] : '#f3f4f6' }}
                          >
                            <span>
                              {assignedParent ? (assignedParent === 'parent1' ? 'Papá' : assignedParent === 'parent2' ? 'Mamá' : parents.other || 'Otro') : '-'}
                            </span>
                            {obs && <span className="ml-0.5">*</span>}
                          </div>
                        );
                      }
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

  // ---------- RENDER PRINCIPAL ----------
  if (step === 'setup') {
    return (
      <SetupScreen
        saveAndContinue={saveAndContinue}
        parents={parents} 
        setParents={setParents}
        children={children} 
        setChildren={setChildren}
        showNameEntry={showNameEntry} 
        setShowNameEntry={setShowNameEntry}
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
          onClick={() => { setStep('setup'); setShowNameEntry(false); }}
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
          <button 
            onClick={() => setCurrentView('stats')} 
            className={`px-3 py-1 text-xs rounded ${currentView === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            <BarChart3 size={14} /> Estadísticas
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {currentView === 'daily' && <DailyView />}
        {currentView === 'week' && <WeekView />}
        {currentView === 'month' && <MonthView />}
      </div>

      {/* Popup de observaciones */}
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
