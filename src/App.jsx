import React, { useState } from 'react';
import { Calendar, Users, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import SetupScreen from './SetupScreen';

const CoParentingApp = () => {
  const savedParents = typeof window !== 'undefined' ? localStorage.getItem('coparenting_parents') : null;
  const savedChildren = typeof window !== 'undefined' ? localStorage.getItem('coparenting_children') : null;

  const [step, setStep] = useState('setup');
  const [showNameEntry, setShowNameEntry] = useState(!savedParents || !savedChildren);
  const [parents, setParents] = useState(savedParents ? JSON.parse(savedParents) : { parent1: '', parent2: '', other: '' });
  const [children, setChildren] = useState(savedChildren ? JSON.parse(savedChildren) : { child1: '', child2: '' });

  // colores: parent1 = Papá (verde), parent2 = Mamá (amarillo)
  const [colors] = useState({ parent1: '#86efac', parent2: '#fde047', child1: '#60a5fa', child2: '#f9a8d4', other: '#10B981' });
  const [borderColors] = useState({ parent1: '#065f46', parent2: '#713f12', child1: '#1e3a8a', child2: '#831843', other: '#065f46' });

  const [currentUser, setCurrentUser] = useState(null); // 'parent1'|'parent2'|'child1'|'child2'
  const [schedule, setSchedule] = useState({}); // keys: YYYY-MM-DD_child_period -> 'parent1'|'parent2'|'other'
  const [notes, setNotes] = useState({});      // keys: YYYY-MM-DD_child_period -> text
  const [currentView, setCurrentView] = useState('week'); // 'daily'|'week'|'month'|'stats'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [popupObs, setPopupObs] = useState(null); // { text } or null

  const periods = ['Mañana', 'Tarde', 'Noche'];
  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // persistir nombres
  const saveAndContinue = (user) => {
    localStorage.setItem('coparenting_parents', JSON.stringify(parents));
    localStorage.setItem('coparenting_children', JSON.stringify(children));
    setCurrentUser(user);
    setShowNameEntry(false);
    setStep('main');
    setCurrentView('week');
  };

  // utilidades
  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toISOString().split('T')[0];
  };
  const getScheduleKey = (date, child, period) => `${formatDate(date)}_${child}_${period}`;

  // semana empezando Lunes
  const getWeekDates = (date) => {
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
  };

  const getMonthDates = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dates = [];
    const firstWeekDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < firstWeekDay; i++) dates.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) dates.push(new Date(year, month, i));
    return dates;
  };

  // Manejo estable de textarea: claves estables basadas en fecha-string, child y periodo.
  // Cambios en notes usan función prev para evitar referencias rotas.

  // ---------- VISTAS ----------
  const DailyView = () => {
    const dateKey = formatDate(currentDate);
    return (
      <div className="p-2" style={{ fontSize: 12 }}>
        {periods.map((period) => (
          <div key={period} className="mb-2 border rounded p-1">
            <div className="text-xs font-bold mb-1 uppercase">{period}</div>

            <div className="grid grid-cols-2 gap-2">
              {['child1', 'child2'].map((child) => {
                const key = getScheduleKey(currentDate, child, period);
                return (
                  <div key={key} className="border rounded p-1">
                    <div className="text-xs font-medium mb-1">{children[child] || (child === 'child1' ? 'Hijo 1' : 'Hijo 2')}</div>

                    <select
                      value={schedule[key] || ''}
                      onChange={(e) => setSchedule(prev => ({ ...prev, [key]: e.target.value }))}
                      disabled={currentUser === 'child1' || currentUser === 'child2'}
                      className="w-full text-xs p-1 border rounded"
                      style={{ backgroundColor: schedule[key] ? colors[schedule[key]] + '40' : 'white' }}
                    >
                      <option value="">Seleccionar</option>
                      <option value="parent1">{parents.parent1 || 'Papá'}</option>
                      <option value="parent2">{parents.parent2 || 'Mamá'}</option>
                      {parents.other && <option value="other">{parents.other}</option>}
                    </select>

                    <textarea
                      key={`ta_${key}`} // clave estable evita remount inesperado
                      value={notes[key] || ''}
                      onChange={(e) => setNotes(prev => ({ ...prev, [key]: e.target.value }))}
                      disabled={currentUser === 'child1' || currentUser === 'child2'}
                      className="w-full text-xs p-1 border rounded mt-1"
                      style={{ minHeight: 44, resize: 'vertical' }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const WeekView = () => {
    const weekDates = getWeekDates(currentDate);
    const firstMonth = weekDates[0].toLocaleDateString('es-ES', { month: 'long' });
    const lastMonth = weekDates[6].toLocaleDateString('es-ES', { month: 'long' });
    const monthLabel = firstMonth === lastMonth ? firstMonth : `${firstMonth} / ${lastMonth}`;

    // Decide qué niños mostrar: si perfil es childX, solo su info; si padre/madre, mostrar ambos hijos.
    const childrenToShow = currentUser === 'child1' ? ['child1'] : currentUser === 'child2' ? ['child2'] : ['child1', 'child2'];

    return (
      <div className="p-1" style={{ fontSize: 11 }}>
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => { const d = new Date(currentDate); d.setDate(currentDate.getDate() - 7); setCurrentDate(new Date(d)); }} className="p-1"><ChevronLeft size={16} /></button>
          <div className="text-xs font-medium">{monthLabel}</div>
          <button onClick={() => { const d = new Date(currentDate); d.setDate(currentDate.getDate() + 7); setCurrentDate(new Date(d)); }} className="p-1"><ChevronRight size={16} /></button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)', gap: 4 }}>
          {/* columna izquierda con Mañana/Tarde/Noche */}
          <div></div>
          {weekDates.map((d, i) => (
            <div key={formatDate(d)} className="text-center font-bold text-[11px]">{daysOfWeek[i]} {d.getDate()}</div>
          ))}

          {periods.map((period) => (
            <React.Fragment key={period}>
              <div className="font-bold text-[11px]">{period}</div>

              {weekDates.map((d) => (
                <div key={`${formatDate(d)}_${period}`} className="border rounded p-1 min-h-[56px]" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {childrenToShow.map((child) => {
                    const key = getScheduleKey(d, child, period);
                    const assigned = schedule[key];
                    const obs = notes[key] || '';
                    // Si perfil es padre/madre, mostramos nombre del hijo en color del hijo (child color) cuando ese hijo está asignado a ese padre en esa franja.
                    if (currentUser === 'parent1' || currentUser === 'parent2') {
                      // mostrar para cada hijo: su nombre si en esa franja ese hijo está con este padre
                      const isWithThisParent = assigned === currentUser;
                      return (
                        <React.Fragment key={key}>
                          <div className="text-[10px] text-center rounded" style={{ backgroundColor: isWithThisParent ? colors[child] : '#f3f4f6' }}>
                            {isWithThisParent ? children[child] || (child==='child1'?'Hijo 1':'Hijo 2') : '-'}
                          </div>
                          <div className="text-[8px] text-center">{obs || '-'}</div>
                        </React.Fragment>
                      );
                    } else {
                      // perfil hijo: mostramos Papá/Mamá en la franja superior y observaciones debajo
                      return (
                        <React.Fragment key={key}>
                          <div className="text-[10px] text-center rounded" style={{ backgroundColor: assigned ? colors[assigned] : '#f3f4f6' }}>
                            {assigned ? (assigned === 'parent1' ? 'Papá' : assigned === 'parent2' ? 'Mamá' : parents.other || 'Otro') : '-'}
                          </div>
                          <div className="text-[8px] text-center">{obs || ''}</div>
                        </React.Fragment>
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

  const MonthView = () => {
    const monthDates = getMonthDates(currentDate);
    const monthLabel = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    // padres ven 3 franjas horizontales por día: mañana/tarde/noche con nombre del hijo (color del hijo) o guión
    return (
      <div className="p-1" style={{ fontSize: 10 }}>
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => { const d = new Date(currentDate); d.setMonth(currentDate.getMonth() - 1); setCurrentDate(new Date(d)); }} className="p-1"><ChevronLeft size={16} /></button>
          <div className="text-xs font-medium">{monthLabel}</div>
          <button onClick={() => { const d = new Date(currentDate); d.setMonth(currentDate.getMonth() + 1); setCurrentDate(new Date(d)); }} className="p-1"><ChevronRight size={16} /></button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {daysOfWeek.map(d => <div key={d} className="text-[9px] font-bold text-center">{d}</div>)}

          {monthDates.map((date, idx) => {
            const dateKey = date ? formatDate(date) : `empty-${idx}`;
            return (
              <div key={dateKey} className="border rounded p-1 min-h-[72px] flex flex-col justify-between">
                {date ? (
                  <>
                    {periods.map((period) => {
                      // para cada periodo mostrar solo un recuadro horizontal por día cuando el perfil es padre
                      if (currentUser === 'parent1' || currentUser === 'parent2') {
                        // buscamos si child1 o child2 está asignado a este padre en este periodo
                        const childMorning = schedule[getScheduleKey(date, 'child1', period)] === currentUser ? 'child1' : null;
                        const child2Assigned = schedule[getScheduleKey(date, 'child2', period)] === currentUser ? 'child2' : null;
                        // priorizar mostrar child1 then child2 if both? mostramos ambos: nombre si tiene
                        const nameToShow = childMorning ? (children[childMorning] || (childMorning==='child1'?'Hijo 1':'Hijo 2')) : (child2Assigned ? (children[child2Assigned] || (child2Assigned==='child1'?'Hijo 1':'Hijo 2')) : '-');
                        const hasObs = !!(notes[getScheduleKey(date, 'child1', period)] || notes[getScheduleKey(date, 'child2', period)]);
                        return (
                          <div key={`${dateKey}_${period}`} className="text-[9px] text-center border-b py-0.5" style={{ backgroundColor: nameToShow !== '-' ? (nameToShow === children.child1 ? colors.child1 : nameToShow === children.child2 ? colors.child2 : '#f3f4f6') : '#f3f4f6' }}>
                            <span>{nameToShow}</span>{hasObs ? <span style={{ marginLeft: 4 }}>*</span> : null}
                          </div>
                        );
                      } else {
                        // perfil hijo: mostrar Papá/Mamá o guión y * si hay observaciones
                        const assignedParent = schedule[getScheduleKey(date, currentUser, period)];
                        const obsText = notes[getScheduleKey(date, currentUser, period)];
                        return (
                          <div key={`${dateKey}_${period}`} className="text-[9px] text-center border-b py-0.5" style={{ backgroundColor: assignedParent ? colors[assignedParent] : '#f3f4f6' }}>
                            <span>{assignedParent ? (assignedParent === 'parent1' ? 'Papá' : assignedParent === 'parent2' ? 'Mamá' : parents.other || 'Otro') : '-'}</span>{obsText ? <span style={{ marginLeft: 4 }}>*</span> : null}
                          </div>
                        );
                      }
                    })}
                  </>
                ) : (
                  <div className="text-center text-[9px]">-</div>
                )}
              </div>
            );
          })}
        </div>

        {/* popup observaciones */}
        {popupObs && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center" onClick={() => setPopupObs(null)}>
            <div className="bg-white p-3 rounded max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="text-sm">{popupObs}</div>
              <div className="mt-2 text-right">
                <button onClick={() => setPopupObs(null)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ---------- RENDER PRINCIPAL ----------
  if (step === 'setup') {
    return <SetupScreen
      saveAndContinue={saveAndContinue}
      parents={parents} setParents={setParents}
      children={children} setChildren={setChildren}
      showNameEntry={showNameEntry} setShowNameEntry={setShowNameEntry}
    />;
  }

  const topBarColor = currentUser ? colors[currentUser] : '#3b82f6';
  const profileBorder = currentUser ? borderColors[currentUser] : '#ffffff';
  const displayName = currentUser === 'child1' ? children.child1 : currentUser === 'child2' ? children.child2 : currentUser === 'parent1' ? parents.parent1 : currentUser === 'parent2' ? parents.parent2 : 'Usuario';

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-white">
      <div className="flex items-center justify-between p-2" style={{ backgroundColor: topBarColor }}>
        <div className="flex items-center gap-2 text-white">
          <Users size={18} />
          <span className="font-bold text-sm">CoParenting</span>
        </div>
        <button
          onClick={() => { setStep('setup'); setShowNameEntry(false); }}
          className="text-xs px-2 py-1 rounded border-2 font-medium"
          style={{ borderColor: profileBorder, backgroundColor: 'white', color: topBarColor }}
        >
          {displayName}
        </button>
      </div>

      <div className="flex gap-1 p-2 border-b overflow-x-auto">
        {!(currentUser === 'child1' || currentUser === 'child2') && (
          <button onClick={() => setCurrentView('daily')} className={`px-3 py-1 text-xs rounded ${currentView === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
            <Calendar size={14} /> Día
          </button>
        )}
        <button onClick={() => setCurrentView('week')} className={`px-3 py-1 text-xs rounded ${currentView === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Semana</button>
        <button onClick={() => setCurrentView('month')} className={`px-3 py-1 text-xs rounded ${currentView === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Mes</button>
        {!(currentUser === 'child1' || currentUser === 'child2') && (
          <button onClick={() => setCurrentView('stats')} className={`px-3 py-1 text-xs rounded ${currentView === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
            <BarChart3 size={14} /> Estadísticas
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {currentView === 'daily' && <DailyView />}
        {currentView === 'week' && <WeekView />}
        {currentView === 'month' && <MonthView />}
      </div>
    </div>
  );
};

export default CoParentingApp;
