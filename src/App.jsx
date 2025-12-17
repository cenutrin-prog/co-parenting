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
    'GL (08:00-08:00)', 'E4D (09:00-21:00)', 'E4N (21:00-09:00)', 'C2 (09:00-21:00)',
    'C4T (10:00-22:00)', 'C3D (08:15-20:15)', 'C3N (20:15-08:15)',
    'E1D (08:00-20:00)', 'E1N (20:00-08:00)', 'E1DN (08:00-08:00)',
    'E2D (09:00-21:00)', 'E7DN (11:00-23:00)', 'E7DN (12:00-00:00)',
    'E3DN (09:00-09:00)', 'E3D (09:00-21:00)', 'E3N (21:00-09:00)'
  ];

  // Tipos de actividad para el padre (segunda fila de desplegables)
  const tiposActividadPadre = ['', 'CURSO', 'CLASE MÁSTER', 'F.O.', 'VIAJE', 'OTRO'];
  const horasEntradaPadre = ['', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '21:00', '22:00', '23:00'];
  const horasSalidaPadre = ['', '14:00', '14:30', '15:00', '15:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '00:00', '07:00', '08:00', '09:00'];

  const tiposTurnoMadre = ['', 'Mañana', 'Tarde', 'Noche'];
  const horasEntradaMadre = ['', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '21:00', '22:00', '23:00'];
  const horasSalidaMadre = ['', '14:00', '14:30', '15:00', '15:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '00:00', '07:00', '08:00', '09:00'];

  const [titleTapCount, setTitleTapCount] = useState(0);

  // Festivos de Málaga 2025 (nacionales, autonómicos y locales)
  const festivosMalaga2025 = [
    '2025-01-01', // Año Nuevo
    '2025-01-06', // Reyes
    '2025-02-28', // Día de Andalucía
    '2025-04-17', // Jueves Santo
    '2025-04-18', // Viernes Santo
    '2025-05-01', // Día del Trabajo
    '2025-08-15', // Asunción de la Virgen
    '2025-08-19', // Toma de Málaga (local)
    '2025-09-08', // Virgen de la Victoria (local)
    '2025-10-13', // Día de la Hispanidad (trasladado del domingo 12)
    '2025-11-01', // Todos los Santos
    '2025-12-06', // Día de la Constitución
    '2025-12-08', // Inmaculada Concepción
    '2025-12-25', // Navidad
  ];

  // Comprobar si una fecha es hoy
  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  // Comprobar si es fin de semana (sábado o domingo)
  const isWeekend = (date) => {
    if (!date) return false;
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = domingo, 6 = sábado
  };

  // Comprobar si es festivo
  const isHoliday = (date) => {
    if (!date) return false;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return festivosMalaga2025.includes(dateStr);
  };

  // Comprobar si es fin de semana o festivo (para color rojo)
  const isRedDay = (date) => {
    return isWeekend(date) || isHoliday(date);
  };

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

  const formatDate = useCallback((d) => { 
    if (!d) return ''; 
    const date = new Date(d);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);
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

  // Parsear actividad extra del padre (formato: "CURSO|09:00|15:00")
  const parseActividadPadre = (actividad) => {
    if (!actividad) return { tipo: '', entrada: '', salida: '' };
    const [tipo, entrada, salida] = actividad.split('|');
    return { tipo: tipo || '', entrada: entrada || '', salida: salida || '' };
  };

  // Construir string de actividad padre
  const buildActividadPadre = (tipo, entrada, salida) => {
    if (!tipo && !entrada && !salida) return '';
    return `${tipo || ''}|${entrada || ''}|${salida || ''}`;
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
      // Cargar TODAS las asignaciones (Supabase por defecto limita a 1000)
      const { data: asignaciones, error } = await supabase
        .from('asignaciones')
        .select('id, padre_id, hija_id, fecha, periodo, observaciones')
        .range(0, 10000);  // Aumentar el límite para traer todas
      if (error) console.error('Error cargando asignaciones:', error);
      
      console.log('Asignaciones cargadas de BD:', asignaciones?.length || 0);
      console.log('Parents en app:', parents);
      console.log('Children en app:', children);
      
      if (asignaciones && asignaciones.length > 0) {
        const padreIds = [...new Set(asignaciones.map(a => a.padre_id))];
        const hijaIds = [...new Set(asignaciones.map(a => a.hija_id))];
        const { data: padresData } = await supabase.from('padres').select('id, nombre').in('id', padreIds);
        const { data: hijasData } = await supabase.from('hijas').select('id, nombre').in('id', hijaIds);
        
        console.log('Padres en BD:', padresData);
        console.log('Hijas en BD:', hijasData);
        
        const padresMap = {}; const hijasMap = {};
        padresData?.forEach(p => { padresMap[p.id] = p.nombre; });
        hijasData?.forEach(h => { hijasMap[h.id] = h.nombre; });
        const newSchedule = {}; const newNotes = {};
        
        asignaciones.forEach(asig => {
          const padreNombre = padresMap[asig.padre_id]; 
          const hijaNombre = hijasMap[asig.hija_id];
          if (!padreNombre || !hijaNombre) {
            console.log('Asignación sin mapeo:', asig, { padreNombre, hijaNombre });
            return;
          }
          
          let parentKey = null;
          if (parents.parent1 === padreNombre) parentKey = 'parent1';
          else if (parents.parent2 === padreNombre) parentKey = 'parent2';
          else if (parents.other === padreNombre) parentKey = 'other';
          
          let childKey = null;
          if (children.child1 === hijaNombre) childKey = 'child1';
          else if (children.child2 === hijaNombre) childKey = 'child2';
          
          if (!parentKey || !childKey) {
            console.log('No coincide nombre:', { 
              padreNombre, 
              hijaNombre, 
              'parents.parent1': parents.parent1,
              'parents.parent2': parents.parent2,
              'children.child1': children.child1,
              'children.child2': children.child2
            });
            return;
          }
          
          const scheduleKey = `${asig.fecha}_${childKey}_${asig.periodo}`;
          newSchedule[scheduleKey] = parentKey;
          if (asig.observaciones) newNotes[scheduleKey] = asig.observaciones;
        });
        
        console.log('Schedule cargado:', Object.keys(newSchedule).length, 'entradas');
        setSchedule(newSchedule); 
        setNotes(newNotes);
      }
      
      const { data: turnosData, error: turnosError } = await supabase.from('turnos').select('*');
      if (turnosError) console.error('Error cargando turnos:', turnosError);
      if (turnosData && turnosData.length > 0) {
        const newTurnos = {};
        turnosData.forEach(t => {
          if (t.turno_padre) {
            // Separar turno y actividad si están unidos con "||"
            const partes = t.turno_padre.split('||');
            if (partes[0]) newTurnos[`${t.fecha}_padre`] = partes[0];
            if (partes[1]) newTurnos[`${t.fecha}_padre_actividad`] = partes[1];
          }
          if (t.turno_madre) newTurnos[`${t.fecha}_madre`] = t.turno_madre;
        });
        setTurnos(newTurnos);
        console.log('Turnos cargados:', Object.keys(newTurnos).length);
      }
    } catch (err) { console.error('Error inesperado al cargar:', err); }
  }, [parents, children]);

  useEffect(() => {
    if (step === 'main' && parents.parent1 && children.child1) loadScheduleFromSupabase();
  }, [step, parents.parent1, children.child1, loadScheduleFromSupabase]);

  const saveScheduleInSupabase = async () => {
    try {
      // Guardar asignaciones
      const keys = Object.keys(schedule).filter(k => schedule[k]);
      console.log('Asignaciones a guardar:', keys.length);
      
      const { data: padresData } = await supabase.from('padres').select('id, nombre');
      const { data: hijasData } = await supabase.from('hijas').select('id, nombre');
      const padresMap = {}; const hijasMap = {};
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
        
        if (!padreNombre || !hijaNombre) {
          console.log('Falta padre o hija:', { parentKey, childKey, padreNombre, hijaNombre });
          continue;
        }
        
        const padreId = padresMap[padreNombre]; 
        const hijaId = hijasMap[hijaNombre];
        
        if (!padreId || !hijaId) {
          console.log('No se encontró ID:', { padreNombre, hijaNombre, padreId, hijaId });
          continue;
        }
        
        upserts.push({ padre_id: padreId, hija_id: hijaId, fecha, periodo, observaciones: notes[k] || null });
      }
      
      console.log('Upserts preparados:', upserts.length);
      
      if (upserts.length > 0) {
        // Agrupar por fecha para borrar y luego insertar
        const fechasUnicas = [...new Set(upserts.map(u => u.fecha))];
        console.log('Fechas a actualizar:', fechasUnicas);
        
        for (const fecha of fechasUnicas) {
          const { error: deleteError } = await supabase.from('asignaciones').delete().eq('fecha', fecha);
          if (deleteError) console.error('Error borrando fecha', fecha, deleteError);
        }
        
        const { data: insertData, error: insertError } = await supabase.from('asignaciones').insert(upserts);
        if (insertError) {
          console.error('Error insertando asignaciones:', insertError);
          alert('Error al guardar asignaciones: ' + insertError.message);
          return;
        }
        console.log('Asignaciones insertadas correctamente');
      }
      
      // Guardar turnos
      const turnoKeys = Object.keys(turnos).filter(k => turnos[k]);
      const turnosPorFecha = {};
      turnoKeys.forEach(k => {
        const parts = k.split('_'); 
        const fecha = parts[0]; 
        const quien = parts.slice(1).join('_'); // Puede ser "padre", "madre", o "padre_actividad"
        if (!turnosPorFecha[fecha]) turnosPorFecha[fecha] = { turno_padre: null, turno_madre: null, actividad_padre: null };
        if (quien === 'padre') turnosPorFecha[fecha].turno_padre = turnos[k];
        if (quien === 'madre') turnosPorFecha[fecha].turno_madre = turnos[k];
        if (quien === 'padre_actividad') turnosPorFecha[fecha].actividad_padre = turnos[k];
      });
      
      // Combinar turno_padre y actividad_padre separados por "||"
      const turnoUpserts = Object.entries(turnosPorFecha).map(([fecha, data]) => {
        let turnoPadreCompleto = data.turno_padre || '';
        if (data.actividad_padre) {
          turnoPadreCompleto = turnoPadreCompleto ? `${turnoPadreCompleto}||${data.actividad_padre}` : `||${data.actividad_padre}`;
        }
        return {
          fecha, 
          turno_padre: turnoPadreCompleto || null, 
          turno_madre: data.turno_madre || null
        };
      });
      
      if (turnoUpserts.length > 0) {
        for (const t of turnoUpserts) {
          const { error: deleteError } = await supabase.from('turnos').delete().eq('fecha', t.fecha);
          if (deleteError) console.error('Error borrando turno', t.fecha, deleteError);
        }
        const { error: insertError } = await supabase.from('turnos').insert(turnoUpserts);
        if (insertError) {
          console.error('Error insertando turnos:', insertError);
          alert('Error al guardar turnos: ' + insertError.message);
          return;
        }
      }
      
      alert('Guardado correctamente. Asignaciones: ' + upserts.length + ', Turnos: ' + turnoUpserts.length);
    } catch (err) { 
      console.error('Error inesperado:', err); 
      alert('Error al guardar: ' + (err.message || err)); 
    }
  };

  // Componente selector de actividad extra del padre (3 desplegables en 1 fila)
  const ActividadPadreSelector = ({ fecha }) => {
    const actividadActual = turnos[`${fecha}_padre_actividad`] || '';
    const parsed = parseActividadPadre(actividadActual);

    const updateActividad = (field, value) => {
      const newActividad = buildActividadPadre(
        field === 'tipo' ? value : parsed.tipo,
        field === 'entrada' ? value : parsed.entrada,
        field === 'salida' ? value : parsed.salida
      );
      setTurnos(prev => ({ ...prev, [`${fecha}_padre_actividad`]: newActividad }));
    };

    const selectStyle = "w-full text-[9px] p-0.5 border rounded";
    const hasActividad = parsed.tipo || parsed.entrada || parsed.salida;

    return (
      <div className="flex gap-0.5 p-0.5 rounded mt-0.5" style={{ backgroundColor: hasActividad ? colors.parent1 + '20' : 'white' }}>
        <select value={parsed.tipo || ''} onChange={e => updateActividad('tipo', e.target.value)} className={selectStyle}>
          {tiposActividadPadre.map(t => <option key={t || 'empty'} value={t}>{t || '-'}</option>)}
        </select>
        <select value={parsed.entrada || ''} onChange={e => updateActividad('entrada', e.target.value)} className={selectStyle}>
          {horasEntradaPadre.map(h => <option key={h || 'e'} value={h}>{h || '-'}</option>)}
        </select>
        <select value={parsed.salida || ''} onChange={e => updateActividad('salida', e.target.value)} className={selectStyle}>
          {horasSalidaPadre.map(h => <option key={h || 's'} value={h}>{h || '-'}</option>)}
        </select>
      </div>
    );
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

    const selectStyle = "w-full text-[9px] p-0.5 border rounded";
    const hasTurno = t1.tipo || t2.tipo;

    return (
      <div className="flex flex-col gap-0.5 p-0.5 rounded" style={{ backgroundColor: hasTurno ? colors.parent2 + '30' : 'white' }}>
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
    const isParent1User = currentUser === 'parent1';
    const childrenToShow = isChildUser ? [currentUser] : ['child1', 'child2'];
    const dayName = daysOfWeek[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1];
    const dayNum = currentDate.getDate();
    const monthName = monthsShort[currentDate.getMonth()];
    const turnoKey = getTurnoKey(currentDate);
    const turnoPadre = turnos[`${turnoKey}_padre`] || '';
    const todayStyle = isToday(currentDate);
    const redDay = isRedDay(currentDate);

    return (
      <div className="p-2 flex flex-col h-full overflow-hidden">
        {/* Cabecera con navegación y botón Guardar */}
        <div className="flex justify-between items-center mb-2">
          <button onClick={() => setCurrentDate(d => addDays(d, -1))} className="px-2 py-1 border rounded text-sm font-bold">◀</button>
          <div className="flex flex-col items-center">
            {isParent1User && (
              <button onClick={saveScheduleInSupabase} className="px-3 py-1 text-xs rounded bg-green-600 text-white font-bold mb-1">Guardar</button>
            )}
            <div className={`font-bold text-sm text-center px-2 py-0.5 rounded ${todayStyle ? 'bg-black text-white' : ''}`}
              style={{ color: todayStyle ? 'white' : (redDay ? '#dc2626' : 'inherit') }}>
              {dayName} {dayNum} {monthName}
            </div>
          </div>
          <button onClick={() => setCurrentDate(d => addDays(d, 1))} className="px-2 py-1 border rounded text-sm font-bold">▶</button>
        </div>
        
        {/* Turnos de trabajo */}
        {(currentUser === 'parent1' || currentUser === 'parent2') && (
          <div className="mb-1 p-1.5 border rounded bg-gray-50">
            <div className="text-[10px] font-bold mb-1">Turnos de trabajo</div>
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="text-[10px] font-medium mb-0.5" style={{ color: colors.parent1 }}>{parents.parent1 || 'Padre'}</div>
                <select value={turnoPadre} onChange={e => handleTurnoChange(turnoKey, 'padre', e.target.value)}
                  className="w-full text-[10px] p-0.5 border rounded"
                  style={{ backgroundColor: turnoPadre ? colors.parent1 + '30' : 'white' }}>
                  <option value="">Sin turno</option>
                  {turnosPadre.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ActividadPadreSelector fecha={turnoKey} />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-medium mb-0.5" style={{ color: colors.parent2 }}>{parents.parent2 || 'Madre'}</div>
                <TurnoMadreSelector fecha={turnoKey} />
              </div>
            </div>
          </div>
        )}
        
        {/* Franjas Mañana/Tarde/Noche - reducido el gap */}
        <div className="flex-1 flex flex-col gap-0.5 min-h-0">
          {periods.map((period) => (
            <div key={period} className="flex-1 border rounded p-1 flex flex-col min-h-0">
              <div className="text-[10px] font-bold uppercase mb-0.5">{period}</div>
              <div className="flex gap-1 flex-1 min-h-0">
                {childrenToShow.map((child) => {
                  const sk = getScheduleKey(currentDate, child, period);
                  const childName = children[child] || (child === 'child1' ? 'Hijo 1' : 'Hijo 2');
                  const scheduleValue = schedule[sk] || '';
                  const noteValue = notes[sk] || '';
                  return (
                    <div key={sk} className="border rounded p-1 flex-1 flex flex-col min-h-0"
                      style={{ backgroundColor: scheduleValue ? colors[scheduleValue] + '20' : 'white' }}>
                      <div className="text-[10px] font-bold mb-0.5" style={{ color: colors[child] }}>{childName}</div>
                      <select value={scheduleValue} onChange={e => handleScheduleChange(sk, e.target.value)} disabled={isChildUser}
                        className="w-full text-[10px] p-0.5 border rounded mb-0.5"
                        style={{ backgroundColor: scheduleValue ? colors[scheduleValue] + '40' : 'white' }}>
                        <option value="">-</option>
                        <option value="parent1">{parents.parent1 || 'Papá'}</option>
                        <option value="parent2">{parents.parent2 || 'Mamá'}</option>
                        {parents.other && <option value="other">{parents.other}</option>}
                      </select>
                      <input type="text" placeholder="Obs..." defaultValue={noteValue}
                        onBlur={e => handleNoteChange(sk, e.target.value)} disabled={isChildUser}
                        className="w-full text-[9px] p-0.5 border rounded" />
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
      <div className="mb-2">
        {/* Título del calendario secundario (solo para la otra hija) */}
        {childFilter && (
          <div className="text-[10px] font-bold text-center mb-1" style={{ color: colors[childFilter] }}>
            {(children[childFilter] || 'Hermana').toUpperCase()}
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: isParentUser ? '45px repeat(7, 1fr)' : '40px repeat(7, 1fr)', gap: 1, fontSize: 9 }}>
          {showHeader && (
            <>
              <div />
              {weekDates.map((d, i) => {
                const today = isToday(d);
                const redDay = isRedDay(d);
                return (
                  <div key={formatDate(d)} 
                    className={`text-center font-bold text-[9px] ${today ? 'bg-black text-white rounded px-0.5' : ''}`}
                    style={{ color: today ? 'white' : (redDay ? '#dc2626' : 'inherit') }}>
                    {daysOfWeek[i]} {d.getDate()}
                  </div>
                );
              })}
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
                    {horario && <div className="text-[5px]">{horario}</div>}
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
                        <div className="text-[5px]">{t.entrada}-{t.salida}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}
          
          {periods.map((period) => (
            <React.Fragment key={period}>
              <div className="font-bold text-[9px] flex items-center">{period}</div>
              {weekDates.map((d) => {
                return (
                  <div key={`${formatDate(d)}_${period}`} className="border rounded p-0.5 min-h-[28px] flex flex-col items-center justify-center gap-0.5">
                    {isParentUser && ['child1', 'child2'].map((child) => {
                      const sk = getScheduleKey(d, child, period);
                      const assigned = schedule[sk];
                      const obs = notes[sk] || '';
                      const isWithThisParent = assigned === currentUser;
                      const displayName = isWithThisParent ? (children[child] || (child === 'child1' ? 'H1' : 'H2')) : '-';
                      return (
                        <div key={sk} onClick={() => obs && setPopupObs(obs)}
                          className="text-[8px] text-center rounded px-0.5 cursor-pointer font-bold w-full"
                          style={{ backgroundColor: isWithThisParent ? colors[child] : '#e5e7eb', color: isWithThisParent ? '#000' : '#999' }}>
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
                          className="text-[9px] text-center rounded px-0.5 py-0.5 cursor-pointer font-bold"
                          style={{ backgroundColor: assigned ? colors[assigned] : '#e5e7eb', color: assigned ? '#000' : '#888' }}>
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
        <div className="text-[10px] font-bold text-center mb-1">CALENDARIO GLOBAL</div>
        <div className="grid" style={{ gridTemplateColumns: '50px repeat(7, 1fr)', gap: 2, fontSize: 8 }}>
          <div />
          {weekDates.map((d, i) => {
            const today = isToday(d);
            const redDay = isRedDay(d);
            return (
              <div key={formatDate(d)} 
                className={`text-center font-bold text-[9px] ${today ? 'bg-black text-white rounded px-0.5' : ''}`}
                style={{ color: today ? 'white' : (redDay ? '#dc2626' : 'inherit') }}>
                {daysOfWeek[i]} {d.getDate()}
              </div>
            );
          })}
          {periods.map((period) => (
            <React.Fragment key={period}>
              <div className="font-bold text-[9px] flex items-center">{period}</div>
              {weekDates.map((d) => (
                <div key={`${formatDate(d)}_${period}_g`} className="border rounded p-0.5 min-h-[28px]">
                  {caregivers.map(cg => {
                    const c1k = getScheduleKey(d, 'child1', period);
                    const c2k = getScheduleKey(d, 'child2', period);
                    const c1a = schedule[c1k] === cg.key;
                    const c2a = schedule[c2k] === cg.key;
                    const c1i = c1a ? (children.child1 || 'H1')[0].toUpperCase() : '-';
                    const c2i = c2a ? (children.child2 || 'H2')[0].toUpperCase() : '-';
                    return (
                      <div key={cg.key} className="flex items-center gap-0.5 text-[7px]">
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

  // Calendario semanal de la madre (muestra lo que ve ella)
  const MotherWeekCalendar = () => {
    const weekDates = getWeekDates(currentDate);
    
    return (
      <div className="mb-2 border-t-2 pt-2">
        <div className="text-[10px] font-bold text-center mb-1" style={{ color: '#065f46' }}>
          CALENDARIO {(parents.parent2 || 'MADRE').toUpperCase()}
        </div>
        <div className="grid" style={{ gridTemplateColumns: '45px repeat(7, 1fr)', gap: 1, fontSize: 9 }}>
          {/* Cabecera días */}
          <div />
          {weekDates.map((d, i) => {
            const today = isToday(d);
            const redDay = isRedDay(d);
            return (
              <div key={formatDate(d)} 
                className={`text-center font-bold text-[9px] ${today ? 'bg-black text-white rounded px-0.5' : ''}`}
                style={{ color: today ? 'white' : (redDay ? '#dc2626' : 'inherit') }}>
                {daysOfWeek[i]} {d.getDate()}
              </div>
            );
          })}
          
          {/* Filas de turnos */}
          <div className="font-bold text-[7px] flex items-center" style={{ color: colors.parent1 }}>{parents.parent1 || 'Padre'}</div>
          {weekDates.map((d) => {
            const turnoKey = getTurnoKey(d);
            const turno = turnos[`${turnoKey}_padre`] || '';
            const { codigo, horario } = parseTurnoPadre(turno);
            return (
              <div key={`tp_m_${formatDate(d)}`} className="text-center rounded p-0.5" style={{ backgroundColor: turno ? colors.parent1 + '40' : '#f3f4f6', color: colors.parent1 }}>
                <div className="text-[7px] font-bold">{codigo}</div>
                {horario && <div className="text-[5px]">{horario}</div>}
              </div>
            );
          })}
          
          <div className="font-bold text-[7px] flex items-center" style={{ color: '#065f46' }}>{parents.parent2 || 'Madre'}</div>
          {weekDates.map((d) => {
            const turnoKey = getTurnoKey(d);
            const turno = turnos[`${turnoKey}_madre`] || '';
            const parsed = parseTurnoMadre(turno);
            return (
              <div key={`tm_m_${formatDate(d)}`} className="text-center rounded p-0.5" style={{ backgroundColor: turno ? colors.parent2 + '40' : '#f3f4f6', color: '#065f46' }}>
                {parsed.length === 0 && <div className="text-[7px]">-</div>}
                {parsed.map((t, idx) => (
                  <div key={idx}>
                    <div className="text-[7px] font-bold">{t.tipo}</div>
                    <div className="text-[5px]">{t.entrada}-{t.salida}</div>
                  </div>
                ))}
              </div>
            );
          })}
          
          {/* Filas de periodos - mostrando lo que tiene la madre */}
          {periods.map((period) => (
            <React.Fragment key={period}>
              <div className="font-bold text-[9px] flex items-center">{period}</div>
              {weekDates.map((d) => {
                return (
                  <div key={`${formatDate(d)}_${period}_mother`} className="border rounded p-0.5 min-h-[28px] flex flex-col items-center justify-center gap-0.5">
                    {['child1', 'child2'].map((child) => {
                      const sk = getScheduleKey(d, child, period);
                      const assigned = schedule[sk];
                      const obs = notes[sk] || '';
                      // Para el calendario de la madre, mostramos si está con ella (parent2)
                      const isWithMother = assigned === 'parent2';
                      const displayName = isWithMother ? (children[child] || (child === 'child1' ? 'H1' : 'H2')) : '-';
                      return (
                        <div key={sk} onClick={() => obs && setPopupObs(obs)}
                          className="text-[8px] text-center rounded px-0.5 cursor-pointer font-bold w-full"
                          style={{ backgroundColor: isWithMother ? colors[child] : '#e5e7eb', color: isWithMother ? '#000' : '#999' }}>
                          {displayName}{obs && '*'}
                        </div>
                      );
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
    const isParent1 = currentUser === 'parent1';
    
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
        {/* Calendario de la madre - SOLO para el padre (parent1) */}
        {isParent1 && <MotherWeekCalendar />}
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
    const childColor = isChildUser ? colors[currentUser] : '';

    // Función para obtener iniciales del nombre (JL para Jose Luis, Ire para Irene)
    const getIniciales = (nombre, isParent1) => {
      if (!nombre) return isParent1 ? 'P' : 'M';
      if (isParent1) {
        // Para el padre: iniciales de cada palabra (Jose Luis -> JL)
        return nombre.split(' ').map(p => p[0]).join('').toUpperCase();
      } else {
        // Para la madre: primeras 3 letras (Irene -> Ire)
        return nombre.substring(0, 3);
      }
    };

    // Función para obtener texto corto del turno madre (M, T, N, M/T)
    const getTurnoMadreCorto = (turnoStr) => {
      if (!turnoStr) return '';
      const parsed = parseTurnoMadre(turnoStr);
      if (parsed.length === 0) return '';
      const abreviar = (tipo) => {
        if (!tipo) return '';
        if (tipo.toLowerCase().startsWith('mañ')) return 'M';
        if (tipo.toLowerCase().startsWith('tar')) return 'T';
        if (tipo.toLowerCase().startsWith('noc')) return 'N';
        return tipo[0].toUpperCase();
      };
      if (parsed.length === 1) return abreviar(parsed[0].tipo);
      return parsed.map(t => abreviar(t.tipo)).filter(t => t).join('/');
    };

    // Calcular número de filas del mes (semanas)
    const numRows = Math.ceil(monthDates.length / 7);

    const inicialesPadre = getIniciales(parents.parent1, true);
    const inicialesMadre = getIniciales(parents.parent2, false);

    // Si es hijo, usar vista grande como ChildMonthView
    if (isChildUser) {
      return (
        <div className="p-0.5 h-full flex flex-col">
          <div className="flex items-center justify-between mb-0.5">
            <button onClick={() => setCurrentDate(d => addMonths(d, -1))} className="p-0.5"><ChevronLeft size={14} /></button>
            <div className="text-xs font-medium">
              <span style={{ color: childColor }}>{childName}</span> - {capitalize(monthLabel)}
            </div>
            <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-0.5"><ChevronRight size={14} /></button>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="grid h-full" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `14px repeat(${numRows}, 1fr)`, gap: 2 }}>
              {daysOfWeek.map((d, i) => (
                <div key={d} className="text-[8px] font-bold text-center" 
                  style={{ color: (i === 5 || i === 6) ? '#dc2626' : 'inherit' }}>{d}</div>
              ))}
              {monthDates.map((date, idx) => {
                const dateKey = date ? formatDate(date) : `empty-${idx}`;
                if (!date) return <div key={dateKey} className="border rounded bg-gray-50" />;
                const today = isToday(date);
                const redDay = isRedDay(date);

                return (
                  <div key={dateKey} className="border rounded p-0.5 flex flex-col overflow-hidden">
                    <div className="flex justify-start mb-0.5">
                      <span className={`font-bold text-[9px] ${today ? 'bg-black text-white rounded-full w-4 h-4 flex items-center justify-center' : ''}`}
                        style={{ color: today ? 'white' : (redDay ? '#dc2626' : 'inherit') }}>
                        {date.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col gap-0.5">
                      {periods.map((period) => {
                        const ck = getScheduleKey(date, currentUser, period);
                        const assigned = schedule[ck];
                        let bg = '#e5e7eb';
                        let txt = '-';
                        if (assigned === 'parent1') { bg = colors.parent1; txt = 'Papá'; }
                        else if (assigned === 'parent2') { bg = colors.parent2; txt = 'Mamá'; }
                        else if (assigned === 'other') { bg = colors.other; txt = parents.other || 'Otro'; }
                        return <div key={`${dateKey}_${period}`} className="flex-1 flex items-center justify-center rounded font-bold text-[7px]" style={{ backgroundColor: bg }}>{txt}</div>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Vista para padres (con turnos)
    return (
      <div className="p-2">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setCurrentDate(d => addMonths(d, -1))} className="p-1"><ChevronLeft size={18} /></button>
          <div className="text-sm font-medium">{capitalize(monthLabel)}</div>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-1"><ChevronRight size={18} /></button>
        </div>
        <div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {daysOfWeek.map((d, i) => (
              <div key={d} className="text-[9px] font-bold text-center py-1" 
                style={{ color: (i === 5 || i === 6) ? '#dc2626' : 'inherit' }}>{d}</div>
            ))}
            {monthDates.map((date, idx) => {
              const dateKey = date ? formatDate(date) : `empty-${idx}`;
              if (!date) return <div key={dateKey} className="border rounded bg-gray-50 min-h-[52px]" />;
              
              const turnoKey = getTurnoKey(date);
              const turnoPadre = turnos[`${turnoKey}_padre`] || '';
              const turnoMadre = turnos[`${turnoKey}_madre`] || '';
              const { codigo: codP } = parseTurnoPadre(turnoPadre);
              const turnoMadreCorto = getTurnoMadreCorto(turnoMadre);

              return (
                <div key={dateKey} className="border rounded p-0.5 flex flex-col overflow-hidden min-h-[52px]">
                  {/* Cabecera con número y turnos */}
                  <div className="flex" style={{ fontSize: 6, lineHeight: '8px' }}>
                    {/* Número del día */}
                    {(() => {
                      const today = isToday(date);
                      const redDay = isRedDay(date);
                      return (
                        <span className={`font-bold text-[9px] mr-0.5 ${today ? 'bg-black text-white rounded-full w-4 h-4 flex items-center justify-center' : ''}`}
                          style={{ color: today ? 'white' : (redDay ? '#dc2626' : 'inherit') }}>
                          {date.getDate()}
                        </span>
                      );
                    })()}
                    
                    {/* Turnos de los padres */}
                    <div className="flex-1 flex flex-col text-[6px]">
                      <div className="flex justify-between" style={{ color: colors.parent1 }}>
                        <span className="font-bold">{inicialesPadre}</span>
                        <span className="font-bold">{codP || '-'}</span>
                      </div>
                      <div className="flex justify-between" style={{ color: '#065f46' }}>
                        <span className="font-bold">{inicialesMadre}</span>
                        <span className="font-bold">{turnoMadreCorto || '-'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Asignaciones */}
                  <div className="flex-1 flex flex-col gap-0.5 mt-0.5">
                    {periods.map((period) => {
                      const c1k = getScheduleKey(date, 'child1', period);
                      const c2k = getScheduleKey(date, 'child2', period);
                      const c1a = schedule[c1k] === currentUser;
                      const c2a = schedule[c2k] === currentUser;
                      
                      return (
                        <div key={`${dateKey}_${period}`} className="flex gap-0.5 flex-1">
                          <div className="flex-1 flex items-center justify-center rounded font-bold text-[8px]" style={{ backgroundColor: c1a ? colors.child1 : '#e5e7eb' }}>
                            {c1a ? (children.child1 || 'H1')[0] : '-'}
                          </div>
                          <div className="flex-1 flex items-center justify-center rounded font-bold text-[8px]" style={{ backgroundColor: c2a ? colors.child2 : '#e5e7eb' }}>
                            {c2a ? (children.child2 || 'H2')[0] : '-'}
                          </div>
                        </div>
                      );
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

  // Vista mensual de la madre (para el botón Irene del padre)
  const MotherMonthView = () => {
    const monthDates = getMonthDates(currentDate);
    const monthLabel = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    // Función para obtener iniciales del nombre
    const getIniciales = (nombre, isParent1) => {
      if (!nombre) return isParent1 ? 'P' : 'M';
      if (isParent1) {
        return nombre.split(' ').map(p => p[0]).join('').toUpperCase();
      } else {
        return nombre.substring(0, 3);
      }
    };

    // Función para obtener texto corto del turno madre
    const getTurnoMadreCorto = (turnoStr) => {
      if (!turnoStr) return '';
      const parsed = parseTurnoMadre(turnoStr);
      if (parsed.length === 0) return '';
      const abreviar = (tipo) => {
        if (!tipo) return '';
        if (tipo.toLowerCase().startsWith('mañ')) return 'M';
        if (tipo.toLowerCase().startsWith('tar')) return 'T';
        if (tipo.toLowerCase().startsWith('noc')) return 'N';
        return tipo[0].toUpperCase();
      };
      if (parsed.length === 1) return abreviar(parsed[0].tipo);
      return parsed.map(t => abreviar(t.tipo)).filter(t => t).join('/');
    };

    const inicialesPadre = getIniciales(parents.parent1, true);
    const inicialesMadre = getIniciales(parents.parent2, false);

    return (
      <div className="p-2">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setCurrentDate(d => addMonths(d, -1))} className="p-1"><ChevronLeft size={18} /></button>
          <div className="text-sm font-medium">
            <span style={{ color: '#065f46' }}>{(parents.parent2 || 'Madre').toUpperCase()}</span> - {capitalize(monthLabel)}
          </div>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-1"><ChevronRight size={18} /></button>
        </div>
        <div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {daysOfWeek.map((d, i) => (
              <div key={d} className="text-[9px] font-bold text-center py-1" 
                style={{ color: (i === 5 || i === 6) ? '#dc2626' : 'inherit' }}>{d}</div>
            ))}
            {monthDates.map((date, idx) => {
              const dateKey = date ? formatDate(date) : `empty-${idx}`;
              if (!date) return <div key={dateKey} className="border rounded bg-gray-50 min-h-[52px]" />;
              
              const turnoKey = getTurnoKey(date);
              const turnoPadre = turnos[`${turnoKey}_padre`] || '';
              const turnoMadre = turnos[`${turnoKey}_madre`] || '';
              const { codigo: codP } = parseTurnoPadre(turnoPadre);
              const turnoMadreCorto = getTurnoMadreCorto(turnoMadre);

              return (
                <div key={dateKey} className="border rounded p-0.5 flex flex-col overflow-hidden min-h-[52px]">
                  {/* Cabecera con número y turnos */}
                  <div className="flex" style={{ fontSize: 6, lineHeight: '8px' }}>
                    {(() => {
                      const today = isToday(date);
                      const redDay = isRedDay(date);
                      return (
                        <span className={`font-bold text-[9px] mr-0.5 ${today ? 'bg-black text-white rounded-full w-4 h-4 flex items-center justify-center' : ''}`}
                          style={{ color: today ? 'white' : (redDay ? '#dc2626' : 'inherit') }}>
                          {date.getDate()}
                        </span>
                      );
                    })()}
                    <div className="flex-1 flex flex-col text-[6px]">
                      <div className="flex justify-between" style={{ color: colors.parent1 }}>
                        <span className="font-bold">{inicialesPadre}</span>
                        <span className="font-bold">{codP || '-'}</span>
                      </div>
                      <div className="flex justify-between" style={{ color: '#065f46' }}>
                        <span className="font-bold">{inicialesMadre}</span>
                        <span className="font-bold">{turnoMadreCorto || '-'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Asignaciones - mostrando lo que tiene la madre (parent2) */}
                  <div className="flex-1 flex flex-col gap-0.5 mt-0.5">
                    {periods.map((period) => {
                      const c1k = getScheduleKey(date, 'child1', period);
                      const c2k = getScheduleKey(date, 'child2', period);
                      // Aquí mostramos si está con la madre (parent2)
                      const c1a = schedule[c1k] === 'parent2';
                      const c2a = schedule[c2k] === 'parent2';
                      
                      return (
                        <div key={`${dateKey}_${period}`} className="flex gap-0.5 flex-1">
                          <div className="flex-1 flex items-center justify-center rounded font-bold text-[8px]" style={{ backgroundColor: c1a ? colors.child1 : '#e5e7eb' }}>
                            {c1a ? (children.child1 || 'H1')[0] : '-'}
                          </div>
                          <div className="flex-1 flex items-center justify-center rounded font-bold text-[8px]" style={{ backgroundColor: c2a ? colors.child2 : '#e5e7eb' }}>
                            {c2a ? (children.child2 || 'H2')[0] : '-'}
                          </div>
                        </div>
                      );
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

  // VISTA ESTADÍSTICAS
  const StatsView = () => {
    const [mesSeleccionadoResumen, setMesSeleccionadoResumen] = useState('global');
    const [mesSeleccionadoPadre, setMesSeleccionadoPadre] = useState('global');
    const [mesSeleccionadoMadre, setMesSeleccionadoMadre] = useState('global');
    const [mesSeleccionadoOtro, setMesSeleccionadoOtro] = useState('global');

    // Obtener lista de meses disponibles desde el schedule
    const getMesesDisponibles = () => {
      const meses = new Set();
      Object.keys(schedule).forEach(key => {
        const fecha = key.split('_')[0];
        if (fecha && fecha.length >= 7) {
          const mesAno = fecha.substring(0, 7); // "2025-01"
          meses.add(mesAno);
        }
      });
      const mesesArray = Array.from(meses).sort();
      return mesesArray;
    };

    const mesesDisponibles = getMesesDisponibles();

    // Formatear mes para mostrar (2025-01 -> Enero 2025)
    const formatearMes = (mesAno) => {
      if (mesAno === 'global') return 'Global';
      const [ano, mes] = mesAno.split('-');
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `${meses[parseInt(mes) - 1]} ${ano}`;
    };

    // Calcular estadísticas desde el schedule, filtrando por mes si se especifica
    const calcularEstadisticas = (mesAno) => {
      const stats = {
        parent1: { child1: { total: 0, LV: 0, SD: 0 }, child2: { total: 0, LV: 0, SD: 0 }, ambas: { total: 0, LV: 0, SD: 0 } },
        parent2: { child1: { total: 0, LV: 0, SD: 0 }, child2: { total: 0, LV: 0, SD: 0 }, ambas: { total: 0, LV: 0, SD: 0 } },
        other: { child1: { total: 0, LV: 0, SD: 0 }, child2: { total: 0, LV: 0, SD: 0 }, ambas: { total: 0, LV: 0, SD: 0 } }
      };

      Object.entries(schedule).forEach(([key, parentKey]) => {
        if (!parentKey) return;
        
        // key formato: "2024-12-09_child1_Mañana"
        const parts = key.split('_');
        if (parts.length < 3) return;
        
        const fecha = parts[0];
        const childKey = parts[1];

        // Filtrar por mes si no es global
        if (mesAno !== 'global') {
          const mesAnoFecha = fecha.substring(0, 7);
          if (mesAnoFecha !== mesAno) return;
        }
        
        // Obtener día de la semana (0=domingo, 6=sábado)
        const date = new Date(fecha);
        const dayOfWeek = date.getDay();
        const esFinDeSemana = dayOfWeek === 0 || dayOfWeek === 6; // Domingo o Sábado
        
        if (stats[parentKey] && stats[parentKey][childKey]) {
          stats[parentKey][childKey].total++;
          stats[parentKey].ambas.total++;
          
          if (esFinDeSemana) {
            stats[parentKey][childKey].SD++;
            stats[parentKey].ambas.SD++;
          } else {
            stats[parentKey][childKey].LV++;
            stats[parentKey].ambas.LV++;
          }
        }
      });

      return stats;
    };

    // Selector de mes
    const SelectorMes = ({ valor, onChange }) => (
      <select value={valor} onChange={e => onChange(e.target.value)}
        className="text-[10px] p-0.5 border rounded bg-white ml-2">
        <option value="global">Global</option>
        {mesesDisponibles.map(mes => (
          <option key={mes} value={mes}>{formatearMes(mes)}</option>
        ))}
      </select>
    );
    
    // Componente de tabla para cada cuidador
    const TablaCuidador = ({ parentKey, nombre, color, mesSeleccionado, setMesSeleccionado }) => {
      const stats = calcularEstadisticas(mesSeleccionado);
      const data = stats[parentKey];
      const child1Name = children.child1 || 'Hija 1';
      const child2Name = children.child2 || 'Hija 2';
      
      return (
        <div className="mb-4">
          <div className="font-bold text-sm mb-2 p-2 rounded flex items-center justify-between" style={{ backgroundColor: color + '40', color: color === '#86efac' ? '#065f46' : color }}>
            <span>{nombre}</span>
            <SelectorMes valor={mesSeleccionado} onChange={setMesSeleccionado} />
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-1 text-left"></th>
                <th className="border p-1 text-center font-bold">TOTAL</th>
                <th className="border p-1 text-center">L-V</th>
                <th className="border p-1 text-center">S-D</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-1 font-medium" style={{ backgroundColor: colors.child1 + '30' }}>{child1Name}</td>
                <td className="border p-1 text-center font-bold">{data.child1.total}</td>
                <td className="border p-1 text-center">{data.child1.LV}</td>
                <td className="border p-1 text-center">{data.child1.SD}</td>
              </tr>
              <tr>
                <td className="border p-1 font-medium" style={{ backgroundColor: colors.child2 + '30' }}>{child2Name}</td>
                <td className="border p-1 text-center font-bold">{data.child2.total}</td>
                <td className="border p-1 text-center">{data.child2.LV}</td>
                <td className="border p-1 text-center">{data.child2.SD}</td>
              </tr>
              <tr className="bg-gray-50 font-bold">
                <td className="border p-1">AMBAS</td>
                <td className="border p-1 text-center">{data.ambas.total}</td>
                <td className="border p-1 text-center">{data.ambas.LV}</td>
                <td className="border p-1 text-center">{data.ambas.SD}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    };

    // Resumen comparativo
    const ResumenComparativo = () => {
      const stats = calcularEstadisticas(mesSeleccionadoResumen);
      const totalParent1 = stats.parent1.ambas.total;
      const totalParent2 = stats.parent2.ambas.total;
      const totalOther = stats.other.ambas.total;
      const granTotal = totalParent1 + totalParent2 + totalOther;
      
      const pctParent1 = granTotal > 0 ? ((totalParent1 / granTotal) * 100).toFixed(1) : 0;
      const pctParent2 = granTotal > 0 ? ((totalParent2 / granTotal) * 100).toFixed(1) : 0;
      const pctOther = granTotal > 0 ? ((totalOther / granTotal) * 100).toFixed(1) : 0;

      return (
        <div className="mb-4 p-2 bg-gray-50 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">📊 Resumen</span>
            <SelectorMes valor={mesSeleccionadoResumen} onChange={setMesSeleccionadoResumen} />
          </div>
          <div className="space-y-2">
            {/* Barra de progreso padre */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: colors.parent1 }}>{parents.parent1}</span>
                <span className="font-bold">{totalParent1} franjas ({pctParent1}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-3">
                <div className="h-3 rounded" style={{ width: `${pctParent1}%`, backgroundColor: colors.parent1 }}></div>
              </div>
            </div>
            {/* Barra de progreso madre */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: '#065f46' }}>{parents.parent2}</span>
                <span className="font-bold">{totalParent2} franjas ({pctParent2}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-3">
                <div className="h-3 rounded" style={{ width: `${pctParent2}%`, backgroundColor: colors.parent2 }}></div>
              </div>
            </div>
            {/* Barra de progreso otro cuidador (si existe) */}
            {parents.other && totalOther > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: colors.other }}>{parents.other}</span>
                  <span className="font-bold">{totalOther} franjas ({pctOther}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded h-3">
                  <div className="h-3 rounded" style={{ width: `${pctOther}%`, backgroundColor: colors.other }}></div>
                </div>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-2 text-right">
            Total: {granTotal} franjas registradas
          </div>
        </div>
      );
    };

    return (
      <div className="p-2 h-full overflow-y-auto">
        <div className="text-center font-bold text-sm mb-3">📈 Estadísticas de Custodia</div>
        
        <ResumenComparativo />
        
        <TablaCuidador 
          parentKey="parent1" 
          nombre={parents.parent1 || 'Padre'} 
          color={colors.parent1}
          mesSeleccionado={mesSeleccionadoPadre}
          setMesSeleccionado={setMesSeleccionadoPadre}
        />
        
        <TablaCuidador 
          parentKey="parent2" 
          nombre={parents.parent2 || 'Madre'} 
          color={colors.parent2}
          mesSeleccionado={mesSeleccionadoMadre}
          setMesSeleccionado={setMesSeleccionadoMadre}
        />
        
        {parents.other && (
          <TablaCuidador 
            parentKey="other" 
            nombre={parents.other} 
            color={colors.other}
            mesSeleccionado={mesSeleccionadoOtro}
            setMesSeleccionado={setMesSeleccionadoOtro}
          />
        )}

        <div className="text-[10px] text-gray-400 text-center mt-4">
          L-V = Lunes a Viernes | S-D = Sábado y Domingo
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
  const isParent = isParent1 || isParent2;
  const isChild = currentUser === 'child1' || currentUser === 'child2';

  // Vista mensual de un hijo específico (para padres)
  const ChildMonthView = ({ childKey }) => {
    const monthDates = getMonthDates(currentDate);
    const monthLabel = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const childName = (children[childKey] || 'Hijo').toUpperCase();
    const childColor = colors[childKey];

    return (
      <div className="p-0.5 h-full flex flex-col">
        <div className="flex items-center justify-between mb-0.5">
          <button onClick={() => setCurrentDate(d => addMonths(d, -1))} className="p-0.5"><ChevronLeft size={14} /></button>
          <div className="text-xs font-medium">
            <span style={{ color: childColor }}>{childName}</span> - {capitalize(monthLabel)}
          </div>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-0.5"><ChevronRight size={14} /></button>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="grid h-full" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `14px repeat(${Math.ceil(monthDates.length / 7)}, 1fr)`, gap: 2 }}>
            {daysOfWeek.map((d, i) => (
              <div key={d} className="text-[8px] font-bold text-center" 
                style={{ color: (i === 5 || i === 6) ? '#dc2626' : 'inherit' }}>{d}</div>
            ))}
            {monthDates.map((date, idx) => {
              const dateKey = date ? formatDate(date) : `empty-${idx}`;
              if (!date) return <div key={dateKey} className="border rounded bg-gray-50" />;
              const today = isToday(date);
              const redDay = isRedDay(date);

              return (
                <div key={dateKey} className="border rounded p-0.5 flex flex-col overflow-hidden">
                  <div className="flex justify-start mb-0.5">
                    <span className={`font-bold text-[9px] ${today ? 'bg-black text-white rounded-full w-4 h-4 flex items-center justify-center' : ''}`}
                      style={{ color: today ? 'white' : (redDay ? '#dc2626' : 'inherit') }}>
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5">
                    {periods.map((period) => {
                      const ck = getScheduleKey(date, childKey, period);
                      const assigned = schedule[ck];
                      let bg = '#e5e7eb';
                      let txt = '-';
                      if (assigned === 'parent1') { bg = colors.parent1; txt = 'Papá'; }
                      else if (assigned === 'parent2') { bg = colors.parent2; txt = 'Mamá'; }
                      else if (assigned === 'other') { bg = colors.other; txt = parents.other || 'Otro'; }
                      return <div key={`${dateKey}_${period}`} className="flex-1 flex items-center justify-center rounded font-bold text-[7px]" style={{ backgroundColor: bg }}>{txt}</div>;
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
      
      {/* Botones de navegación - UNA SOLA FILA PARA PADRE (parent1) */}
      {isParent1 ? (
        <div className="flex gap-1 p-1.5 border-b">
          <button onClick={() => setCurrentView('daily')} className={`px-2 py-1 text-xs rounded flex items-center gap-0.5 ${currentView === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
            <Calendar size={11} /> Día
          </button>
          <button onClick={() => setCurrentView('week')} className={`px-2 py-1 text-xs rounded ${currentView === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
            Sem
          </button>
          <button onClick={() => setCurrentView('month')} className={`px-2 py-1 text-xs rounded ${currentView === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
            Mes
          </button>
          <button onClick={() => setCurrentView('motherMonth')} className={`px-2 py-1 text-xs rounded ${currentView === 'motherMonth' ? 'text-white' : 'bg-gray-100'}`}
            style={{ backgroundColor: currentView === 'motherMonth' ? colors.parent2 : undefined, color: '#065f46', fontWeight: 'bold' }}>
            {parents.parent2 || 'Madre'}
          </button>
          <button onClick={() => setCurrentView('child1month')} className={`px-2 py-1 text-xs rounded ${currentView === 'child1month' ? 'text-white' : 'bg-gray-100'}`}
            style={{ backgroundColor: currentView === 'child1month' ? colors.child1 : undefined, color: currentView === 'child1month' ? '#000' : undefined }}>
            {children.child1 || 'Hijo 1'}
          </button>
          <button onClick={() => setCurrentView('child2month')} className={`px-2 py-1 text-xs rounded ${currentView === 'child2month' ? 'text-white' : 'bg-gray-100'}`}
            style={{ backgroundColor: currentView === 'child2month' ? colors.child2 : undefined, color: currentView === 'child2month' ? '#000' : undefined }}>
            {children.child2 || 'Hijo 2'}
          </button>
          <button onClick={() => setCurrentView('stats')} className={`px-1.5 py-1 text-xs rounded ${currentView === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
            <BarChart3 size={14} />
          </button>
        </div>
      ) : (
        /* Botones normales para madre e hijos */
        <div className="flex gap-1.5 p-2 border-b">
          <button onClick={() => setCurrentView('week')} className={`px-3 py-1.5 text-sm rounded ${currentView === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
            Semana
          </button>
          <button onClick={() => setCurrentView('month')} className={`px-3 py-1.5 text-sm rounded ${currentView === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Mes</button>
          {/* Botones vista mensual hijos - para madre */}
          {isParent2 && (
            <>
              <button onClick={() => setCurrentView('child1month')} className={`px-3 py-1.5 text-sm rounded ${currentView === 'child1month' ? 'text-white' : 'bg-gray-100'}`}
                style={{ backgroundColor: currentView === 'child1month' ? colors.child1 : undefined, color: currentView === 'child1month' ? '#000' : undefined }}>
                {children.child1 || 'Hijo 1'}
              </button>
              <button onClick={() => setCurrentView('child2month')} className={`px-3 py-1.5 text-sm rounded ${currentView === 'child2month' ? 'text-white' : 'bg-gray-100'}`}
                style={{ backgroundColor: currentView === 'child2month' ? colors.child2 : undefined, color: currentView === 'child2month' ? '#000' : undefined }}>
                {children.child2 || 'Hijo 2'}
              </button>
            </>
          )}
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        {currentView === 'daily' && <DailyView />}
        {currentView === 'week' && <WeekView />}
        {currentView === 'month' && <MonthView />}
        {currentView === 'child1month' && <ChildMonthView childKey="child1" />}
        {currentView === 'child2month' && <ChildMonthView childKey="child2" />}
        {currentView === 'motherMonth' && <MotherMonthView />}
        {currentView === 'stats' && <StatsView />}
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
