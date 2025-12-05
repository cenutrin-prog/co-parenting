import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, Users, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import SetupScreen from './SetupScreen';
import { supabase } from './supabaseClient.js';

const CoParentingApp = () => {
  const savedParents = typeof window !== 'undefined' ? localStorage.getItem('coparenting_parents') : null;
  const savedChildren = typeof window !== 'undefined' ? localStorage.getItem('coparenting_children') : null;
  const savedUser = typeof window !== 'undefined' ? localStorage.getItem('coparenting_currentUser') : null;
  const [parents, setParents] = useState(savedParents ? JSON.parse(savedParents) : { parent1: '', parent2: '' });
  const [children, setChildren] = useState(savedChildren ? JSON.parse(savedChildren) : { child1: '', child2: '' });
  const [step, setStep] = useState(savedParents && savedChildren && savedUser ? 'main' : 'setup');
  const [currentUser, setCurrentUser] = useState(savedUser || null);
  const colors = { parent1: '#FF6B35', parent2: '#86efac', child1: '#FDD835', child2: '#00BCD4', other: '#FF69B4' };
  const borderColors = { parent1: '#CC4400', parent2: '#065f46', child1: '#C6A700', child2: '#00838F', other: '#C2185B' };
  const [schedule, setSchedule] = useState({});
  const [notes, setNotes] = useState({});
  const [currentView, setCurrentView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [popupObs, setPopupObs] = useState(null);
  const periods = ['Mañana', 'Tarde', 'Noche'];
  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const monthsShort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  // Truco: contador de toques en el título para desbloquear menú
  const [titleTapCount, setTitleTapCount] = useState(0);

  const handleTitleTap = () => {
    const newCount = titleTapCount + 1;
    setTitleTapCount(newCount);
    if (newCount >= 3) {
      setStep('setup');
      setTitleTapCount(0);
    }
    setTimeout(() => setTitleTapCount(0), 2000);
  };

  // Función para obtener el número de semana del año
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const saveAndContinue = (user) => {
    localStorage.setItem('coparenting_parents', JSON.stringify(parents));
    localStorage.setItem('coparenting_children', JSON.stringify(children));
    localStorage.setItem('coparenting_currentUser', user);
    setCurrentUser(user);
    setStep('main');
    setCurrentView('week');
  };

  const formatDate = useCallback((d) => {
    if (!d) return '';
    return new Date(d).toISOString().split('T')[0];
  }, []);

  const getScheduleKey = useCallback((date, child, period) => `${formatDate(date)}_${child}_${period}`, [formatDate]);

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

  const addDays = (d, days) => { const nd = new Date(d); nd.setDate(nd.getDate() + days); return nd; };
  const addMonths = (d, months) => { const nd = new Date(d); nd.setMonth(nd.getMonth() + months); return nd; };

  const handleNoteChange = useCallback((key, value) => {
    setNotes(prev => { if (prev[key] === value) return prev; return { ...prev, [key]: value }; });
  }, []);

  const handleScheduleChange = useCallback((key, value) => {
    setSchedule(prev => { if (prev[key] === value) return prev; return { ...prev, [key]: value }; });
  }, []);

  const loadScheduleFromSupabase = useCallback(async () => {
    try {
      const { data: asignaciones, error } = await supabase.from('asignaciones').select('id, padre_id, hija_id, fecha, periodo, observaciones');
      if (error) { console.error('Error cargando asignaciones:', error); return; }
      if (!asignaciones || asignaciones.length === 0) { console.log('No hay asignaciones guardadas'); return; }
      console.log('Asignaciones recibidas de Supabase:', asignaciones.length);
      
      const padreIds = [...new Set(asignaciones.map(a => a.padre_id))];
      const hijaIds = [...new Set(asignaciones.map(a => a.hija_id))];
      const { data: padresData } = await supabase.from('padres').select('id, nombre').in('id', padreIds);
      const { data: hijasData } = await supabase.from('hijas').select('id, nombre').in('id', hijaIds);
      
      const padresMap = {};
      const hijasMap = {};
      padresData?.forEach(p => { padresMap[p.id] = p.nombre; });
      hijasData?.forEach(h => { hijasMap[h.id] = h.nombre; });
      
      const newSchedule = {};
      const newNotes = {};
      
      asignaciones.forEach(asig => {
        const padreNombre = padresMap[asig.padre_id];
        const hijaNombre = hijasMap[asig.hija_id];
        if (!padreNombre || !hijaNombre) { console.warn('Nombre no encontrado para:', asig); return; }
        
        let parentKey = null;
        if (parents.parent1 === padreNombre) parentKey = 'parent1';
        else if (parents.parent2 === padreNombre) parentKey = 'parent2';
        else if (parents.other === padreNombre) parentKey = 'other';
        
        let childKey = null;
        if (children.child1 === hijaNombre) childKey = 'child1';
        else if (children.child2 === hijaNombre) childKey = 'child2';
        
        if (parentKey && childKey) {
          const scheduleKey = `${asig.fecha}_${childKey}_${asig.periodo}`;
          newSchedule[scheduleKey] = parentKey;
          if (asig.observaciones) {
            newNotes[scheduleKey] = asig.observaciones;
          }
        } else {
          console.warn('No se pudo mapear:', { padreNombre, hijaNombre, asig });
        }
      });
      
      setSchedule(newSchedule);
      setNotes(newNotes);
      console.log('Asignaciones cargadas correctamente:', Object.keys(newSchedule).length);
      console.log('Observaciones cargadas:', Object.keys(newNotes).length);
    } catch (err) { console.error('Error inesperado al cargar:', err); }
  }, [parents, children]);

  useEffect(() => {
    if (step === 'main' && parents.parent1 && children.child1) { loadScheduleFromSupabase(); }
  }, [step, parents.parent1, children.child1, loadScheduleFromSupabase]);

  const saveScheduleInSupabase = async () => {
    try {
      const keys = Object.keys(schedule).filter(k => schedule[k]);
      if (keys.length === 0) { alert('No hay asignaciones para guardar.'); return; }
      
      const { data: padresData } = await supabase.from('padres').select('id, nombre');
      const { data: hijasData } = await supabase.from('hijas').select('id, nombre');
      
      const padresMap = {};
      const hijasMap = {};
      padresData?.forEach(p => { padresMap[p.nombre] = p.id; });
      hijasData?.forEach(h => { hijasMap[h.nombre] = h.id; });
      
      const upserts = [];
      
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
        
        const padreId = padresMap[padreNombre];
        const hijaId = hijasMap[hijaNombre];
        
        if (!padreId) { console.warn('Padre no encontrado:', padreNombre); continue; }
        if (!hijaId) { console.warn('Hija no encontrada:', hijaNombre); continue; }
        
        const observaciones = notes[k] || null;
        
        upserts.push({ 
          padre_id: padreId, 
          hija_id: hijaId, 
          fecha, 
          periodo,
          observaciones
        });
      }
      
      if (upserts.length === 0) { 
        alert('No se generaron datos para guardar (comprueba que padres/hijas existen en la base de datos).'); 
        return; 
      }
      
      const fechasUnicas = [...new Set(upserts.map(u => u.fecha))];
      for (const fecha of fechasUnicas) {
        await supabase.from('asignaciones').delete().eq('fecha', fecha);
      }
      
      const { data, error } = await supabase.from('asignaciones').insert(upserts);
      
      if (error) { 
        console.error('Error guardando asignaciones:', error); 
        alert('Error guardando en Supabase: ' + (error.message || JSON.stringify(error))); 
      } else { 
        alert('Asignaciones y observaciones guardadas correctamente.'); 
      }
    } catch (err) { 
      console.error(err); 
      alert('Error inesperado al guardar: ' + (err.message || err)); 
    }
  };

  const DayPeriodCell = React.memo(({ scheduleKey, child, isDisabled }) => {
    const childName = children[child] || (child === 'child1' ? 'Hijo 1' : 'Hijo 2');
    const scheduleValue = schedule[scheduleKey] || '';
    const noteValue = notes[scheduleKey] || '';
    return (
      <div className="border rounded p-1 flex-1">
        <div className="text-[11px] font-medium mb-1" style={{ color: colors[child] }}>
          {childName}
        </div>
        <select 
          value={scheduleValue} 
          onChange={(e) => handleScheduleChange(scheduleKey, e.target.value)} 
          disabled={isDisabled} 
          className="w-full text-[11px] p-1 border rounded" 
          style={{ backgroundColor: scheduleValue ? colors[scheduleValue] + '40' : 'white' }}
        >
          <option value="">Seleccionar</option>
          <option value="parent1">{parents.parent1 || 'Papá'}</option>
          <option value="parent2">{parents.parent2 || 'Mamá'}</option>
          {parents.other && <option value="other">{parents.other}</option>}
        </select>
        <textarea 
          key={scheduleKey} 
          placeholder="Obs..." 
          defaultValue={noteValue} 
          onBlur={(e) => handleNoteChange(scheduleKey, e.target.value)} 
          onChange={(e) => { notes[scheduleKey] = e.target.value; }} 
          disabled={isDisabled} 
          className="w-full text-[10px] p-1 border rounded mt-1" 
          style={{ minHeight: 28, resize: 'none' }} 
        />
      </div>
    );
  });

  // VISTA DÍA - Ajustada para no hacer scroll y mostrar mes
  const DailyView = () => {
    const isChildUser = currentUser === 'child1' || currentUser === 'child2';
    const childrenToShow = isChildUser ? [currentUser] : ['child1', 'child2'];
    const dayName = daysOfWeek[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1];
    const dayNum = currentDate.getDate();
    const monthName = monthsShort[currentDate.getMonth()];
    
    return (
      <div className="p-2 flex flex-col h-full" style={{ fontSize: 11 }}>
        <div className="flex justify-between items-center mb-2">
          <button onClick={() => setCurrentDate(d => addDays(d, -1))} className="px-3 py-1 border rounded text-sm">◀</button>
          <div className="font-bold text-sm text-center">
            {dayName} {dayNum} {monthName}
          </div>
          <button onClick={() => setCurrentDate(d => addDays(d, 1))} className="px-3 py-1 border rounded text-sm">▶</button>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          {periods.map((period) => (
            <div key={period} className="flex-1 border rounded p-2 flex flex-col">
              <div className="text-xs font-bold mb-1 uppercase">{period}</div>
              <div className="flex gap-2 flex-1">
                {childrenToShow.map((child) => { 
                  const sk = getScheduleKey(currentDate, child, period); 
                  return (<DayPeriodCell key={sk} scheduleKey={sk} child={child} isDisabled={isChildUser} />); 
                })}
              </div>
            </div>
          ))}
        </div>
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
          <div className="text-[9px] font-bold text-center mb-1" style={{ color: colors[childFilter] }}>{childName}</div>
        )}
        <div className="text-[9px] font-medium text-center mb-1">{monthLabel}</div>
        <div className="grid" style={{ gridTemplateColumns: '30px repeat(7, 1fr)', gap: 1, fontSize: 8 }}>
          <div />
          {weekDates.map((d, i) => (
            <div key={formatDate(d)} className="text-center font-bold text-[8px]">{daysOfWeek[i]} {d.getDate()}</div>
          ))}
          {periods.map((period) => (
            <React.Fragment key={period}>
              <div className="font-bold text-[8px]">{period.substring(0, 3)}</div>
              {weekDates.map((d) => { 
                const date = d; 
                return (
                  <div key={`${formatDate(date)}_${period}`} className="border rounded p-0.5 min-h-[24px] flex items-center justify-center">
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
                            style={{ backgroundColor: isWithThisParent ? colors[child] : '#f3f4f6', color: isWithThisParent ? '#000' : '#666' }}
                          >
                            {displayName}{obs && <span className="ml-0.5">*</span>}
                          </div>
                        ); 
                      } else { 
                        const displayName = assigned ? (assigned === 'parent1' ? 'Papá' : assigned === 'parent2' ? 'Mamá' : parents.other || 'Otro') : '-'; 
                        return (
                          <div 
                            key={sk} 
                            onClick={() => obs && setPopupObs(obs)} 
                            className="text-[7px] text-center rounded px-0.5 cursor-pointer" 
                            style={{ backgroundColor: assigned ? colors[assigned] : '#f3f4f6', color: assigned ? '#000' : '#666' }}
                          >
                            {displayName}{obs && <span className="ml-0.5">*</span>}
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
            <div key={formatDate(d)} className="text-center font-bold text-[8px]">{daysOfWeek[i]} {d.getDate()}</div>
          ))}
          {periods.map((period) => (
            <React.Fragment key={period}>
              <div className="font-bold text-[8px]">{period.substring(0, 3)}</div>
              {weekDates.map((d) => (
                <div key={`${formatDate(d)}_${period}_global`} className="border rounded p-0.5 min-h-[28px]">
                  {caregivers.map(caregiver => { 
                    const child1Key = getScheduleKey(d, 'child1', period); 
                    const child2Key = getScheduleKey(d, 'child2', period); 
                    const child1Assigned = schedule[child1Key] === caregiver.key; 
                    const child2Assigned = schedule[child2Key] === caregiver.key; 
                    const child1Initial = child1Assigned ? (children.child1 || 'Hijo 1')[0].toUpperCase() : '-'; 
                    const child2Initial = child2Assigned ? (children.child2 || 'Hijo 2')[0].toUpperCase() : '-'; 
                    return (
                      <div key={caregiver.key} className="flex items-center gap-0.5 mb-0.5 text-[7px]">
                        <span className="font-bold" style={{ color: colors[caregiver.key] }}>{caregiver.initial}</span>
                        <span className="px-0.5 rounded" style={{ backgroundColor: child1Assigned ? colors.child1 : '#f3f4f6', color: '#000' }}>{child1Initial}</span>
                        <span className="px-0.5 rounded" style={{ backgroundColor: child2Assigned ? colors.child2 : '#f3f4f6', color: '#000' }}>{child2Initial}</span>
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

  // VISTA SEMANA - Con número de semana del año
  const WeekView = () => {
    const weekDates = getWeekDates(currentDate);
    const firstMonth = weekDates[0].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const lastMonth = weekDates[6].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const monthLabel = firstMonth === lastMonth ? firstMonth : `${firstMonth} / ${lastMonth}`;
    const weekNumber = getWeekNumber(weekDates[0]);
    
    if (currentUser === 'child1' || currentUser === 'child2') {
      const firstChild = currentUser;
      const secondChild = currentUser === 'child1' ? 'child2' : 'child1';
      return (
        <div className="p-1" style={{ fontSize: 10 }}>
          <div className="flex items-center justify-between mb-1">
            <button onClick={() => setCurrentDate(d => addDays(d, -7))} className="p-1 text-[10px]"><ChevronLeft size={14} /></button>
            <div className="text-xs font-medium">Semana {weekNumber}</div>
            <button onClick={() => setCurrentDate(d => addDays(d, 7))} className="p-1 text-[10px]"><ChevronRight size={14} /></button>
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
          <button onClick={() => setCurrentDate(d => addDays(d, -7))} className="p-1 text-[10px]"><ChevronLeft size={14} /></button>
          <div className="text-xs font-medium">{monthLabel} - Semana {weekNumber} - {parentName}</div>
          <button onClick={() => setCurrentDate(d => addDays(d, 7))} className="p-1 text-[10px]"><ChevronRight size={14} /></button>
        </div>
        <WeekCalendar />
        <GlobalWeekCalendar />
      </div>
    );
  };

  // VISTA MES - Con nombre del hijo en mayúsculas para perfil hijos
  const MonthView = () => {
    const monthDates = getMonthDates(currentDate);
    const monthLabel = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const isChildUser = currentUser === 'child1' || currentUser === 'child2';
    const isParentUser = currentUser === 'parent1' || currentUser === 'parent2';
    const childName = isChildUser ? (children[currentUser] || 'Hijo').toUpperCase() : '';
    
    return (
      <div className="p-1" style={{ fontSize: 9 }}>
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => setCurrentDate(d => addMonths(d, -1))} className="p-1 text-[10px]"><ChevronLeft size={14} /></button>
          <div className="text-xs font-medium">
            {isChildUser ? `${childName}  ${monthLabel}` : monthLabel}
          </div>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-1 text-[10px]"><ChevronRight size={14} /></button>
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
                      if (isParentUser) { 
                        const child1Key = getScheduleKey(date, 'child1', period); 
                        const child2Key = getScheduleKey(date, 'child2', period); 
                        const child1Assigned = schedule[child1Key] === currentUser; 
                        const child2Assigned = schedule[child2Key] === currentUser; 
                        const obs1 = notes[child1Key] || ''; 
                        const obs2 = notes[child2Key] || ''; 
                        const child1Name = children.child1 || 'Hijo 1'; 
                        const child2Name = children.child2 || 'Hijo 2'; 
                        return (
                          <div key={`${dateKey}_${period}`} className="border-b py-0.5 flex gap-0.5">
                            <div 
                              onClick={() => obs1 && setPopupObs(obs1)} 
                              className="flex-1 text-[7px] text-center rounded cursor-pointer font-medium px-0.5" 
                              style={{ backgroundColor: child1Assigned ? colors.child1 : '#f3f4f6', color: '#000' }}
                            >
                              {child1Assigned ? child1Name : '-'}{obs1 && <span className="ml-0.5">*</span>}
                            </div>
                            <div 
                              onClick={() => obs2 && setPopupObs(obs2)} 
                              className="flex-1 text-[7px] text-center rounded cursor-pointer font-medium px-0.5" 
                              style={{ backgroundColor: child2Assigned ? colors.child2 : '#f3f4f6', color: '#000' }}
                            >
                              {child2Assigned ? child2Name : '-'}{obs2 && <span className="ml-0.5">*</span>}
                            </div>
                          </div>
                        ); 
                      } 
                      if (isChildUser) { 
                        const childKey = getScheduleKey(date, currentUser, period); 
                        const assignedParent = schedule[childKey]; 
                        const obs = notes[childKey] || ''; 
                        let displayText = '-'; 
                        let bgColor = '#f3f4f6'; 
                        if (assignedParent === 'parent1') { 
                          displayText = 'Papá'; 
                          bgColor = colors.parent1; 
                        } else if (assignedParent === 'parent2') { 
                          displayText = 'Mamá'; 
                          bgColor = colors.parent2; 
                        } else if (assignedParent === 'other') { 
                          displayText = parents.other || 'Otro'; 
                          bgColor = colors.other; 
                        } 
                        return (
                          <div 
                            key={`${dateKey}_${period}`} 
                            onClick={() => obs && setPopupObs(obs)} 
                            className="text-[7px] text-center border-b py-0.5 cursor-pointer font-medium" 
                            style={{ backgroundColor: bgColor, color: '#000' }}
                          >
                            {displayText}{obs && <span className="ml-0.5">*</span>}
                          </div>
                        ); 
                      } 
                      return null; 
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

  // Función para manejar el clic en el nombre del perfil
  const handleProfileClick = () => {
    // Solo el padre (parent1) y la madre (parent2) pueden ir a setup
    // Las hijas no pueden hacer nada al clicar
    if (currentUser === 'parent1' || currentUser === 'parent2') {
      setStep('setup');
    }
    // Si es child1 o child2, no hace nada
  };

  if (step === 'setup') { 
    return (
      <SetupScreen 
        parents={parents} 
        setParents={setParents} 
        children={children} 
        setChildren={setChildren} 
        setCurrentUser={setCurrentUser} 
        setStep={setStep}
        currentUser={currentUser}
        saveAndContinue={saveAndContinue}
      />
    ); 
  }
  
  const topBarColor = currentUser ? colors[currentUser] : '#3b82f6';
  const profileBorder = currentUser ? borderColors[currentUser] : '#ffffff';
  const displayName = currentUser === 'child1' ? children.child1 : currentUser === 'child2' ? children.child2 : currentUser === 'parent1' ? parents.parent1 : currentUser === 'parent2' ? parents.parent2 : 'Usuario';

  // Determinar si mostrar botones según el perfil
  const isParent1 = currentUser === 'parent1';
  const isParent2 = currentUser === 'parent2';
  const isChild = currentUser === 'child1' || currentUser === 'child2';

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-white">
      <div className="flex items-center justify-between p-2" style={{ backgroundColor: topBarColor }}>
        <div className="flex items-center gap-2 text-white">
          <Users size={18} />
          <span 
            onClick={handleTitleTap}
            className="font-bold text-sm cursor-pointer select-none"
          >
            CoParenting
          </span>
        </div>
        <button 
          onClick={handleProfileClick} 
          className={`text-xs px-2 py-1 rounded border-2 font-medium ${isChild ? 'cursor-default' : 'cursor-pointer'}`}
          style={{ borderColor: profileBorder, backgroundColor: 'white', color: topBarColor }}
        >
          {displayName}
        </button>
      </div>
      <div className="flex gap-1 p-2 border-b overflow-x-auto">
        {/* Vista Día: solo para padres (parent1 y parent2) */}
        {(isParent1 || isParent2) && (
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
        {/* Estadísticas y Guardar: SOLO para parent1 (padre) */}
        {isParent1 && (
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
