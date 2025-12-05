import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [turnos, setTurnos] = useState({});
  const [currentView, setCurrentView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [popupObs, setPopupObs] = useState(null);
  const periods = ['Mañana', 'Tarde', 'Noche'];
  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const monthsShort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  const turnosPadre = [
    'E5DN (09:00-09:00)', 'E5D (09:00-21:00)', 'E5N (21:00-09:00)', 'E4DN (09:00-09:00)',
    'GL (08:00-08:00)', 'E4D (09-21:00)', 'E4N (21:00-09:00)', 'C2 (09:00-21:00)',
    'C4T (10:00-22:00)', 'C3D (08:15-20:15)', 'C3N (20:15-08:15)', 'F.O. (09:00-15:00)',
    'CURSO (08:00-15:00)', 'CURSO (15:00-22:00)', 'CURSO (08:00-22:00)', 'VIAJE DÍA ENTERO'
  ];

  const tiposTurnoMadre = ['', 'Mañana', 'Tarde', 'Noche'];
  const horasEntradaMadre = ['', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '21:00', '22:00', '23:00'];
  const horasSalidaMadre = ['', '14:00', '14:30', '15:00', '15:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '00:00', '07:00', '08:00', '09:00'];

  const [titleTapCount, setTitleTapCount] = useState(0);

  const handleTitleTap = () => {
    const newCount = titleTapCount + 1;
    setTitleTapCount(newCount);
    if (newCount >= 3) { setStep('setup'); setTitleTapCount(0); }
    setTimeout(() => setTitleTapCount(0), 2000);
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  const saveAndContinue = (user) => {
    localStorage.setItem('coparenting_parents', JSON.stringify(parents));
    localStorage.setItem('coparenting_children', JSON.stringify(children));
    localStorage.setItem('coparenting_currentUser', user);
    setCurrentUser(user); setStep('main'); setCurrentView('week');
  };

  const formatDate = useCallback((d) => { if (!d) return ''; return new Date(d).toISOString().split('T')[0]; }, []);
  const getScheduleKey = useCallback((date, child, period) => `${formatDate(date)}_${child}_${period}`, [formatDate]);
  const getTurnoKey = useCallback((date) => formatDate(date), [formatDate]);

  const getWeekDates = useCallback((date) => {
    const curr = new Date(date); const day = curr.getDay(); const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(curr); monday.setDate(curr.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
  }, []);

  const getMonthDates = useCallback((date) => {
    const year = date.getFullYear(); const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0); const dates = [];
    const firstWeekDay = new Date(year, month, 1).getDay(); const adj = firstWeekDay === 0 ? 6 : firstWeekDay - 1;
    for (let i = 0; i < adj; i++) dates.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) dates.push(new Date(year, month, i));
    return dates;
  }, []);

  const addDays = (d, days) => { const nd = new Date(d); nd.setDate(nd.getDate() + days); return nd; };
  const addMonths = (d, months) => { const nd = new Date(d); nd.setMonth(nd.getMonth() + months); return nd; };

  const handleNoteChange = useCallback((key, value) => { setNotes(prev => ({ ...prev, [key]: value })); }, []);
  const handleScheduleChange = useCallback((key, value) => { setSchedule(prev => ({ ...prev, [key]: value })); }, []);
  const handleTurnoChange = useCallback((fecha, quien, value) => { setTurnos(prev => ({ ...prev, [`${fecha}_${quien}`]: value })); }, []);

  // Parsear turno del padre para mostrar en dos líneas
  const parseTurnoPadre = (turno) => {
    if (!turno) return { codigo: '-', horario: '' };
    if (turno === 'VIAJE DÍA ENTERO') return { codigo: 'VIAJE', horario: 'DÍA ENTERO' };
    const match = turno.match(/^([A-Z0-9.]+)\s*\(([^)]+)\)/);
    if (match) return { codigo: match[1], horario: match[2] };
    return { codigo: turno, horario: '' };
  };

  // Parsear turno de la madre (formato: "Mañana|09:00|15:00;Tarde|17:00|21:00")
  const parseTurnoMadre = (turno) => {
    if (!turno) return [];
    return turno.split(';').filter(t => t).map(t => {
      const [tipo, entrada, salida] = t.split('|');
      return { tipo, entrada, salida };
    });
  };

  // Construir string de turno madre desde los 6 campos
  // Guarda aunque no estén todos los campos completos
  const buildTurnoMadre = (t1tipo, t1entrada, t1salida, t2tipo, t2entrada, t2salida) => {
    const parts = [];
    if (t1tipo || t1entrada || t1salida) parts.push(`${t1tipo || ''}|${t1entrada || ''}|${t1salida || ''}`);
    if (t2tipo || t2entrada || t2salida) parts.push(`${t2tipo || ''}|${t2entrada || ''}|${t2salida || ''}`);
    return parts.join(';');
  };

  const loadScheduleFromSupabase = useCallback(async () => {
    try {
      const { data: asignaciones, error } = await supabase.from('asignaciones').select('id, padre_id, hija_id, fecha, periodo, observaciones');
      if (error) console.error('Error cargando asignaciones:', error);
      
      if (asignaciones && asignaciones.length > 0) {
        const padreIds = [...new Set(asignaciones.map(a => a.padre_id))];
        const hijaIds = [...new Set(asignaciones.map(a => a.hija_id))];
        const { data: padresData } = await supabase.from('padres').select('id, nombre').in('id', padreIds);
        const { data: hijasData } = await supabase.from('hijas').select('id, nombre').in('id', hijaIds);
        const padresMap = {}; const hijasMap = {};
        padresData?.forEach(p => { padresMap[p.id] = p.nombre; });
        hijasData?.forEach(h => { hijasMap[h.id] = h.nombre; });
        const newSchedule = {}; const newNotes = {};
        asignaciones.forEach(asig => {
          const padreNombre = padresMap[asig.padre_id]; const hijaNombre = hijasMap[asig.hija_id];
          if (!padreNombre || !hijaNombre) return;
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
            if (asig.observaciones) newNotes[scheduleKey] = asig.observaciones;
          }
        });
        setSchedule(newSchedule); setNotes(newNotes);
      }
      const { data: turnosData, error: turnosError } = await supabase.from('turnos').select('*');
      if (turnosError) console.error('Error cargando turnos:', turnosError);
      if (turnosData && turnosData.length > 0) {
        const newTurnos = {};
        turnosData.forEach(t => {
          if (t.turno_padre) newTurnos[`${t.fecha}_padre`] = t.turno_padre;
          if (t.turno_madre) newTurnos[`${t.fecha}_madre`] = t.turno_madre;
        });
        setTurnos(newTurnos);
      }
    } catch (err) { console.error('Error inesperado al cargar:', err); }
  }, [parents, children]);

  useEffect(() => {
    if (step === 'main' && parents.parent1 && children.child1) loadScheduleFromSupabase();
  }, [step, parents.parent1, children.child1, loadScheduleFromSupabase]);

  const saveScheduleInSupabase = async () => {
    try {
      const keys = Object.keys(schedule).filter(k => schedule[k]);
      const { data: padresData } = await supabase.from('padres').select('id, nombre');
      const { data: hijasData } = await supabase.from('hijas').select('id, nombre');
      const padresMap = {}; const hijasMap = {};
      padresData?.forEach(p => { padresMap[p.nombre] = p.id; });
      hijasData?.forEach(h => { hijasMap[h.nombre] = h.id; });
      const upserts = [];
      for (const k of keys) {
        const parts = k.split('_'); if (parts.length < 3) continue;
        const fecha = parts[0]; const childKey = parts[1]; const periodo = parts.slice(2).join('_');
        const parentKey = schedule[k]; const padreNombre = parents[parentKey]; const hijaNombre = children[childKey];
        if (!padreNombre || !hijaNombre) continue;
        const padreId = padresMap[padreNombre]; const hijaId = hijasMap[hijaNombre];
        if (!padreId || !hijaId) continue;
        upserts.push({ padre_id: padreId, hija_id: hijaId, fecha, periodo, observaciones: notes[k] || null });
      }
      if (upserts.length > 0) {
        const fechasUnicas = [...new Set(upserts.map(u => u.fecha))];
        for (const fecha of fechasUnicas) await supabase.from('asignaciones').delete().eq('fecha', fecha);
        await supabase.from('asignaciones').insert(upserts);
      }
      const turnoKeys = Object.keys(turnos).filter(k => turnos[k]);
      const turnosPorFecha = {};
      turnoKeys.forEach(k => {
        const parts = k.split('_'); const fecha = parts[0]; const quien = parts[1];
        if (!turnosPorFecha[fecha]) turnosPorFecha[fecha] = {};
        if (quien === 'padre') turnosPorFecha[fecha].turno_padre = turnos[k];
        if (quien === 'madre') turnosPorFecha[fecha].turno_madre = turnos[k];
      });
      const turnoUpserts = Object.entries(turnosPorFecha).map(([fecha, data]) => ({
        fecha, turno_padre: data.turno_padre || null, turno_madre: data.turno_madre || null
      }));
      if (turnoUpserts.length > 0) {
        for (const t of turnoUpserts) await supabase.from('turnos').delete().eq('fecha', t.fecha);
        await supabase.from('turnos').insert(turnoUpserts);
      }
      alert('Guardado correctamente.');
    } catch (err) { console.error(err); alert('Error al guardar: ' + (err.message || err)); }
  };

  // Componente selector de turno madre (6 desplegables en 2 filas)
  const TurnoMadreSelector = ({ fecha }) => {
    const turnoActual = turnos[`${fecha}_madre`] || '';
    const parsed = parseTurnoMadre(turnoActual);
    const t1 = parsed[0] || { tipo: '', entrada: '', salida: '' };
    const t2 = parsed[1] || { tipo: '', entrada: '', salida: '' };

    const updateTurno = (field, value, turnoNum) => {
      const newT1 = turnoNum === 1 ? { ...t1, [field]: value } : { ...t1 };
      const newT2 = turnoNum === 2 ? { ...t2, [field]: value } : { ...t2 };
      const newTurno = buildTurnoMadre(newT1.tipo, newT1.entrada, newT1.salida, newT2.tipo, newT2.entrada, newT2.salida);
      setTurnos(prev => ({ ...prev, [`${fecha}_madre`]: newTurno }));
    };

    const selectStyle = "w-full text-[7px] p-0 border rounded";
    const hasTurno = t1.tipo || t2.tipo;

    return (
      <div className="flex flex-col gap-0.5" style={{ backgroundColor: hasTurno ? colors.parent2 + '30' : 'white' }}>
        <div className="flex gap-0.5">
          <select value={t1.tipo || ''} onChange={e => updateTurno('tipo', e.target.value, 1)} className={selectStyle}>
            {tiposTurnoMadre.map(t => <option key={t || 'empty1'} value={t}>{t || '-'}</option>)}
          </select>
          <select value={t1.entrada || ''} onChange={e => updateTurno('entrada', e.target.value, 1)} className={selectStyle}>
            {horasEntradaMadre.map(h => <option key={h || 'e1'} value={h}>{h || '-'}</option>)}
          </select>
          <select value={t1.salida || ''} onChange={e => updateTurno('salida', e.target.value, 1)} className={selectStyle}>
            {horasSalidaMadre.map(h => <option key={h || 's1'} value={h}>{h || '-'}</option>)}
          </select>
        </div>
        <div className="flex gap-0.5">
          <select value={t2.tipo || ''} onChange={e => updateTurno('tipo', e.target.value, 2)} className={selectStyle}>
            {tiposTurnoMadre.map(t => <option key={t || 'empty2'} value={t}>{t || '-'}</option>)}
          </select>
          <select value={t2.entrada || ''} onChange={e => updateTurno('entrada', e.target.value, 2)} className={selectStyle}>
            {horasEntradaMadre.map(h => <option key={h || 'e2'} value={h}>{h || '-'}</option>)}
          </select>
          <select value={t2.salida || ''} onChange={e => updateTurno('salida', e.target.value, 2)} className={selectStyle}>
            {horasSalidaMadre.map(h => <option key={h || 's2'} value={h}>{h || '-'}</option>)}
          </select>
        </div>
      </div>
    );
  };

  // VISTA DÍA
  const DailyView = () => {
    const isChildUser = currentUser === 'child1' || currentUser === 'child2';
    const childrenToShow = isChildUser ? [currentUser] : ['child1', 'child2'];
    const dayName = daysOfWeek[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1];
    const dayNum = currentDate.getDate();
    const monthName = monthsShort[currentDate.getMonth()];
    const turnoKey = getTurnoKey(currentDate);
    const turnoPadre = turnos[`${turnoKey}_padre`] || '';

    return (
      <div className="p-1 flex flex-col h-full overflow-hidden" style={{ fontSize: 10 }}>
        <div className="flex justify-between items-center mb-1">
          <button onClick={() => setCurrentDate(d => addDays(d, -1))} className="px-2 py-0.5 border rounded text-xs">◀</button>
          <div className="font-bold text-xs text-center">{dayName} {dayNum} {monthName}</div>
          <button onClick={() => setCurrentDate(d => addDays(d, 1))} className="px-2 py-0.5 border rounded text-xs">▶</button>
        </div>
        
        {(currentUser === 'parent1' || currentUser === 'parent2') && (
          <div className="mb-1 p-1 border rounded bg-gray-50">
            <div className="text-[8px] font-bold mb-0.5">Turnos de trabajo</div>
            <div className="flex gap-1">
              <div className="flex-1">
                <div className="text-[7px] font-medium" style={{ color: colors.parent1 }}>{parents.parent1 || 'Padre'}</div>
                <select value={turnoPadre} onChange={e => handleTurnoChange(turnoKey, 'padre', e.target.value)}
                  className="w-full text-[7px] p-0.5 border rounded"
                  style={{ backgroundColor: turnoPadre ? colors.parent1 + '30' : 'white' }}>
                  <option value="">Sin turno</option>
                  {turnosPadre.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <div className="text-[7px] font-medium" style={{ color: colors.parent2 }}>{parents.parent2 || 'Madre'}</div>
                <TurnoMadreSelector fecha={turnoKey} />
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-1 flex flex-col gap-0.5 min-h-0">
          {periods.map((period) => (
            <div key={period} className="flex-1 border rounded p-0.5 flex flex-col min-h-0">
              <div className="text-[8px] font-bold uppercase">{period}</div>
              <div className="flex gap-0.5 flex-1 min-h-0">
                {childrenToShow.map((child) => {
                  const sk = getScheduleKey(currentDate, child, period);
                  const childName = children[child] || (child === 'child1' ? 'Hijo 1' : 'Hijo 2');
                  const scheduleValue = schedule[sk] || '';
                  const noteValue = notes[sk] || '';
                  return (
                    <div key={sk} className="border rounded p-0.5 flex-1 flex flex-col min-h-0">
                      <div className="text-[8px] font-medium" style={{ color: colors[child] }}>{childName}</div>
                      <select value={scheduleValue} onChange={e => handleScheduleChange(sk, e.target.value)} disabled={isChildUser}
                        className="w-full text-[8px] p-0.5 border rounded"
                        style={{ backgroundColor: scheduleValue ? colors[scheduleValue] + '40' : 'white' }}>
                        <option value="">-</option>
                        <option value="parent1">{parents.parent1 || 'Papá'}</option>
                        <option value="parent2">{parents.parent2 || 'Mamá'}</option>
                        {parents.other && <option value="other">{parents.other}</option>}
                      </select>
                      <textarea placeholder="Obs..." defaultValue={noteValue}
                        onBlur={e => handleNoteChange(sk, e.target.value)} disabled={isChildUser}
                        className="w-full text-[7px] p-0.5 border rounded mt-0.5 flex-1 min-h-0" style={{ resize: 'none' }} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // VISTA SEMANA
  const WeekCalendar = ({ showTurnos = true, childFilter = null, showHeader = true }) => {
    const weekDates = getWeekDates(currentDate);
    const isParentUser = currentUser === 'parent1' || currentUser === 'parent2';
    const isChildUser = currentUser === 'child1' || currentUser === 'child2';
    
    // Si hay childFilter, mostrar solo ese hijo (para el calendario secundario de las hijas)
    const childToShow = childFilter || currentUser;

    return (
      <div className="mb-1">
        {/* Título del calendario secundario (solo para la otra hija) */}
        {childFilter && (
          <div className="text-[9px] font-bold text-center mb-1" style={{ color: colors[childFilter] }}>
            {(children[childFilter] || 'Hermana').toUpperCase()}
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: '55px repeat(7, 1fr)', gap: 1, fontSize: 7 }}>
          {showHeader && (
            <>
              <div />
              {weekDates.map((d, i) => (
                <div key={formatDate(d)} className="text-center font-bold text-[8px]">{daysOfWeek[i]} {d.getDate()}</div>
              ))}
            </>
          )}
          
          {showTurnos && (
            <>
              {/* Fila turno padre */}
              <div className="font-bold text-[7px] flex items-center" style={{ color: colors.parent1 }}>{parents.parent1 || 'Padre'}</div>
              {weekDates.map((d) => {
                const turnoKey = getTurnoKey(d);
                const turno = turnos[`${turnoKey}_padre`] || '';
                const { codigo, horario } = parseTurnoPadre(turno);
                return (
                  <div key={`tp_${formatDate(d)}`} className="text-center rounded p-0.5" style={{ backgroundColor: turno ? colors.parent1 + '40' : '#f3f4f6', color: colors.parent1 }}>
                    <div className="text-[7px] font-bold">{codigo}</div>
                    {horario && <div className="text-[6px]">{horario}</div>}
                  </div>
                );
              })}
              {/* Fila turno madre */}
              <div className="font-bold text-[7px] flex items-center" style={{ color: '#065f46' }}>{parents.parent2 || 'Madre'}</div>
              {weekDates.map((d) => {
                const turnoKey = getTurnoKey(d);
                const turno = turnos[`${turnoKey}_madre`] || '';
                const parsed = parseTurnoMadre(turno);
                return (
                  <div key={`tm_${formatDate(d)}`} className="text-center rounded p-0.5" style={{ backgroundColor: turno ? colors.parent2 + '40' : '#f3f4f6', color: '#065f46' }}>
                    {parsed.length === 0 && <div className="text-[7px]">-</div>}
                    {parsed.map((t, idx) => (
                      <div key={idx}>
                        <div className="text-[7px] font-bold">{t.tipo}</div>
                        <div className="text-[6px]">{t.entrada}-{t.salida}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}
          
          {periods.map((period) => (
            <React.Fragment key={period}>
              <div className="font-bold text-[8px] flex items-center">{period}</div>
              {weekDates.map((d) => {
                return (
                  <div key={`${formatDate(d)}_${period}`} className="border rounded p-0.5 min-h-[18px] flex items-center justify-center gap-0.5">
                    {isParentUser && ['child1', 'child2'].map((child) => {
                      const sk = getScheduleKey(d, child, period);
                      const assigned = schedule[sk];
                      const obs = notes[sk] || '';
                      const isWithThisParent = assigned === currentUser;
                      const displayName = isWithThisParent ? (children[child] || (child === 'child1' ? 'H1' : 'H2')) : '-';
                      return (
                        <div key={sk} onClick={() => obs && setPopupObs(obs)}
                          className="text-[9px] text-center rounded px-0.5 cursor-pointer font-medium"
                          style={{ backgroundColor: isWithThisParent ? colors[child] : '#f3f4f6', color: isWithThisParent ? '#000' : '#666' }}>
                          {displayName}{obs && '*'}
                        </div>
                      );
                    })}
                    {isChildUser && (() => {
                      // Si hay childFilter, mostrar ese hijo; si no, mostrar el usuario actual
                      const targetChild = childFilter || currentUser;
                      const sk = getScheduleKey(d, targetChild, period);
                      const assigned = schedule[sk];
                      const obs = notes[sk] || '';
                      const displayName = assigned ? (assigned === 'parent1' ? 'Papá' : assigned === 'parent2' ? 'Mamá' : parents.other || 'Otro') : '-';
                      return (
                        <div onClick={() => obs && setPopupObs(obs)}
                          className="text-[9px] text-center rounded px-0.5 cursor-pointer font-medium"
                          style={{ backgroundColor: assigned ? colors[assigned] : '#f3f4f6', color: assigned ? '#000' : '#666' }}>
                          {displayName}{obs && '*'}
                        </div>
                      );
                    })()}
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
      { key: 'parent1', initial: (parents.parent1 || 'P')[0].toUpperCase() },
      { key: 'parent2', initial: (parents.parent2 || 'M')[0].toUpperCase() },
      ...(parents.other ? [{ key: 'other', initial: parents.other[0].toUpperCase() }] : [])
    ];
    return (
      <div className="mb-2 border-t-2 pt-2">
        <div className="text-[9px] font-bold text-center mb-1">CALENDARIO GLOBAL</div>
        <div className="grid" style={{ gridTemplateColumns: '55px repeat(7, 1fr)', gap: 1, fontSize: 7 }}>
          <div />
          {weekDates.map((d, i) => (
            <div key={formatDate(d)} className="text-center font-bold text-[8px]">{daysOfWeek[i]} {d.getDate()}</div>
          ))}
          {periods.map((period) => (
            <React.Fragment key={period}>
              <div className="font-bold text-[8px] flex items-center">{period}</div>
              {weekDates.map((d) => (
                <div key={`${formatDate(d)}_${period}_g`} className="border rounded p-0.5 min-h-[24px]">
                  {caregivers.map(cg => {
                    const c1k = getScheduleKey(d, 'child1', period);
                    const c2k = getScheduleKey(d, 'child2', period);
                    const c1a = schedule[c1k] === cg.key;
                    const c2a = schedule[c2k] === cg.key;
                    const c1i = c1a ? (children.child1 || 'H1')[0].toUpperCase() : '-';
                    const c2i = c2a ? (children.child2 || 'H2')[0].toUpperCase() : '-';
                    return (
                      <div key={cg.key} className="flex items-center gap-0.5 text-[6px]">
                        <span className="font-bold" style={{ color: colors[cg.key] }}>{cg.initial}</span>
                        <span className="px-0.5 rounded" style={{ backgroundColor: c1a ? colors.child1 : '#f3f4f6' }}>{c1i}</span>
                        <span className="px-0.5 rounded" style={{ backgroundColor: c2a ? colors.child2 : '#f3f4f6' }}>{c2i}</span>
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
    const weekNumber = getWeekNumber(weekDates[0]);
    const firstMonth = weekDates[0].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const lastMonth = weekDates[6].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const monthLabel = firstMonth === lastMonth ? capitalize(firstMonth) : `${capitalize(firstMonth)} / ${capitalize(lastMonth)}`;

    if (currentUser === 'child1' || currentUser === 'child2') {
      const childName = children[currentUser] || 'Hijo';
      const childColor = colors[currentUser];
      const otherChild = currentUser === 'child1' ? 'child2' : 'child1';
      return (
        <div className="p-1" style={{ fontSize: 10 }}>
          <div className="flex items-center justify-between mb-1">
            <button onClick={() => setCurrentDate(d => addDays(d, -7))} className="p-1"><ChevronLeft size={14} /></button>
            <div className="text-xs font-medium">
              <span style={{ color: childColor }}>{childName.toUpperCase()}</span>
              <span>  -  {monthLabel}  -  Semana {weekNumber}</span>
            </div>
            <button onClick={() => setCurrentDate(d => addDays(d, 7))} className="p-1"><ChevronRight size={14} /></button>
          </div>
          {/* Calendario principal con turnos */}
          <WeekCalendar showTurnos={true} />
          {/* Calendario de la otra hija sin turnos */}
          <div className="border-t-2 pt-1 mt-1">
            <WeekCalendar showTurnos={false} childFilter={otherChild} showHeader={true} />
          </div>
        </div>
      );
    }

    const parentName = currentUser === 'parent1' ? parents.parent1 : parents.parent2;
    const parentColor = colors[currentUser];
    return (
      <div className="p-1" style={{ fontSize: 10 }}>
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => setCurrentDate(d => addDays(d, -7))} className="p-1"><ChevronLeft size={14} /></button>
          <div className="text-xs font-medium">
            <span style={{ color: parentColor }}>{parentName.toUpperCase()}</span>
            <span>  -  {monthLabel}  -  Semana {weekNumber}</span>
          </div>
          <button onClick={() => setCurrentDate(d => addDays(d, 7))} className="p-1"><ChevronRight size={14} /></button>
        </div>
        <WeekCalendar showTurnos={true} />
        <GlobalWeekCalendar />
      </div>
    );
  };

  // VISTA MES - Con turnos mejorados (compacta sin scroll)
  const MonthView = () => {
    const monthDates = getMonthDates(currentDate);
    const monthLabel = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const isChildUser = currentUser === 'child1' || currentUser === 'child2';
    const isParentUser = currentUser === 'parent1' || currentUser === 'parent2';
    const childName = isChildUser ? (children[currentUser] || 'Hijo').toUpperCase() : '';

    // Función para obtener texto corto del turno madre (Mañ, Tar, Noc, Mañ/Tar)
    const getTurnoMadreCorto = (turnoStr) => {
      if (!turnoStr) return '';
      const parsed = parseTurnoMadre(turnoStr);
      if (parsed.length === 0) return '';
      const abreviar = (tipo) => {
        if (!tipo) return '';
        if (tipo.toLowerCase().startsWith('mañ')) return 'Mañ';
        if (tipo.toLowerCase().startsWith('tar')) return 'Tar';
        if (tipo.toLowerCase().startsWith('noc')) return 'Noc';
        return tipo.substring(0, 3);
      };
      if (parsed.length === 1) return abreviar(parsed[0].tipo);
      return parsed.map(t => abreviar(t.tipo)).filter(t => t).join('/');
    };

    // Calcular número de filas del mes (semanas)
    const numRows = Math.ceil(monthDates.length / 7);

    return (
      <div className="p-0.5 h-full flex flex-col">
        <div className="flex items-center justify-between mb-0.5">
          <button onClick={() => setCurrentDate(d => addMonths(d, -1))} className="p-0.5"><ChevronLeft size={14} /></button>
          <div className="text-xs font-medium">{isChildUser ? `${childName}  ${capitalize(monthLabel)}` : capitalize(monthLabel)}</div>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-0.5"><ChevronRight size={14} /></button>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="grid h-full" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `14px repeat(${numRows}, 1fr)`, gap: 2 }}>
            {daysOfWeek.map(d => <div key={d} className="text-[8px] font-bold text-center">{d}</div>)}
            {monthDates.map((date, idx) => {
              const dateKey = date ? formatDate(date) : `empty-${idx}`;
              if (!date) return <div key={dateKey} className="border rounded bg-gray-50" />;
              
              const turnoKey = getTurnoKey(date);
              const turnoPadre = turnos[`${turnoKey}_padre`] || '';
              const turnoMadre = turnos[`${turnoKey}_madre`] || '';
              const { codigo: codP } = parseTurnoPadre(turnoPadre);
              const turnoMadreCorto = getTurnoMadreCorto(turnoMadre);

              return (
                <div key={dateKey} className="border rounded p-0.5 flex flex-col overflow-hidden">
                  {/* Cabecera con número y turnos */}
                  <div className="flex" style={{ fontSize: 6, lineHeight: '8px' }}>
                    {/* Número del día */}
                    <span className="font-bold text-[9px] mr-1">{date.getDate()}</span>
                    
                    {/* Turnos de los padres */}
                    {isParentUser && (
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between" style={{ color: colors.parent1 }}>
                          <span className="truncate">{parents.parent1}</span>
                          <span className="font-bold ml-0.5">{codP || '-'}</span>
                        </div>
                        <div className="flex justify-between" style={{ color: '#065f46' }}>
                          <span className="truncate">{parents.parent2}</span>
                          <span className="font-bold ml-0.5">{turnoMadreCorto || '-'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Asignaciones - ocupan todo el espacio restante */}
                  <div className="flex-1 flex flex-col gap-0.5 mt-0.5">
                    {periods.map((period) => {
                      if (isParentUser) {
                        const c1k = getScheduleKey(date, 'child1', period);
                        const c2k = getScheduleKey(date, 'child2', period);
                        const c1a = schedule[c1k] === currentUser;
                        const c2a = schedule[c2k] === currentUser;
                        return (
                          <div key={`${dateKey}_${period}`} className="flex gap-0.5 flex-1">
                            <div className="flex-1 flex items-center justify-center rounded font-bold text-[9px]" style={{ backgroundColor: c1a ? colors.child1 : '#e5e7eb' }}>
                              {c1a ? (children.child1 || 'H1')[0] : '-'}
                            </div>
                            <div className="flex-1 flex items-center justify-center rounded font-bold text-[9px]" style={{ backgroundColor: c2a ? colors.child2 : '#e5e7eb' }}>
                              {c2a ? (children.child2 || 'H2')[0] : '-'}
                            </div>
                          </div>
                        );
                      }
                      if (isChildUser) {
                        const ck = getScheduleKey(date, currentUser, period);
                        const assigned = schedule[ck];
                        let bg = '#e5e7eb';
                        let txt = '-';
                        if (assigned === 'parent1') { bg = colors.parent1; txt = 'Papá'; }
                        else if (assigned === 'parent2') { bg = colors.parent2; txt = 'Mamá'; }
                        else if (assigned === 'other') { bg = colors.other; txt = parents.other || 'Otro'; }
                        return <div key={`${dateKey}_${period}`} className="flex-1 flex items-center justify-center rounded font-bold text-[7px]" style={{ backgroundColor: bg }}>{txt}</div>;
                      }
                      return null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const handleProfileClick = () => { if (currentUser === 'parent1' || currentUser === 'parent2') setStep('setup'); };

  if (step === 'setup') {
    return <SetupScreen parents={parents} setParents={setParents} children={children} setChildren={setChildren}
      setCurrentUser={setCurrentUser} setStep={setStep} currentUser={currentUser} saveAndContinue={saveAndContinue} />;
  }

  const topBarColor = currentUser ? colors[currentUser] : '#3b82f6';
  const profileBorder = currentUser ? borderColors[currentUser] : '#fff';
  const displayName = currentUser === 'child1' ? children.child1 : currentUser === 'child2' ? children.child2 : currentUser === 'parent1' ? parents.parent1 : currentUser === 'parent2' ? parents.parent2 : 'Usuario';
  const isParent1 = currentUser === 'parent1';
  const isParent2 = currentUser === 'parent2';
  const isChild = currentUser === 'child1' || currentUser === 'child2';

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-white">
      <div className="flex items-center justify-between p-2" style={{ backgroundColor: topBarColor }}>
        <div className="flex items-center gap-2 text-white">
          <img src="/android-chrome-192x192.png" alt="Logo" className="w-8 h-8 rounded" />
          <span onClick={handleTitleTap} className="font-bold text-sm cursor-pointer select-none">CoParenting</span>
        </div>
        <button onClick={handleProfileClick} className={`text-xs px-2 py-1 rounded border-2 font-medium ${isChild ? 'cursor-default' : 'cursor-pointer'}`}
          style={{ borderColor: profileBorder, backgroundColor: 'white', color: topBarColor }}>{displayName}</button>
      </div>
      <div className="flex gap-1 p-2 border-b overflow-x-auto">
        {(isParent1 || isParent2) && (
          <button onClick={() => setCurrentView('daily')} className={`px-3 py-1 text-xs rounded ${currentView === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
            <Calendar size={14} /> Día
          </button>
        )}
        <button onClick={() => setCurrentView('week')} className={`px-3 py-1 text-xs rounded ${currentView === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Semana</button>
        <button onClick={() => setCurrentView('month')} className={`px-3 py-1 text-xs rounded ${currentView === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Mes</button>
        {isParent1 && (
          <>
            <button onClick={() => setCurrentView('stats')} className={`px-3 py-1 text-xs rounded ${currentView === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
              <BarChart3 size={14} /> Estadísticas
            </button>
            <button onClick={saveScheduleInSupabase} className="px-3 py-1 text-xs rounded bg-green-600 text-white">Guardar</button>
          </>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {currentView === 'daily' && <DailyView />}
        {currentView === 'week' && <WeekView />}
        {currentView === 'month' && <MonthView />}
      </div>
      {popupObs && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setPopupObs(null)}>
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="text-xs font-bold mb-2">Observaciones:</div>
            <div className="text-sm mb-3">{popupObs}</div>
            <div className="text-right">
              <button onClick={() => setPopupObs(null)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoParentingApp;
