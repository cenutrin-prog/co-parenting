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
  // Vista inicial: Month para padre, week para otros
  const getInitialView = () => {
    if (savedUser === 'parent1') return 'month';
    return 'week';
  };
  const [currentView, setCurrentView] = useState(getInitialView());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [popupObs, setPopupObs] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveStatus, setLastSaveStatus] = useState(null); // 'success', 'error', o null
  const [weekAssignOffset, setWeekAssignOffset] = useState(0); // Offset para vista de asignación semanal
  const periods = ['Mañana', 'Tarde', 'Noche'];
  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const monthsShort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  const turnosPadre = [
    'E5DN (09:00-09:00)', 'E5D (09:00-21:00)', 'E5N (21:00-09:00)', 
    'E4DN (09:00-09:00)', 'E4D (09:00-21:00)', 'E4N (21:00-09:00)', 
    'E3DN (09:00-09:00)', 'E3D (09:00-21:00)', 'E3N (21:00-09:00)',
    'E1DN (08:00-08:00)', 'E1D (08:00-20:00)', 'E1N (20:00-08:00)', 
    'E2D (09:00-21:00)', 
    'E6DN (07:30-07:30)', 'E6D (07:30-19:30)', 'E6N (19:30-07:30)',
    'E7DN (11:00-23:00)', 'E7DN verano (12:00-00:00)',
    'GL (08:00-08:00)', 
    'CDJ (08:00-20:00)', 'CNJ (20:00-08:00)',
    'C2 (09:00-21:00)', 'C4T (10:00-22:00)', 
    'C3D (08:15-20:15)', 'C3N (20:15-08:15)'
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
  
  // Guardar UNA asignación individual en Supabase
  const saveOneAsignacion = async (scheduleKey, parentKey) => {
    try {
      // scheduleKey formato: "2024-12-09_child1_Mañana"
      const parts = scheduleKey.split('_');
      if (parts.length < 3) return;
      
      const fecha = parts[0];
      const childKey = parts[1];
      const periodo = parts.slice(2).join('_');
      
      // Obtener IDs de padre e hija
      const { data: padresData } = await supabase.from('padres').select('id, nombre');
      const { data: hijasData } = await supabase.from('hijas').select('id, nombre');
      
      const padresMap = {};
      const hijasMap = {};
      padresData?.forEach(p => { padresMap[p.nombre] = p.id; });
      hijasData?.forEach(h => { hijasMap[h.nombre] = h.id; });
      
      // Traducir parentKey a nombre del padre (incluyendo categorías especiales)
      let padreNombre;
      if (parentKey === 'parent1') {
        padreNombre = parents.parent1;
      } else if (parentKey === 'parent2') {
        padreNombre = parents.parent2;
      } else if (parentKey === 'other') {
        padreNombre = parents.other;
      } else if (parentKey?.includes('_decision_')) {
        // Categorías especiales de decisión
        if (parentKey.startsWith('parent1')) {
          padreNombre = 'Jose Luis por decisión niña u otro';
        } else {
          padreNombre = 'Irene por decisión niña u otro';
        }
      } else if (parentKey?.includes('_pago')) {
        // Categoría de pago
        padreNombre = 'Irene por pago';
      }
      
      const hijaNombre = children[childKey];
      
      if (!padreNombre || !hijaNombre) {
        console.log('saveOneAsignacion: Falta padre o hija', { parentKey, childKey, padreNombre });
        return;
      }
      
      const padreId = padresMap[padreNombre];
      const hijaId = hijasMap[hijaNombre];
      
      if (!padreId || !hijaId) {
        console.log('saveOneAsignacion: No se encontró ID', { padreNombre, hijaNombre, padreId, hijaId });
        return;
      }
      
      // Borrar la asignación existente para esta fecha/hija/periodo
      await supabase
        .from('asignaciones')
        .delete()
        .eq('fecha', fecha)
        .eq('hija_id', hijaId)
        .eq('periodo', periodo);
      
      // Si hay un padre asignado (no está vacío), insertar la nueva asignación
      if (parentKey) {
        const { error } = await supabase
          .from('asignaciones')
          .insert({ padre_id: padreId, hija_id: hijaId, fecha, periodo, observaciones: null });
        
        if (error) {
          console.error('Error guardando asignación:', error);
          setLastSaveStatus('error');
          return;
        }
      }
      
      console.log('Asignación guardada:', { fecha, childKey, periodo, parentKey, padreNombre });
      setLastSaveStatus('success');
      setTimeout(() => setLastSaveStatus(null), 2000);
      
    } catch (err) {
      console.error('Error en saveOneAsignacion:', err);
      setLastSaveStatus('error');
    }
  };
  
  // Guardar UN turno individual en Supabase (usando upsert para evitar duplicados)
  const saveOneTurno = async (fecha, quien, valor) => {
    try {
      console.log('saveOneTurno llamado:', { fecha, quien, valor });
      
      // Primero obtenemos el turno actual de esa fecha
      const { data: turnosExistentes, error: selectError } = await supabase
        .from('turnos')
        .select('*')
        .eq('fecha', fecha);
      
      if (selectError) {
        console.error('Error buscando turno existente:', selectError);
      }
      
      // Tomar el primer registro si hay duplicados
      const turnoExistente = turnosExistentes && turnosExistentes.length > 0 ? turnosExistentes[0] : null;
      
      let turnoData = {
        fecha,
        turno_padre: null,
        turno_madre: null
      };
      
      // Si existe, preservamos los valores actuales
      if (turnoExistente) {
        turnoData.turno_padre = turnoExistente.turno_padre;
        turnoData.turno_madre = turnoExistente.turno_madre;
      }
      
      // Actualizamos según quién sea
      if (quien === 'padre') {
        // Preservar actividad si existe
        const actividadActual = turnoData.turno_padre?.split('||')[1] || '';
        turnoData.turno_padre = valor + (actividadActual ? `||${actividadActual}` : '');
      } else if (quien === 'padre_actividad') {
        // Preservar turno si existe
        const turnoActual = turnoData.turno_padre?.split('||')[0] || '';
        turnoData.turno_padre = turnoActual + (valor ? `||${valor}` : '');
      } else if (quien === 'madre') {
        turnoData.turno_madre = valor || null;
      }
      
      // Borrar TODOS los registros de esa fecha (para limpiar duplicados)
      const { error: deleteError } = await supabase.from('turnos').delete().eq('fecha', fecha);
      if (deleteError) {
        console.error('Error borrando turnos antiguos:', deleteError);
      }
      
      // Solo insertar si hay algún dato
      if (turnoData.turno_padre || turnoData.turno_madre) {
        const { error: insertError } = await supabase.from('turnos').insert(turnoData);
        if (insertError) {
          console.error('Error guardando turno:', insertError);
          setLastSaveStatus('error');
          return;
        }
        console.log('Turno guardado correctamente:', turnoData);
      }
      
      setLastSaveStatus('success');
      setTimeout(() => setLastSaveStatus(null), 2000);
      
    } catch (err) {
      console.error('Error en saveOneTurno:', err);
      setLastSaveStatus('error');
    }
  };
  
  const handleScheduleChange = useCallback((key, value) => { 
    setSchedule(prev => ({ ...prev, [key]: value }));
    // Guardar automáticamente en Supabase
    if (currentUser === 'parent1') {
      saveOneAsignacion(key, value);
    }
  }, [currentUser, parents, children]);
  
  const handleTurnoChange = useCallback((fecha, quien, value) => { 
    setTurnos(prev => ({ ...prev, [`${fecha}_${quien}`]: value }));
    // Guardar automáticamente en Supabase
    if (currentUser === 'parent1') {
      saveOneTurno(fecha, quien, value);
    }
  }, [currentUser]);

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
    if (!actividad) return { tipo: '', entrada: '', salida: '', textoOtro: '' };
    const [tipo, entrada, salida, textoOtro] = actividad.split('|');
    return { tipo: tipo || '', entrada: entrada || '', salida: salida || '', textoOtro: textoOtro || '' };
  };

  // Construir string de actividad padre
  const buildActividadPadre = (tipo, entrada, salida, textoOtro = '') => {
    if (!tipo && !entrada && !salida && !textoOtro) return '';
    return `${tipo || ''}|${entrada || ''}|${salida || ''}|${textoOtro || ''}`;
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
      let allAsignaciones = [];
      let desde = 0;
      const limite = 1000;
      let hayMas = true;
      
      while (hayMas) {
        const { data: asignaciones, error } = await supabase
          .from('asignaciones')
          .select('id, padre_id, hija_id, fecha, periodo, observaciones')
          .range(desde, desde + limite - 1);
        
        if (error) {
          console.error('Error cargando asignaciones:', error);
          break;
        }
        
        if (asignaciones && asignaciones.length > 0) {
          allAsignaciones = [...allAsignaciones, ...asignaciones];
          desde += limite;
          hayMas = asignaciones.length === limite;
        } else {
          hayMas = false;
        }
      }
      
      const asignaciones = allAsignaciones;
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
          
          // Determinar parentKey incluyendo las categorías especiales
          let parentKey = null;
          if (parents.parent1 === padreNombre) parentKey = 'parent1';
          else if (parents.parent2 === padreNombre) parentKey = 'parent2';
          else if (parents.other === padreNombre) parentKey = 'other';
          // Categorías especiales
          else if (padreNombre === 'Irene por decisión niña u otro') {
            // Necesitamos saber qué hija es para asignar el parentKey correcto
            const childKeyTemp = children.child1 === hijaNombre ? 'child1' : 'child2';
            parentKey = `parent2_decision_${childKeyTemp}`;
          }
          else if (padreNombre === 'Jose Luis por decisión niña u otro') {
            const childKeyTemp = children.child1 === hijaNombre ? 'child1' : 'child2';
            parentKey = `parent1_decision_${childKeyTemp}`;
          }
          else if (padreNombre === 'Irene por pago') {
            const childKeyTemp = children.child1 === hijaNombre ? 'child1' : 'child2';
            parentKey = `parent2_pago_${childKeyTemp}`;
          }
          
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
      
      // Cargar turnos - con más logging para debug
      console.log('Intentando cargar turnos...');
      const { data: turnosData, error: turnosError } = await supabase.from('turnos').select('*');
      console.log('Respuesta turnos:', { turnosData, turnosError, count: turnosData?.length });
      
      if (turnosError) {
        console.error('Error cargando turnos:', turnosError);
      }
      
      // Cargar turnos aunque haya habido algún warning
      if (turnosData) {
        const newTurnos = {};
        turnosData.forEach(t => {
          // Solo cargar turnos del padre si el usuario actual es parent1
          if (t.turno_padre && currentUser === 'parent1') {
            // Separar turno y actividad si están unidos con "||" (solo primera ocurrencia)
            console.log('turno_padre raw para fecha', t.fecha, ':', t.turno_padre);
            const idx = t.turno_padre.indexOf('||');
            if (idx === -1) {
              // No hay ||, es solo turno
              newTurnos[`${t.fecha}_padre`] = t.turno_padre;
            } else {
              const turno = t.turno_padre.substring(0, idx);
              const actividad = t.turno_padre.substring(idx + 2);
              if (turno) newTurnos[`${t.fecha}_padre`] = turno;
              if (actividad) {
                console.log('Actividad encontrada:', actividad);
                newTurnos[`${t.fecha}_padre_actividad`] = actividad;
              }
            }
          }
          // Turnos de la madre: cargar para todos
          if (t.turno_madre) newTurnos[`${t.fecha}_madre`] = t.turno_madre;
        });
        console.log('Turnos procesados:', newTurnos);
        setTurnos(newTurnos);
        console.log('Turnos cargados:', Object.keys(newTurnos).length);
      } else {
        console.log('No hay datos de turnos o turnosData es null');
      }
    } catch (err) { console.error('Error inesperado al cargar:', err); }
  }, [parents, children, currentUser]);

  useEffect(() => {
    if (step === 'main' && parents.parent1 && children.child1) loadScheduleFromSupabase();
  }, [step, parents.parent1, children.child1, loadScheduleFromSupabase]);

  const saveScheduleInSupabase = async () => {
    // Ahora solo recarga los datos desde Supabase para verificar sincronización
    // (Las asignaciones ya se guardan automáticamente con saveOneAsignacion)
    setIsSaving(true);
    try {
      await loadScheduleFromSupabase();
      setIsSaving(false);
      setLastSaveStatus('success');
      setTimeout(() => setLastSaveStatus(null), 2000);
    } catch (err) { 
      console.error('Error al recargar:', err);
      setIsSaving(false);
      setLastSaveStatus('error');
    }
  };

  // Componente selector de actividad extra del padre (3 desplegables en 1 fila + campo texto para OTRO)
  const ActividadPadreSelector = ({ fecha }) => {
    const actividadActual = turnos[`${fecha}_padre_actividad`] || '';
    const parsed = parseActividadPadre(actividadActual);
    const [textoLocal, setTextoLocal] = useState('');
    const textoLocalRef = React.useRef(textoLocal);
    
    // Sincronizar ref con estado
    useEffect(() => {
      textoLocalRef.current = textoLocal;
    }, [textoLocal]);
    
    // Inicializar texto local cuando cambia la fecha o se carga de Supabase
    useEffect(() => {
      setTextoLocal(parsed.textoOtro || '');
    }, [fecha, actividadActual]);
    
    // Guardar con debounce de 800ms
    useEffect(() => {
      if (parsed.tipo !== 'OTRO') return;
      if (textoLocal === parsed.textoOtro) return;
      
      const timer = setTimeout(() => {
        const newActividad = buildActividadPadre(parsed.tipo, parsed.entrada, parsed.salida, textoLocalRef.current);
        console.log('Guardando actividad con texto:', textoLocalRef.current, 'newActividad:', newActividad);
        setTurnos(prev => ({ ...prev, [`${fecha}_padre_actividad`]: newActividad }));
        if (currentUser === 'parent1') {
          saveOneTurno(fecha, 'padre_actividad', newActividad);
        }
      }, 800);
      
      return () => clearTimeout(timer);
    }, [textoLocal]);

    const updateActividad = (field, value) => {
      // Cuando cambia el tipo, preservar textoLocal si es OTRO
      const textoParaGuardar = field === 'tipo' ? (value === 'OTRO' ? textoLocal : '') : textoLocal;
      const newActividad = buildActividadPadre(
        field === 'tipo' ? value : parsed.tipo,
        field === 'entrada' ? value : parsed.entrada,
        field === 'salida' ? value : parsed.salida,
        textoParaGuardar
      );
      console.log('updateActividad:', field, value, 'newActividad:', newActividad);
      setTurnos(prev => ({ ...prev, [`${fecha}_padre_actividad`]: newActividad }));
      if (currentUser === 'parent1') {
        saveOneTurno(fecha, 'padre_actividad', newActividad);
      }
    };

    const selectStyle = "w-full text-[9px] p-0.5 border rounded";
    const hasActividad = parsed.tipo || parsed.entrada || parsed.salida || textoLocal;

    return (
      <div className="flex flex-col gap-0.5 p-0.5 rounded mt-0.5" style={{ backgroundColor: hasActividad ? colors.parent1 + '20' : 'white' }}>
        <div className="flex gap-0.5">
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
        {parsed.tipo === 'OTRO' && (
          <input 
            type="text" 
            value={textoLocal} 
            onChange={e => setTextoLocal(e.target.value)}
            placeholder="Escribe la actividad..."
            className="w-full text-[9px] p-1 border rounded"
          />
        )}
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
      // GUARDAR EN SUPABASE
      if (currentUser === 'parent1') {
        saveOneTurno(fecha, 'madre', newTurno);
      }
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
              <div className="flex items-center gap-1 mb-1">
                <button onClick={saveScheduleInSupabase} 
                  disabled={isSaving}
                  className={`px-3 py-1 text-xs rounded font-bold ${isSaving ? 'bg-gray-400' : 'bg-green-600'} text-white`}>
                  {isSaving ? 'Cargando...' : '↻ Recargar'}
                </button>
                {lastSaveStatus === 'success' && (
                  <span className="text-green-600 text-xs">✓</span>
                )}
                {lastSaveStatus === 'error' && (
                  <span className="text-red-600 text-xs">✗</span>
                )}
              </div>
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
              {/* Turno del padre - SOLO visible para parent1 */}
              {currentUser === 'parent1' && (
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
              )}
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
                        style={{ 
                          backgroundColor: scheduleValue ? (
                            scheduleValue.includes('_decision_') ? '#000000' :
                            scheduleValue.includes('_pago') ? '#dc2626' :
                            colors[scheduleValue] + '40'
                          ) : 'white',
                          color: (scheduleValue?.includes('_decision_') || scheduleValue?.includes('_pago')) ? 'white' : 'inherit'
                        }}>
                        <option value="">-</option>
                        <option value="parent1">{parents.parent1 || 'Papá'}</option>
                        <option value="parent2">{parents.parent2 || 'Mamá'}</option>
                        {parents.other && <option value="other">{parents.other}</option>}
                        {child === 'child1' && (
                          <>
                            <option value="parent2_decision_child1">Irene por decisión niña u otro</option>
                            <option value="parent1_decision_child1">Jose Luis por decisión niña u otro</option>
                            <option value="parent2_pago_child1">Irene por pago</option>
                          </>
                        )}
                        {child === 'child2' && (
                          <>
                            <option value="parent2_decision_child2">Irene por decisión niña u otro</option>
                            <option value="parent1_decision_child2">Jose Luis por decisión niña u otro</option>
                            <option value="parent2_pago_child2">Irene por pago</option>
                          </>
                        )}
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
              {/* Fila turno padre - SOLO visible para parent1 */}
              {currentUser === 'parent1' && (
                <>
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
                </>
              )}
              {/* Fila actividad padre - SOLO visible para parent1 */}
              {currentUser === 'parent1' && (
                <>
                  <div className="font-bold text-[6px] flex items-center" style={{ color: '#9333ea' }}>Actividad</div>
                  {weekDates.map((d) => {
                    const turnoKey = getTurnoKey(d);
                    const actividad = turnos[`${turnoKey}_padre_actividad`] || '';
                    const parsed = parseActividadPadre(actividad);
                    const tieneActividad = parsed.tipo || parsed.entrada || parsed.salida;
                    // Abreviar el tipo de actividad
                    const tipoCorto = parsed.tipo ? (
                      parsed.tipo === 'CLASE MÁSTER' ? 'MÁSTER' : 
                      parsed.tipo === 'CURSO' ? 'CURSO' : 
                      parsed.tipo === 'F.O.' ? 'F.O.' : 
                      parsed.tipo === 'VIAJE' ? 'VIAJE' : 
                      parsed.tipo === 'OTRO' ? (parsed.textoOtro || 'OTRO') : parsed.tipo
                    ) : '';
                    return (
                      <div key={`act_${formatDate(d)}`} className="text-center rounded p-0.5" style={{ backgroundColor: tieneActividad ? '#9333ea30' : '#f3f4f6', color: '#9333ea' }}>
                        {tieneActividad ? (
                          <>
                            <div className="text-[6px] font-bold">{tipoCorto}</div>
                            {(parsed.entrada || parsed.salida) && <div className="text-[5px]">{parsed.entrada || '?'}-{parsed.salida || '?'}</div>}
                          </>
                        ) : (
                          <div className="text-[6px]">-</div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
              {/* Fila turno madre - visible para ambos */}
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
                      // Verificar si es una asignación especial
                      const isDecision = assigned?.includes('_decision_');
                      const isPago = assigned?.includes('_pago');
                      const baseParent = assigned?.split('_')[0];
                      const isWithThisParent = assigned === currentUser || (baseParent === currentUser);
                      const displayName = isWithThisParent ? (children[child] || (child === 'child1' ? 'H1' : 'H2')) : '-';
                      
                      // Determinar colores
                      let bgColor = '#e5e7eb';
                      let txtColor = '#999';
                      if (isWithThisParent) {
                        if (isDecision) {
                          bgColor = '#000000';
                          txtColor = '#ffffff';
                        } else if (isPago) {
                          bgColor = '#dc2626';
                          txtColor = '#ffffff';
                        } else {
                          bgColor = colors[child];
                          txtColor = '#000';
                        }
                      }
                      
                      return (
                        <div key={sk} onClick={() => obs && setPopupObs(obs)}
                          className="text-[8px] text-center rounded px-0.5 cursor-pointer font-bold w-full"
                          style={{ backgroundColor: bgColor, color: txtColor }}>
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
          
          {/* Fila actividad padre (CURSO, MÁSTER, F.O., VIAJE) */}
          <div className="font-bold text-[6px] flex items-center" style={{ color: '#9333ea' }}>Actividad</div>
          {weekDates.map((d) => {
            const turnoKey = getTurnoKey(d);
            const actividad = turnos[`${turnoKey}_padre_actividad`] || '';
            const parsed = parseActividadPadre(actividad);
            const tieneActividad = parsed.tipo || parsed.entrada || parsed.salida;
            const tipoCorto = parsed.tipo ? (
              parsed.tipo === 'CLASE MÁSTER' ? 'MÁSTER' : 
              parsed.tipo === 'CURSO' ? 'CURSO' : 
              parsed.tipo === 'F.O.' ? 'F.O.' : 
              parsed.tipo === 'VIAJE' ? 'VIAJE' : 
              parsed.tipo === 'OTRO' ? (parsed.textoOtro || 'OTRO') : parsed.tipo
            ) : '';
            return (
              <div key={`act_m_${formatDate(d)}`} className="text-center rounded p-0.5" style={{ backgroundColor: tieneActividad ? '#9333ea30' : '#f3f4f6', color: '#9333ea' }}>
                {tieneActividad ? (
                  <>
                    <div className="text-[6px] font-bold">{tipoCorto}</div>
                    {(parsed.entrada || parsed.salida) && <div className="text-[5px]">{parsed.entrada || '?'}-{parsed.salida || '?'}</div>}
                  </>
                ) : (
                  <div className="text-[6px]">-</div>
                )}
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
    const isChildUser = currentUser === 'child1' || currentUser === 'child2';
    const childName = isChildUser ? (children[currentUser] || 'Hijo').toUpperCase() : '';
    const childColor = isChildUser ? colors[currentUser] : '';
    const dayLetters = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    // Colores estilo calendario anual
    const getColorForAssigned = (assigned) => {
      if (assigned === 'parent1') return 'rgba(59, 130, 246, 0.5)';
      if (assigned === 'parent2') return '#FBBF24';
      if (assigned === 'other') return '#f472b6';
      return '#e5e7eb';
    };
    
    const getColorWithSpecial = (assigned) => {
      if (!assigned) return '#f3f4f6';
      if (assigned.includes('_decision_')) return '#000000';
      if (assigned.includes('_pago')) return '#dc2626';
      return getColorForAssigned(assigned);
    };

    // Obtener código corto del turno del padre
    const getTurnoCorto = (turnoStr) => {
      if (!turnoStr) return '';
      return turnoStr.split(' ')[0].split('(')[0];
    };

    // Obtener actividad del padre
    const getActividadInfo = (actividadStr) => {
      if (!actividadStr) return null;
      const parsed = parseActividadPadre(actividadStr);
      if (!parsed.tipo) return null;
      let tipoCorto = '';
      if (parsed.tipo === 'CLASE MÁSTER') tipoCorto = 'MÁS';
      else if (parsed.tipo === 'CURSO') tipoCorto = 'CUR';
      else if (parsed.tipo === 'F.O.') tipoCorto = 'FO';
      else if (parsed.tipo === 'VIAJE') tipoCorto = 'VIA';
      else if (parsed.tipo === 'OTRO') tipoCorto = parsed.textoOtro || 'OTR';
      else tipoCorto = parsed.tipo.substring(0, 3);
      return { tipo: tipoCorto, entrada: parsed.entrada || '', salida: parsed.salida || '', esTextoPersonalizado: parsed.tipo === 'OTRO' && parsed.textoOtro };
    };

    // Generar semanas continuas de todo el año actual
    const generateYearWeeks = () => {
      const weeks = [];
      const currentYear = currentDate.getFullYear();
      
      // Empezar desde el primer lunes que incluya el 1 de enero
      const firstOfYear = new Date(currentYear, 0, 1);
      const firstDayOfWeek = firstOfYear.getDay();
      const startMonday = new Date(firstOfYear);
      startMonday.setDate(firstOfYear.getDate() - (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1));
      
      // Terminar en el último día de diciembre
      const endDate = new Date(currentYear, 11, 31);
      
      let currentMonday = new Date(startMonday);
      
      while (currentMonday <= endDate) {
        const week = [];
        for (let d = 0; d < 7; d++) {
          const date = new Date(currentMonday);
          date.setDate(currentMonday.getDate() + d);
          week.push(date);
        }
        weeks.push(week);
        currentMonday.setDate(currentMonday.getDate() + 7);
      }
      
      return weeks;
    };

    const weeks = generateYearWeeks();

    // Obtener etiqueta del mes
    const getMonthLabel = (date) => {
      return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    };

    // Renderizar un día para hijos
    const renderDayChild = (date) => {
      const today = isToday(date);
      const redDay = isRedDay(date);
      const dateKey = formatDate(date);
      
      const ck_m = getScheduleKey(date, currentUser, 'Mañana');
      const ck_t = getScheduleKey(date, currentUser, 'Tarde');
      const ck_n = getScheduleKey(date, currentUser, 'Noche');
      
      return (
        <div key={dateKey} 
          className="rounded flex flex-col overflow-hidden cursor-pointer"
          onClick={() => { setCurrentDate(date); setCurrentView('daily'); }}
          style={{ 
            border: today ? '2px solid black' : '1px solid #e5e7eb',
            minHeight: 55
          }}>
          <div className="text-[9px] text-center font-bold bg-white"
            style={{ color: redDay ? '#dc2626' : '#666' }}>
            {date.getDate()}
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex-1" style={{ backgroundColor: getColorWithSpecial(schedule[ck_m]) }} />
            <div className="flex-1" style={{ backgroundColor: getColorWithSpecial(schedule[ck_t]) }} />
            <div className="flex-1" style={{ backgroundColor: getColorWithSpecial(schedule[ck_n]) }} />
          </div>
        </div>
      );
    };

    // Renderizar un día para padres
    const renderDayParent = (date) => {
      const today = isToday(date);
      const redDay = isRedDay(date);
      const dateKey = formatDate(date);
      
      const mKeyD = getScheduleKey(date, 'child1', 'Mañana');
      const tKeyD = getScheduleKey(date, 'child1', 'Tarde');
      const nKeyD = getScheduleKey(date, 'child1', 'Noche');
      const mKeyE = getScheduleKey(date, 'child2', 'Mañana');
      const tKeyE = getScheduleKey(date, 'child2', 'Tarde');
      const nKeyE = getScheduleKey(date, 'child2', 'Noche');
      
      const mAssignedD = schedule[mKeyD];
      const tAssignedD = schedule[tKeyD];
      const nAssignedD = schedule[nKeyD];
      const mAssignedE = schedule[mKeyE];
      const tAssignedE = schedule[tKeyE];
      const nAssignedE = schedule[nKeyE];
      
      const turnoKey = getTurnoKey(date);
      const turnoPadre = turnos[`${turnoKey}_padre`] || '';
      const actividadPadre = turnos[`${turnoKey}_padre_actividad`] || '';
      const turnoCorto = getTurnoCorto(turnoPadre);
      const actividadInfo = getActividadInfo(actividadPadre);
      
      return (
        <div key={dateKey} 
          className="rounded flex flex-col overflow-hidden cursor-pointer"
          onClick={() => { setCurrentDate(date); setCurrentView('daily'); }}
          style={{ 
            border: today ? '2px solid black' : '1px solid #e5e7eb',
            minHeight: 55
          }}>
          {/* Número del día */}
          <div className="text-[9px] text-center font-bold bg-white"
            style={{ color: redDay ? '#dc2626' : '#666' }}>
            {date.getDate()}
          </div>
          
          {/* 6 rectángulos: 3 filas x 2 columnas */}
          <div className="flex-1 flex flex-col">
            {/* Fila Mañana - con turno superpuesto en parte superior */}
            <div className="flex-1 flex relative">
              <div className="flex-1" style={{ backgroundColor: getColorWithSpecial(mAssignedD) }} />
              <div className="flex-1" style={{ backgroundColor: getColorWithSpecial(mAssignedE) }} />
              {/* Turno en franja mañana - ajustado a las letras */}
              {turnoCorto && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-black bg-white px-1 rounded leading-tight">{turnoCorto}</span>
                </div>
              )}
              {/* Si solo hay actividad (sin turno), mostrarla aquí */}
              {actividadInfo && !turnoCorto && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {actividadInfo.esTextoPersonalizado ? (
                    <span className="text-[5px] font-bold leading-tight" style={{ color: '#9333ea' }}>{actividadInfo.tipo}</span>
                  ) : (
                    <span className="text-[8px] font-bold bg-white px-1 rounded leading-tight" style={{ color: '#9333ea' }}>{actividadInfo.tipo}</span>
                  )}
                </div>
              )}
            </div>
            {/* Fila Tarde - con actividad superpuesta si hay turno */}
            <div className="flex-1 flex relative">
              <div className="flex-1" style={{ backgroundColor: getColorWithSpecial(tAssignedD) }} />
              <div className="flex-1" style={{ backgroundColor: getColorWithSpecial(tAssignedE) }} />
              {/* Actividad debajo del turno */}
              {actividadInfo && turnoCorto && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {actividadInfo.esTextoPersonalizado ? (
                    <span className="text-[5px] font-bold leading-tight" style={{ color: '#9333ea' }}>{actividadInfo.tipo}</span>
                  ) : (
                    <span className="text-[7px] font-bold bg-white px-1 rounded leading-tight" style={{ color: '#9333ea' }}>{actividadInfo.tipo}</span>
                  )}
                </div>
              )}
            </div>
            {/* Fila Noche */}
            <div className="flex-1 flex">
              <div className="flex-1" style={{ backgroundColor: getColorWithSpecial(nAssignedD) }} />
              <div className="flex-1" style={{ backgroundColor: getColorWithSpecial(nAssignedE) }} />
            </div>
          </div>
        </div>
      );
    };

    // Vista para hijos
    if (isChildUser) {
      return (
        <div className="h-full flex flex-col overflow-hidden">
          {/* Cabecera fija - solo días de la semana */}
          <div className="px-1 py-2 bg-white border-b">
            <div className="grid grid-cols-7 gap-0.5">
              {dayLetters.map((d, i) => (
                <div key={d} className="text-[10px] font-bold flex items-center justify-center"
                  style={{ color: i >= 5 ? '#dc2626' : '#888' }}>{d}</div>
              ))}
            </div>
          </div>
          
          {/* Calendario scrollable - todo el año */}
          <div className="flex-1 overflow-y-auto p-1">
            {weeks.map((week, weekIdx) => {
              const firstDayOfWeek = week[0];
              const showMonthHeader = firstDayOfWeek.getDate() <= 7;
              const monthLabel = showMonthHeader ? getMonthLabel(firstDayOfWeek) : null;
              
              return (
                <div key={weekIdx}>
                  {monthLabel && (
                    <div className="text-center text-xs font-bold text-gray-600 py-1 bg-gray-100 rounded my-1">
                      {capitalize(monthLabel)}
                    </div>
                  )}
                  <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                    {week.map(date => renderDayChild(date))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Vista para padres - calendario continuo todo el año
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Cabecera fija - solo días de la semana */}
        <div className="px-1 py-2 bg-white border-b">
          <div className="grid grid-cols-7 gap-0.5">
            {dayLetters.map((d, i) => (
              <div key={d} className="text-[10px] font-bold flex items-center justify-center"
                style={{ color: i >= 5 ? '#dc2626' : '#888' }}>{d}</div>
            ))}
          </div>
        </div>
        
        {/* Calendario scrollable continuo - todo el año */}
        <div className="flex-1 overflow-y-auto p-1">
          {weeks.map((week, weekIdx) => {
            const firstDayOfWeek = week[0];
            const showMonthHeader = firstDayOfWeek.getDate() <= 7;
            const monthLabel = showMonthHeader ? getMonthLabel(firstDayOfWeek) : null;
            
            return (
              <div key={weekIdx}>
                {monthLabel && (
                  <div className="text-center text-xs font-bold text-gray-600 py-1 bg-gray-100 rounded my-1">
                    {capitalize(monthLabel)}
                  </div>
                )}
                <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                  {week.map(date => renderDayParent(date))}
                </div>
              </div>
            );
          })}
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

    // Obtener lista de meses y años disponibles desde el schedule
    const getPeriodosDisponibles = () => {
      const meses = new Set();
      const anos = new Set();
      Object.keys(schedule).forEach(key => {
        const fecha = key.split('_')[0];
        if (fecha && fecha.length >= 7) {
          const mesAno = fecha.substring(0, 7); // "2025-01"
          const ano = fecha.substring(0, 4); // "2025"
          meses.add(mesAno);
          anos.add(ano);
        }
      });
      return {
        meses: Array.from(meses).sort(),
        anos: Array.from(anos).sort()
      };
    };

    const periodosDisponibles = getPeriodosDisponibles();

    // Formatear periodo para mostrar
    const formatearPeriodo = (periodo) => {
      if (periodo === 'global') return 'Global';
      if (periodo.startsWith('year-')) {
        return `Año ${periodo.replace('year-', '')}`;
      }
      const [ano, mes] = periodo.split('-');
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `${meses[parseInt(mes) - 1]} ${ano}`;
    };

    // Calcular estadísticas desde el schedule, filtrando por periodo (mes o año)
    const calcularEstadisticas = (periodo) => {
      const stats = {
        parent1: { child1: { total: 0, LV: 0, SD: 0 }, child2: { total: 0, LV: 0, SD: 0 }, ambas: { total: 0, LV: 0, SD: 0 } },
        parent2: { child1: { total: 0, LV: 0, SD: 0 }, child2: { total: 0, LV: 0, SD: 0 }, ambas: { total: 0, LV: 0, SD: 0 } },
        other: { child1: { total: 0, LV: 0, SD: 0 }, child2: { total: 0, LV: 0, SD: 0 }, ambas: { total: 0, LV: 0, SD: 0 } },
        // Nuevas categorías especiales
        parent1_decision: { child1: { total: 0, LV: 0, SD: 0 }, child2: { total: 0, LV: 0, SD: 0 }, ambas: { total: 0, LV: 0, SD: 0 } },
        parent2_decision: { child1: { total: 0, LV: 0, SD: 0 }, child2: { total: 0, LV: 0, SD: 0 }, ambas: { total: 0, LV: 0, SD: 0 } },
        parent2_pago: { child1: { total: 0, LV: 0, SD: 0 }, child2: { total: 0, LV: 0, SD: 0 }, ambas: { total: 0, LV: 0, SD: 0 } }
      };

      Object.entries(schedule).forEach(([key, assignedValue]) => {
        if (!assignedValue) return;
        
        // key formato: "2024-12-09_child1_Mañana"
        const parts = key.split('_');
        if (parts.length < 3) return;
        
        const fecha = parts[0];
        const childKey = parts[1];

        // Filtrar por periodo si no es global
        if (periodo !== 'global') {
          if (periodo.startsWith('year-')) {
            // Filtrar por año
            const yearFilter = periodo.replace('year-', '');
            if (fecha.substring(0, 4) !== yearFilter) return;
          } else {
            // Filtrar por mes
            if (fecha.substring(0, 7) !== periodo) return;
          }
        }
        
        // Obtener día de la semana (0=domingo, 6=sábado)
        const date = new Date(fecha);
        const dayOfWeek = date.getDay();
        const esFinDeSemana = dayOfWeek === 0 || dayOfWeek === 6; // Domingo o Sábado
        
        // Determinar la categoría de estadísticas
        let statsKey = assignedValue;
        
        // Verificar si es una asignación especial
        if (assignedValue.includes('_decision_')) {
          statsKey = assignedValue.startsWith('parent1') ? 'parent1_decision' : 'parent2_decision';
        } else if (assignedValue.includes('_pago')) {
          statsKey = 'parent2_pago';
        }
        
        if (stats[statsKey] && stats[statsKey][childKey]) {
          stats[statsKey][childKey].total++;
          stats[statsKey].ambas.total++;
          
          if (esFinDeSemana) {
            stats[statsKey][childKey].SD++;
            stats[statsKey].ambas.SD++;
          } else {
            stats[statsKey][childKey].LV++;
            stats[statsKey].ambas.LV++;
          }
        }
      });

      return stats;
    };

    // Selector de periodo (años y meses)
    const SelectorPeriodo = ({ valor, onChange }) => (
      <select value={valor} onChange={e => onChange(e.target.value)}
        className="text-[10px] p-0.5 border rounded bg-white ml-2">
        <option value="global">Global</option>
        {periodosDisponibles.anos.length > 0 && (
          <optgroup label="Por año">
            {periodosDisponibles.anos.map(ano => (
              <option key={`year-${ano}`} value={`year-${ano}`}>Año {ano}</option>
            ))}
          </optgroup>
        )}
        {periodosDisponibles.meses.length > 0 && (
          <optgroup label="Por mes">
            {periodosDisponibles.meses.map(mes => (
              <option key={mes} value={mes}>{formatearPeriodo(mes)}</option>
            ))}
          </optgroup>
        )}
      </select>
    );

    // Calcular horas de un turno dado el código
    const calcularHorasTurnoPadre = (turnoStr) => {
      if (!turnoStr) return 0;
      
      // Extraer solo el código del turno (sin horario entre paréntesis)
      const codigo = turnoStr.split(' ')[0].split('(')[0].toUpperCase();
      
      // Mapa de horas por código de turno
      const horasPorTurno = {
        // E5, E4, E3 tienen los mismos horarios
        'E5D': 12, 'E5N': 12, 'E5DN': 24,
        'E4D': 12, 'E4N': 12, 'E4DN': 24,
        'E3D': 12, 'E3N': 12, 'E3DN': 24,
        // E1
        'E1D': 12, 'E1N': 12, 'E1DN': 24,
        // E2
        'E2D': 12,
        // E7
        'E7DN': 12, // 11:00 a 23:00 o 12:00 a 00:00
        // E6
        'E6D': 12, 'E6N': 12, 'E6DN': 24,
        // C turnos
        'CDJ': 12, 'CNJ': 12,
        'C2': 12,
        'C4T': 12,
        'C3D': 12, 'C3N': 12,
        // GL (guardia localizada, 24h)
        'GL': 24
      };
      
      return horasPorTurno[codigo] || 0;
    };

    // Calcular horas de turno de la madre desde el string guardado
    const calcularHorasTurnoMadre = (turnoStr) => {
      if (!turnoStr) return 0;
      
      let totalHoras = 0;
      const turnos = turnoStr.split(';').filter(t => t);
      
      turnos.forEach(t => {
        const [tipo, entrada, salida] = t.split('|');
        if (entrada && salida) {
          const [hEntrada, mEntrada] = entrada.split(':').map(Number);
          const [hSalida, mSalida] = salida.split(':').map(Number);
          
          let minEntrada = hEntrada * 60 + mEntrada;
          let minSalida = hSalida * 60 + mSalida;
          
          // Si la salida es menor que la entrada, es turno de noche (cruza medianoche)
          if (minSalida <= minEntrada) {
            minSalida += 24 * 60;
          }
          
          totalHoras += (minSalida - minEntrada) / 60;
        }
      });
      
      return totalHoras;
    };

    // Calcular total de horas trabajadas por cada progenitor en un mes
    const calcularHorasTrabajadas = (periodo) => {
      let horasPadre = 0;
      let horasMadre = 0;
      
      Object.entries(turnos).forEach(([key, valor]) => {
        if (!valor) return;
        
        const parts = key.split('_');
        const fecha = parts[0];
        const quien = parts.slice(1).join('_');
        
        // Filtrar por periodo si no es global
        if (periodo !== 'global') {
          if (periodo.startsWith('year-')) {
            const yearFilter = periodo.replace('year-', '');
            if (fecha.substring(0, 4) !== yearFilter) return;
          } else {
            if (fecha.substring(0, 7) !== periodo) return;
          }
        }
        
        if (quien === 'padre') {
          horasPadre += calcularHorasTurnoPadre(valor);
        } else if (quien === 'madre') {
          horasMadre += calcularHorasTurnoMadre(valor);
        }
        // Nota: 'padre_actividad' no cuenta como horas de trabajo
      });
      
      return { horasPadre, horasMadre };
    };
    
    // Componente de tabla para cada cuidador
    const TablaCuidador = ({ parentKey, nombre, color, mesSeleccionado, setMesSeleccionado }) => {
      const stats = calcularEstadisticas(mesSeleccionado);
      const data = stats[parentKey];
      
      // No mostrar tabla si no hay datos (para las categorías especiales)
      if (!data || data.ambas.total === 0) return null;
      
      const child1Name = children.child1 || 'Hija 1';
      const child2Name = children.child2 || 'Hija 2';
      
      // Determinar si el color de texto debe ser especial
      const textColor = color === '#86efac' ? '#065f46' : (color === '#000000' ? '#000000' : color);
      const bgColor = color === '#000000' ? '#00000020' : (color === '#dc2626' ? '#dc262620' : color + '40');
      
      return (
        <div className="mb-4">
          <div className="font-bold text-sm mb-2 p-2 rounded flex items-center justify-between" style={{ backgroundColor: bgColor, color: textColor }}>
            <span>{nombre}</span>
            <SelectorPeriodo valor={mesSeleccionado} onChange={setMesSeleccionado} />
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
      // Nuevas categorías
      const totalParent1Decision = stats.parent1_decision.ambas.total;
      const totalParent2Decision = stats.parent2_decision.ambas.total;
      const totalParent2Pago = stats.parent2_pago.ambas.total;
      
      const granTotal = totalParent1 + totalParent2 + totalOther + totalParent1Decision + totalParent2Decision + totalParent2Pago;
      
      const pctParent1 = granTotal > 0 ? ((totalParent1 / granTotal) * 100).toFixed(1) : 0;
      const pctParent2 = granTotal > 0 ? ((totalParent2 / granTotal) * 100).toFixed(1) : 0;
      const pctOther = granTotal > 0 ? ((totalOther / granTotal) * 100).toFixed(1) : 0;
      const pctParent1Decision = granTotal > 0 ? ((totalParent1Decision / granTotal) * 100).toFixed(1) : 0;
      const pctParent2Decision = granTotal > 0 ? ((totalParent2Decision / granTotal) * 100).toFixed(1) : 0;
      const pctParent2Pago = granTotal > 0 ? ((totalParent2Pago / granTotal) * 100).toFixed(1) : 0;

      // Calcular horas trabajadas
      const { horasPadre, horasMadre } = calcularHorasTrabajadas(mesSeleccionadoResumen);

      return (
        <div className="mb-4 p-2 bg-gray-50 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">📊 Resumen</span>
            <SelectorPeriodo valor={mesSeleccionadoResumen} onChange={setMesSeleccionadoResumen} />
          </div>
          <div className="space-y-2">
            {/* Barra de progreso padre */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: colors.parent1 }}>
                  {parents.parent1} <span className="font-bold">({horasPadre}h)</span>
                </span>
                <span className="font-bold">{totalParent1} franjas ({pctParent1}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-3">
                <div className="h-3 rounded" style={{ width: `${pctParent1}%`, backgroundColor: colors.parent1 }}></div>
              </div>
            </div>
            {/* Barra de progreso madre */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: '#065f46' }}>
                  {parents.parent2} <span className="font-bold">({horasMadre}h)</span>
                </span>
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
            {/* Barra Jose Luis por decisión */}
            {totalParent1Decision > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: '#000000' }}>{parents.parent1} por decisión</span>
                  <span className="font-bold">{totalParent1Decision} franjas ({pctParent1Decision}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded h-3">
                  <div className="h-3 rounded" style={{ width: `${pctParent1Decision}%`, backgroundColor: '#000000' }}></div>
                </div>
              </div>
            )}
            {/* Barra Irene por decisión */}
            {totalParent2Decision > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: '#000000' }}>{parents.parent2} por decisión</span>
                  <span className="font-bold">{totalParent2Decision} franjas ({pctParent2Decision}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded h-3">
                  <div className="h-3 rounded" style={{ width: `${pctParent2Decision}%`, backgroundColor: '#000000' }}></div>
                </div>
              </div>
            )}
            {/* Barra Irene por pago */}
            {totalParent2Pago > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: '#dc2626' }}>{parents.parent2} por pago</span>
                  <span className="font-bold">{totalParent2Pago} franjas ({pctParent2Pago}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded h-3">
                  <div className="h-3 rounded" style={{ width: `${pctParent2Pago}%`, backgroundColor: '#dc2626' }}></div>
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
        
        {/* Tabla Jose Luis por decisión */}
        <TablaCuidador 
          parentKey="parent1_decision" 
          nombre={`${parents.parent1 || 'Padre'} por decisión niña u otro`} 
          color="#000000"
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
        
        {/* Tabla Irene por decisión */}
        <TablaCuidador 
          parentKey="parent2_decision" 
          nombre={`${parents.parent2 || 'Madre'} por decisión niña u otro`} 
          color="#000000"
          mesSeleccionado={mesSeleccionadoMadre}
          setMesSeleccionado={setMesSeleccionadoMadre}
        />
        
        {/* Tabla Irene por pago */}
        <TablaCuidador 
          parentKey="parent2_pago" 
          nombre={`${parents.parent2 || 'Madre'} por pago`} 
          color="#dc2626"
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

  // Vista de asignación semanal de custodia
  const WeekAssignView = () => {
    const [assigningStatus, setAssigningStatus] = useState(null); // 'success', 'error', null
    
    // Usar el estado externo para el offset de semanas
    const weekOffset = weekAssignOffset;
    const setWeekOffset = setWeekAssignOffset;
    
    // Obtener la semana actual basada en el offset
    const getCurrentWeek = () => {
      const today = new Date();
      
      // Calcular el lunes de la semana actual
      const currentMonday = new Date(today);
      const dayOfWeek = currentMonday.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      currentMonday.setDate(currentMonday.getDate() + diff);
      
      // Aplicar el offset de semanas
      const weekStart = new Date(currentMonday);
      weekStart.setDate(currentMonday.getDate() + (weekOffset * 7));
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      return {
        start: weekStart,
        end: weekEnd,
        weekNum: getWeekNumber(weekStart)
      };
    };
    
    const week = getCurrentWeek();
    
    // Formatear fecha corta
    const formatShortDate = (date) => {
      return `${date.getDate()}/${date.getMonth() + 1}`;
    };
    
    // Formatear fecha con nombre del mes
    const formatLongDate = (date) => {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };
    
    // Navegación entre semanas
    const goToPreviousWeek = () => setWeekOffset(prev => prev - 1);
    const goToNextWeek = () => setWeekOffset(prev => prev + 1);
    const goToCurrentWeek = () => setWeekOffset(0);
    
    // Asignar semana completa a un progenitor con la lógica especial del lunes
    const assignWeekToParent = async (weekStart, parentKey) => {
      const newSchedule = { ...schedule };
      const weekDates = [];
      
      // Generar los 7 días de la semana (lunes a domingo)
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        weekDates.push(d);
      }
      
      // El lunes siguiente (para asignar la mañana)
      const nextMonday = new Date(weekStart);
      nextMonday.setDate(weekStart.getDate() + 7);
      
      // Determinar el otro progenitor (para la mañana del lunes de inicio)
      const otherParent = parentKey === 'parent1' ? 'parent2' : 'parent1';
      
      // Asignar para ambas hijas
      ['child1', 'child2'].forEach(childKey => {
        weekDates.forEach((date, dayIndex) => {
          const dateStr = formatDate(date);
          
          if (dayIndex === 0) {
            // LUNES de inicio de la semana
            // Mañana: al OTRO progenitor (el que tenía la semana anterior deja en el cole)
            const keyManana = `${dateStr}_${childKey}_Mañana`;
            newSchedule[keyManana] = otherParent;
            
            // Tarde y Noche: al progenitor de esta semana
            const keyTarde = `${dateStr}_${childKey}_Tarde`;
            const keyNoche = `${dateStr}_${childKey}_Noche`;
            newSchedule[keyTarde] = parentKey;
            newSchedule[keyNoche] = parentKey;
          } else {
            // MARTES a DOMINGO: todo al progenitor de esta semana
            periods.forEach(period => {
              const key = `${dateStr}_${childKey}_${period}`;
              newSchedule[key] = parentKey;
            });
          }
        });
        
        // LUNES SIGUIENTE por la mañana: al progenitor de esta semana (deja en el cole)
        const nextMondayStr = formatDate(nextMonday);
        const keyNextMondayManana = `${nextMondayStr}_${childKey}_Mañana`;
        newSchedule[keyNextMondayManana] = parentKey;
      });
      
      // Actualizar estado local
      setSchedule(newSchedule);
      
      // Guardar en Supabase cada asignación
      setAssigningStatus('saving');
      try {
        const { data: padresData } = await supabase.from('padres').select('id, nombre');
        const { data: hijasData } = await supabase.from('hijas').select('id, nombre');
        
        const padresMap = {};
        const hijasMap = {};
        padresData?.forEach(p => { padresMap[p.nombre] = p.id; });
        hijasData?.forEach(h => { hijasMap[h.nombre] = h.id; });
        
        // Debug: mostrar mapas
        console.log('padresMap:', padresMap);
        console.log('hijasMap:', hijasMap);
        console.log('parents:', parents);
        console.log('parentKey:', parentKey);
        console.log('otherParent:', otherParent);
        console.log('Buscando padre:', parents[parentKey], '-> ID:', padresMap[parents[parentKey]]);
        console.log('Buscando otro padre:', parents[otherParent], '-> ID:', padresMap[parents[otherParent]]);
        
        // Preparar todas las asignaciones a guardar usando un Map para evitar duplicados
        const toSaveMap = new Map();
        
        ['child1', 'child2'].forEach(childKey => {
          const hijaNombre = children[childKey];
          const hijaId = hijasMap[hijaNombre];
          if (!hijaId) return;
          
          weekDates.forEach((date, dayIndex) => {
            const dateStr = formatDate(date);
            
            if (dayIndex === 0) {
              // Lunes: mañana al otro, tarde/noche al actual
              const padreOtroId = padresMap[parents[otherParent]];
              const padreActualId = padresMap[parents[parentKey]];
              
              if (padreOtroId) {
                const key = `${dateStr}_${hijaId}_Mañana`;
                toSaveMap.set(key, { padre_id: padreOtroId, hija_id: hijaId, fecha: dateStr, periodo: 'Mañana', observaciones: null });
              }
              if (padreActualId) {
                const keyT = `${dateStr}_${hijaId}_Tarde`;
                const keyN = `${dateStr}_${hijaId}_Noche`;
                toSaveMap.set(keyT, { padre_id: padreActualId, hija_id: hijaId, fecha: dateStr, periodo: 'Tarde', observaciones: null });
                toSaveMap.set(keyN, { padre_id: padreActualId, hija_id: hijaId, fecha: dateStr, periodo: 'Noche', observaciones: null });
              }
            } else {
              // Martes a domingo: todo al progenitor de esta semana
              const padreId = padresMap[parents[parentKey]];
              if (padreId) {
                periods.forEach(period => {
                  const key = `${dateStr}_${hijaId}_${period}`;
                  toSaveMap.set(key, { padre_id: padreId, hija_id: hijaId, fecha: dateStr, periodo: period, observaciones: null });
                });
              }
            }
          });
          
          // Lunes siguiente por la mañana
          const nextMondayStr = formatDate(nextMonday);
          const padreId = padresMap[parents[parentKey]];
          if (padreId) {
            const key = `${nextMondayStr}_${hijaId}_Mañana`;
            toSaveMap.set(key, { padre_id: padreId, hija_id: hijaId, fecha: nextMondayStr, periodo: 'Mañana', observaciones: null });
          }
        });
        
        const toSave = Array.from(toSaveMap.values());
        console.log('Asignaciones a guardar:', toSave.length);
        
        // Borrar e insertar uno por uno para evitar conflictos
        for (const asig of toSave) {
          // Primero borrar si existe
          await supabase
            .from('asignaciones')
            .delete()
            .eq('fecha', asig.fecha)
            .eq('periodo', asig.periodo)
            .eq('hija_id', asig.hija_id);
          
          // Luego insertar
          const { error } = await supabase.from('asignaciones').insert(asig);
          if (error) {
            console.error('Error insertando asignación:', asig, error);
          }
        }
        
        // Recargar todos los datos desde Supabase para asegurar consistencia
        await loadScheduleFromSupabase();
        
        setAssigningStatus('success');
        
        // Avanzar a la siguiente semana después de 1 segundo
        setTimeout(() => {
          setAssigningStatus(null);
          setWeekOffset(prev => prev + 1);
        }, 1000);
        
      } catch (err) {
        console.error('Error en asignación semanal:', err);
        setAssigningStatus('error');
        setTimeout(() => setAssigningStatus(null), 3000);
      }
    };
    
    // Verificar qué progenitor tiene asignada una semana (basado en el martes)
    const getWeekAssignment = (weekStart) => {
      // Usamos el martes como referencia (el lunes tiene lógica especial)
      const tuesday = new Date(weekStart);
      tuesday.setDate(weekStart.getDate() + 1);
      const tuesdayStr = formatDate(tuesday);
      
      const keyChild1 = `${tuesdayStr}_child1_Mañana`;
      const assigned = schedule[keyChild1];
      
      return assigned || null;
    };
    
    const currentAssignment = getWeekAssignment(week.start);

    return (
      <div className="p-3 flex flex-col h-full">
        {/* Título */}
        <div className="text-center mb-2">
          <div className="text-sm font-bold">📅 Asignar Custodia Semanal</div>
          <div className="text-[9px] text-gray-400 mt-1">
            ⚠️ Lunes mañana = quien deja en el cole (semana anterior)
          </div>
        </div>
        
        {/* Navegación de semanas */}
        <div className="flex items-center justify-between mb-3 bg-gray-100 rounded-lg p-2">
          <button 
            onClick={goToPreviousWeek}
            className="p-2 bg-white rounded-full shadow hover:bg-gray-50 active:bg-gray-100">
            <ChevronLeft size={24} />
          </button>
          
          <div className="text-center flex-1">
            <div className="text-lg font-bold">Semana {week.weekNum}</div>
            <div className="text-sm text-gray-600">
              {formatLongDate(week.start)} → {formatLongDate(week.end)}
            </div>
            {weekOffset !== 0 && (
              <button 
                onClick={goToCurrentWeek}
                className="text-[10px] text-blue-600 underline mt-1">
                Ir a semana actual
              </button>
            )}
          </div>
          
          <button 
            onClick={goToNextWeek}
            className="p-2 bg-white rounded-full shadow hover:bg-gray-50 active:bg-gray-100">
            <ChevronRight size={24} />
          </button>
        </div>
        
        {/* Estado de guardado */}
        {assigningStatus && (
          <div className={`text-center text-xs p-2 rounded mb-3 ${
            assigningStatus === 'success' ? 'bg-green-100 text-green-700' : 
            assigningStatus === 'error' ? 'bg-red-100 text-red-700' : 
            'bg-blue-100 text-blue-700'
          }`}>
            {assigningStatus === 'success' ? '✓ Semana asignada correctamente' : 
             assigningStatus === 'error' ? '✗ Error al guardar' : 
             '⏳ Guardando...'}
          </div>
        )}
        
        {/* Estado actual de la semana */}
        {currentAssignment && (
          <div className="text-center mb-3 p-2 rounded-lg"
            style={{ 
              backgroundColor: colors[currentAssignment] + '30',
              borderLeft: `4px solid ${colors[currentAssignment]}`
            }}>
            <span className="text-sm">Asignada a: </span>
            <span className="text-sm font-bold"
              style={{ color: currentAssignment === 'parent2' ? '#065f46' : colors[currentAssignment] }}>
              {parents[currentAssignment]}
            </span>
          </div>
        )}
        
        {/* Botones de asignación */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => assignWeekToParent(week.start, 'parent1')}
            disabled={assigningStatus === 'saving'}
            className={`flex-1 py-4 rounded-lg text-sm font-bold transition-all shadow ${
              currentAssignment === 'parent1' 
                ? 'ring-4 ring-offset-2' 
                : 'opacity-80 hover:opacity-100'
            }`}
            style={{ 
              backgroundColor: colors.parent1,
              color: 'white',
              ringColor: colors.parent1
            }}>
            {parents.parent1 || 'Padre'}
          </button>
          <button
            onClick={() => assignWeekToParent(week.start, 'parent2')}
            disabled={assigningStatus === 'saving'}
            className={`flex-1 py-4 rounded-lg text-sm font-bold transition-all shadow ${
              currentAssignment === 'parent2' 
                ? 'ring-4 ring-offset-2' 
                : 'opacity-80 hover:opacity-100'
            }`}
            style={{ 
              backgroundColor: colors.parent2,
              color: '#065f46',
              ringColor: colors.parent2
            }}>
            {parents.parent2 || 'Madre'}
          </button>
        </div>
        
        {/* Vista previa de la semana - más grande */}
        <div className="border rounded-lg p-3 bg-gray-50 mb-3">
          <div className="text-[10px] font-bold text-center mb-2 text-gray-600">Vista previa de la asignación</div>
          <div className="grid grid-cols-8 gap-1 text-[9px]">
            <div></div>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => {
              const date = new Date(week.start);
              date.setDate(week.start.getDate() + i);
              return (
                <div key={d} className="text-center">
                  <div className="font-bold" style={{ color: i >= 5 ? '#dc2626' : 'inherit' }}>{d}</div>
                  <div className="text-[8px] text-gray-500">{date.getDate()}</div>
                </div>
              );
            })}
            {[{ label: 'Mañana', short: 'M' }, { label: 'Tarde', short: 'T' }, { label: 'Noche', short: 'N' }].map((p) => (
              <React.Fragment key={p.short}>
                <div className="text-[8px] font-bold flex items-center">{p.label}</div>
                {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
                  const date = new Date(week.start);
                  date.setDate(week.start.getDate() + dayIdx);
                  const dateStr = formatDate(date);
                  const key = `${dateStr}_child1_${p.label}`;
                  const assigned = schedule[key];
                  
                  return (
                    <div key={dayIdx} 
                      className="h-6 rounded flex items-center justify-center text-[8px] font-bold"
                      style={{ 
                        backgroundColor: assigned ? colors[assigned] : '#e5e7eb',
                        color: assigned ? (assigned === 'parent2' ? '#065f46' : 'white') : '#999'
                      }}>
                      {assigned ? (assigned === 'parent1' ? 'P' : 'M') : '-'}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Leyenda */}
        <div className="p-2 bg-gray-50 rounded text-[9px]">
          <div className="font-bold mb-1">📋 Cómo funciona:</div>
          <div className="text-gray-600">
            • <strong>Lunes mañana</strong>: El progenitor de la semana anterior deja a las niñas en el cole
          </div>
          <div className="text-gray-600">
            • <strong>Lunes tarde/noche → Domingo</strong>: El progenitor asignado tiene la custodia
          </div>
          <div className="text-gray-600">
            • <strong>Lunes siguiente mañana</strong>: El progenitor asignado deja a las niñas en el cole
          </div>
        </div>
        
        {/* Botón de recargar */}
        <div className="mt-3">
          <button onClick={saveScheduleInSupabase} 
            disabled={isSaving}
            className={`w-full py-2 rounded-lg text-sm font-bold ${isSaving ? 'bg-gray-300' : 'bg-green-600 text-white'}`}>
            {isSaving ? 'Cargando...' : (lastSaveStatus === 'success' ? '✓ Recargado' : (lastSaveStatus === 'error' ? '✗ Error' : '↻ Recargar datos'))}
          </button>
        </div>
      </div>
    );
  };

  // Calendario mensual global (solo para padre - parent1)
  const GlobalMonthCalendar = () => {
    const monthDates = getMonthDates(currentDate);
    const monthLabel = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    // Solo primera letra para las hijas
    const inicialChild1 = (children.child1 || 'H')[0].toUpperCase();
    const inicialChild2 = (children.child2 || 'H')[0].toUpperCase();

    // Colores para el calendario global: Azul padre, Amarillo madre, Rosa otro
    const getColorForAssigned = (assigned) => {
      if (assigned === 'parent1') return '#3b82f6'; // Azul para padre
      if (assigned === 'parent2') return '#FBBF24'; // Amarillo para madre
      if (assigned === 'other') return '#f472b6'; // Rosa para otro
      return '#e5e7eb';
    };
    
    // Obtener código corto del turno del padre (sin horario)
    const getTurnoCorto = (turnoStr) => {
      if (!turnoStr) return '';
      // Extraer solo el código (antes del paréntesis o espacio)
      const codigo = turnoStr.split(' ')[0].split('(')[0];
      return codigo;
    };
    
    // Obtener actividad del padre (CURSO, MÁSTER, etc.)
    const getActividadCorta = (actividadStr) => {
      if (!actividadStr) return '';
      const parsed = parseActividadPadre(actividadStr);
      if (!parsed.tipo) return '';
      // Abreviar
      if (parsed.tipo === 'CLASE MÁSTER') return 'MÁS';
      if (parsed.tipo === 'CURSO') return 'CUR';
      if (parsed.tipo === 'F.O.') return 'FO';
      if (parsed.tipo === 'VIAJE') return 'VIA';
      if (parsed.tipo === 'OTRO') return parsed.textoOtro || 'OTR';
      return parsed.tipo.substring(0, 3);
    };

    return (
      <div className="p-2">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setCurrentDate(d => addMonths(d, -1))} className="p-1"><ChevronLeft size={18} /></button>
          <div className="text-sm font-medium">
            <span className="font-bold">GLOBAL</span> - {capitalize(monthLabel)}
          </div>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-1"><ChevronRight size={18} /></button>
        </div>
        
        {/* Leyenda arriba */}
        <div className="flex justify-center gap-3 mb-2 text-[9px]">
          <span className="flex items-center gap-1">
            <span style={{ backgroundColor: '#3b82f6', width: 12, height: 12, borderRadius: 2, display: 'inline-block' }}></span>
            {parents.parent1 || 'Padre'}
          </span>
          <span className="flex items-center gap-1">
            <span style={{ backgroundColor: '#FBBF24', width: 12, height: 12, borderRadius: 2, display: 'inline-block' }}></span>
            {parents.parent2 || 'Madre'}
          </span>
          {parents.other && (
            <span className="flex items-center gap-1">
              <span style={{ backgroundColor: '#f472b6', width: 12, height: 12, borderRadius: 2, display: 'inline-block' }}></span>
              {parents.other}
            </span>
          )}
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
              
              const today = isToday(date);
              const redDay = isRedDay(date);
              
              // Obtener turnos de trabajo
              const turnoKey = getTurnoKey(date);
              const turnoPadre = turnos[`${turnoKey}_padre`] || '';
              const actividadPadre = turnos[`${turnoKey}_padre_actividad`] || '';
              const turnoCorto = getTurnoCorto(turnoPadre);
              const actividadCorta = getActividadCorta(actividadPadre);

              return (
                <div key={dateKey} 
                  className="border rounded p-0.5 flex flex-col overflow-hidden min-h-[52px] cursor-pointer hover:border-blue-500"
                  onClick={() => { setCurrentDate(date); setCurrentView('daily'); }}>
                  {/* Cabecera: número del día + turno (solo para padre) */}
                  <div className="flex items-start justify-between mb-0.5">
                    <span className={`font-bold text-[9px] ${today ? 'bg-black text-white rounded-full w-4 h-4 flex items-center justify-center' : ''}`}
                      style={{ color: today ? 'white' : (redDay ? '#dc2626' : 'inherit') }}>
                      {date.getDate()}
                    </span>
                    {/* Turno y actividad - SOLO visible para parent1 */}
                    {currentUser === 'parent1' && (
                      <div className="text-right" style={{ lineHeight: 1 }}>
                        {turnoCorto && (
                          <div className="text-[6px] font-bold" style={{ color: colors.parent1 }}>{turnoCorto}</div>
                        )}
                        {actividadCorta && (
                          <div className="text-[5px] font-bold" style={{ color: '#9333ea' }}>{actividadCorta}</div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Franjas: Mañana, Tarde, Noche */}
                  <div className="flex-1 flex flex-col gap-0.5">
                    {periods.map((period) => {
                      const c1k = getScheduleKey(date, 'child1', period);
                      const c2k = getScheduleKey(date, 'child2', period);
                      const c1Assigned = schedule[c1k];
                      const c2Assigned = schedule[c2k];

                      // Verificar si es una asignación especial para child1
                      const c1IsDecision = c1Assigned?.includes('_decision_');
                      const c1IsPago = c1Assigned?.includes('_pago');
                      
                      // Verificar si es una asignación especial para child2
                      const c2IsDecision = c2Assigned?.includes('_decision_');
                      const c2IsPago = c2Assigned?.includes('_pago');
                      
                      // Función para obtener color considerando las categorías especiales
                      const getColorWithSpecial = (assigned, isDecision, isPago) => {
                        if (isDecision) return '#000000';
                        if (isPago) return '#dc2626';
                        return getColorForAssigned(assigned);
                      };
                      
                      const getTextColorWithSpecial = (assigned, isDecision, isPago) => {
                        if (isDecision || isPago) return 'white';
                        return assigned === 'parent1' ? 'white' : 'black';
                      };

                      return (
                        <div key={`${dateKey}_${period}_global`} className="flex gap-0.5 flex-1">
                          {/* Columna hija 1 */}
                          <div className="flex-1 flex items-center justify-center rounded text-[7px] font-bold"
                            style={{ 
                              backgroundColor: c1Assigned ? getColorWithSpecial(c1Assigned, c1IsDecision, c1IsPago) : '#f3f4f6',
                              color: c1Assigned ? getTextColorWithSpecial(c1Assigned, c1IsDecision, c1IsPago) : 'black'
                            }}>
                            {c1Assigned ? inicialChild1 : '-'}
                          </div>
                          {/* Columna hija 2 */}
                          <div className="flex-1 flex items-center justify-center rounded text-[7px] font-bold"
                            style={{ 
                              backgroundColor: c2Assigned ? getColorWithSpecial(c2Assigned, c2IsDecision, c2IsPago) : '#f3f4f6',
                              color: c2Assigned ? getTextColorWithSpecial(c2Assigned, c2IsDecision, c2IsPago) : 'black'
                            }}>
                            {c2Assigned ? inicialChild2 : '-'}
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

  // Calendario anual con turnos de trabajo
  const YearCalendar = () => {
    const currentYear = currentDate.getFullYear();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayLetters = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    
    // Colores para el calendario anual: Azul padre (más transparente), Amarillo madre, Rosa otro
    const getColorForAssigned = (assigned) => {
      if (assigned === 'parent1') return 'rgba(59, 130, 246, 0.5)'; // Azul más transparente para padre
      if (assigned === 'parent2') return '#FBBF24'; // Amarillo para madre
      if (assigned === 'other') return '#f472b6'; // Rosa
      return '#e5e7eb'; // Gris
    };
    
    // Colores especiales para decisión y pago
    const getColorWithSpecial = (assigned) => {
      if (!assigned) return '#f3f4f6';
      if (assigned.includes('_decision_')) return '#000000'; // Negro para decisión
      if (assigned.includes('_pago')) return '#dc2626'; // Rojo para pago
      return getColorForAssigned(assigned);
    };

    // Obtener días del mes para el año
    const getMonthDatesForYear = (month) => {
      const year = currentYear;
      const lastDay = new Date(year, month + 1, 0);
      const dates = [];
      const firstWeekDay = new Date(year, month, 1).getDay();
      const adj = firstWeekDay === 0 ? 6 : firstWeekDay - 1;
      for (let i = 0; i < adj; i++) dates.push(null);
      for (let i = 1; i <= lastDay.getDate(); i++) dates.push(new Date(year, month, i));
      return dates;
    };
    
    // Obtener código corto del turno del padre (sin horario)
    const getTurnoCorto = (turnoStr) => {
      if (!turnoStr) return '';
      const codigo = turnoStr.split(' ')[0].split('(')[0];
      return codigo;
    };
    
    // Obtener actividad del padre con formato corto
    const getActividadInfo = (actividadStr) => {
      if (!actividadStr) return null;
      const parsed = parseActividadPadre(actividadStr);
      if (!parsed.tipo) return null;
      
      // Abreviar el tipo de actividad
      let tipoCorto = '';
      if (parsed.tipo === 'CLASE MÁSTER') tipoCorto = 'MÁS';
      else if (parsed.tipo === 'CURSO') tipoCorto = 'CUR';
      else if (parsed.tipo === 'F.O.') tipoCorto = 'FO';
      else if (parsed.tipo === 'VIAJE') tipoCorto = 'VIA';
      else if (parsed.tipo === 'OTRO') tipoCorto = parsed.textoOtro || 'OTR';
      else tipoCorto = parsed.tipo.substring(0, 3);
      
      return {
        tipo: tipoCorto,
        entrada: parsed.entrada || '',
        salida: parsed.salida || '',
        esTextoPersonalizado: parsed.tipo === 'OTRO' && parsed.textoOtro
      };
    };

    return (
      <div className="p-2 h-full flex flex-col overflow-hidden">
        {/* Cabecera con año y navegación */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setCurrentDate(d => { const nd = new Date(d); nd.setFullYear(nd.getFullYear() - 1); return nd; })} 
            className="p-1"><ChevronLeft size={20} /></button>
          <div className="text-lg font-bold">{currentYear}</div>
          <button onClick={() => setCurrentDate(d => { const nd = new Date(d); nd.setFullYear(nd.getFullYear() + 1); return nd; })} 
            className="p-1"><ChevronRight size={20} /></button>
        </div>
        
        {/* Leyenda */}
        <div className="flex flex-wrap justify-center gap-2 mb-2 text-[9px]">
          <span className="flex items-center gap-1">
            <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.5)', width: 12, height: 12, borderRadius: 2, display: 'inline-block' }}></span>
            {parents.parent1 || 'Padre'}
          </span>
          <span className="flex items-center gap-1">
            <span style={{ backgroundColor: '#FBBF24', width: 12, height: 12, borderRadius: 2, display: 'inline-block' }}></span>
            {parents.parent2 || 'Madre'}
          </span>
          {parents.other && (
            <span className="flex items-center gap-1">
              <span style={{ backgroundColor: '#f472b6', width: 12, height: 12, borderRadius: 2, display: 'inline-block' }}></span>
              {parents.other}
            </span>
          )}
          <span className="flex items-center gap-1">
            <span style={{ backgroundColor: '#000000', width: 12, height: 12, borderRadius: 2, display: 'inline-block' }}></span>
            Decisión
          </span>
          <span className="flex items-center gap-1">
            <span style={{ backgroundColor: '#dc2626', width: 12, height: 12, borderRadius: 2, display: 'inline-block' }}></span>
            Pago
          </span>
        </div>
        
        {/* Grid de 12 meses (4 filas x 3 columnas) */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            {monthNames.map((monthName, monthIdx) => {
              const monthDates = getMonthDatesForYear(monthIdx);
              
              return (
                <div key={monthIdx} className="border rounded p-1">
                  {/* Nombre del mes */}
                  <div className="text-[9px] font-bold text-center mb-1 text-gray-700">{monthName}</div>
                  
                  {/* Días de la semana */}
                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {dayLetters.map((d, i) => (
                      <div key={d} className="text-[6px] text-center font-bold"
                        style={{ color: i >= 5 ? '#dc2626' : '#888' }}>{d}</div>
                    ))}
                  </div>
                  
                  {/* Días del mes */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {monthDates.map((date, idx) => {
                      if (!date) return <div key={`empty-${monthIdx}-${idx}`} style={{ height: 32 }} />;
                      
                      // Obtener asignaciones para las 6 combinaciones (Denia y Elsa x Mañana, Tarde, Noche)
                      // child1 = Denia (izquierda), child2 = Elsa (derecha)
                      const mKeyD = getScheduleKey(date, 'child1', 'Mañana');
                      const tKeyD = getScheduleKey(date, 'child1', 'Tarde');
                      const nKeyD = getScheduleKey(date, 'child1', 'Noche');
                      const mKeyE = getScheduleKey(date, 'child2', 'Mañana');
                      const tKeyE = getScheduleKey(date, 'child2', 'Tarde');
                      const nKeyE = getScheduleKey(date, 'child2', 'Noche');
                      
                      const mAssignedD = schedule[mKeyD];
                      const tAssignedD = schedule[tKeyD];
                      const nAssignedD = schedule[nKeyD];
                      const mAssignedE = schedule[mKeyE];
                      const tAssignedE = schedule[tKeyE];
                      const nAssignedE = schedule[nKeyE];
                      
                      // Obtener turno de trabajo y actividad
                      const turnoKey = getTurnoKey(date);
                      const turnoPadre = turnos[`${turnoKey}_padre`] || '';
                      const actividadPadre = turnos[`${turnoKey}_padre_actividad`] || '';
                      const turnoCorto = getTurnoCorto(turnoPadre);
                      const actividadInfo = getActividadInfo(actividadPadre);
                      
                      const today = isToday(date);
                      const redDay = isRedDay(date);
                      
                      // Determinar si hay turno o actividad para mostrar
                      const hayTurno = turnoCorto || actividadInfo;
                      
                      return (
                        <div key={`${monthIdx}-${date.getDate()}`} 
                          className="rounded-sm flex flex-col overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400"
                          onClick={() => { setCurrentDate(date); setCurrentView('daily'); }}
                          style={{ 
                            height: 32,
                            border: today ? '2px solid black' : '1px solid #e5e7eb'
                          }}>
                          {/* Fila superior: número del día */}
                          <div className="text-[5px] text-center font-bold leading-none bg-white"
                            style={{ color: redDay ? '#dc2626' : '#666' }}>
                            {date.getDate()}
                          </div>
                          {/* 6 rectángulos: 3 filas x 2 columnas */}
                          {/* Izquierda = Denia (child1), Derecha = Elsa (child2) */}
                          {/* Arriba = Mañana, Medio = Tarde, Abajo = Noche */}
                          <div className="flex-1 flex flex-col relative">
                            {/* Fila Mañana */}
                            <div className="flex-1 flex">
                              <div className="flex-1" style={{ backgroundColor: getColorWithSpecial(mAssignedD) }} />
                              <div className="flex-1" style={{ backgroundColor: getColorWithSpecial(mAssignedE) }} />
                            </div>
                            {/* Fila Tarde */}
                            <div className="flex-1 flex">
                              <div className="flex-1" style={{ backgroundColor: getColorWithSpecial(tAssignedD) }} />
                              <div className="flex-1" style={{ backgroundColor: getColorWithSpecial(tAssignedE) }} />
                            </div>
                            {/* Fila Noche */}
                            <div className="flex-1 flex">
                              <div className="flex-1" style={{ backgroundColor: getColorWithSpecial(nAssignedD) }} />
                              <div className="flex-1" style={{ backgroundColor: getColorWithSpecial(nAssignedE) }} />
                            </div>
                            {/* Turno y/o Actividad del padre centrado */}
                            {hayTurno && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className={actividadInfo?.esTextoPersonalizado && !turnoCorto ? '' : 'bg-white/80 px-0.5 rounded'} style={{ lineHeight: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  {/* Turno de trabajo */}
                                  {turnoCorto && (
                                    <span className="text-[4px] font-bold text-black">{turnoCorto}</span>
                                  )}
                                  {/* Actividad (MÁSTER, CURSO, etc.) */}
                                  {actividadInfo && (
                                    <>
                                      <span className={actividadInfo.esTextoPersonalizado ? 'text-[3px]' : 'text-[3px] font-bold'} style={{ color: '#9333ea' }}>{actividadInfo.tipo}</span>
                                      {(actividadInfo.entrada || actividadInfo.salida) && !actividadInfo.esTextoPersonalizado && (
                                        <span className="text-[3px]" style={{ color: '#9333ea' }}>
                                          {actividadInfo.entrada && actividadInfo.salida 
                                            ? `${actividadInfo.entrada}-${actividadInfo.salida}`
                                            : (
                                              <>
                                                {actividadInfo.entrada && <span>{actividadInfo.entrada}</span>}
                                                {actividadInfo.salida && <span>{actividadInfo.salida}</span>}
                                              </>
                                            )
                                          }
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
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
      
      {/* Botones de navegación - DOS FILAS PARA PADRE (parent1) */}
      {isParent1 ? (
        <div className="border-b flex">
          {/* Columna izquierda: botones pequeños en dos filas */}
          <div className="flex flex-col gap-0.5 p-1">
            {/* Primera fila */}
            <div className="flex gap-1">
              <button onClick={() => setCurrentView('daily')} className={`px-2 py-1 text-xs rounded flex items-center gap-0.5 ${currentView === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                <Calendar size={11} /> Día
              </button>
              <button onClick={() => setCurrentView('weekAssign')} className={`px-2 py-1 text-xs rounded ${currentView === 'weekAssign' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
                style={{ fontWeight: 'bold' }}>
                +Sem
              </button>
              <button onClick={() => setCurrentView('week')} className={`px-2 py-1 text-xs rounded ${currentView === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                Sem
              </button>
              <button onClick={() => setCurrentView('globalMonth')} className={`px-2 py-1 text-xs rounded ${currentView === 'globalMonth' ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}
                style={{ fontWeight: 'bold' }}>
                Global
              </button>
              <button onClick={() => setCurrentView('stats')} className={`px-1.5 py-1 text-xs rounded ${currentView === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                <BarChart3 size={14} />
              </button>
            </div>
            {/* Segunda fila: vistas por persona */}
            <div className="flex gap-1">
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
            </div>
          </div>
          {/* Columna derecha: botones Mes y Año grandes */}
          <div className="flex gap-1 p-1">
            <button onClick={() => setCurrentView('month')} className={`px-4 text-sm font-bold rounded ${currentView === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
              Mes
            </button>
            <button onClick={() => setCurrentView('year')} className={`px-4 text-sm font-bold rounded ${currentView === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
              Año
            </button>
          </div>
        </div>
      ) : (
        /* Botones para madre e hijos */
        <div className="flex gap-1.5 p-2 border-b">
          <button onClick={() => setCurrentView('week')} className={`px-3 py-1.5 text-sm rounded ${currentView === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
            Semana
          </button>
          {/* Botón Global - solo para madre */}
          {isParent2 && (
            <button onClick={() => setCurrentView('globalMonth')} className={`px-3 py-1.5 text-sm rounded ${currentView === 'globalMonth' ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}
              style={{ fontWeight: 'bold' }}>
              Global
            </button>
          )}
          {/* Botón Mes - solo para hijos */}
          {isChild && (
            <button onClick={() => setCurrentView('month')} className={`px-3 py-1.5 text-sm rounded ${currentView === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Mes</button>
          )}
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        {currentView === 'daily' && <DailyView />}
        {currentView === 'weekAssign' && <WeekAssignView />}
        {currentView === 'week' && <WeekView />}
        {currentView === 'month' && (currentUser === 'child1' ? <ChildMonthView childKey="child1" /> : currentUser === 'child2' ? <ChildMonthView childKey="child2" /> : <MonthView />)}
        {currentView === 'year' && <YearCalendar />}
        {currentView === 'globalMonth' && <GlobalMonthCalendar />}
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
