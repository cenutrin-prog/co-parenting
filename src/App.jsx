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
  const [colors] = useState({ parent1: '#86efac', parent2: '#fde047', child1: '#60a5fa', child2: '#f9a8d4', other: '#10B981' });
  const [borderColors] = useState({ parent1: '#065f46', parent2: '#713f12', child1: '#1e3a8a', child2: '#831843', other: '#065f46' });
  const [currentUser, setCurrentUser] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [notes, setNotes] = useState({});
  const [currentView, setCurrentView] = useState('week'); // Abrimos directamente en semana
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalObservation, setModalObservation] = useState(null); // recuadro grande

  const periods = ['Mañana', 'Tarde', 'Noche'];
  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const saveAndContinue = (user) => {
    localStorage.setItem('coparenting_parents', JSON.stringify(parents));
    localStorage.setItem('coparenting_children', JSON.stringify(children));
    setCurrentUser(user);
    setShowNameEntry(false);
    setStep('main');
    setCurrentView('week'); // abrimos directamente vista semanal
  };

  const getWeekDates = (date) => {
    const curr = new Date(date);
    const day = curr.getDay();
    const diff = (day === 0 ? -6 : 1 - day); // lunes como primer día
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

  const formatDate = (date) => date.toISOString().split('T')[0];
  const getScheduleKey = (date, child, period) => `${formatDate(date)}_${child}_${period}`;

  // ------------------ DAILY VIEW ------------------
  const DailyView = () => (
    <div className="p-2">
      {periods.map(period => (
        <div key={period} className="mb-3 border rounded p-2">
          <div className="text-xs font-bold mb-2 uppercase">{period}</div>
          <div className="grid grid-cols-2 gap-2">
            {['child1','child2'].map(child => (
              <div key={child} className="border rounded p-2">
                <div className="text-xs font-medium mb-1">{children[child]}</div>
                <select
                  value={schedule[getScheduleKey(currentDate, child, period)] || ''}
                  onChange={(e) => setSchedule({...schedule, [getScheduleKey(currentDate, child, period)]: e.target.value})}
                  className="w-full text-xs p-1 border rounded"
                  style={{ backgroundColor: schedule[getScheduleKey(currentDate, child, period)] ? colors[schedule[getScheduleKey(currentDate, child, period)]]+'20' : 'white' }}
                  disabled={currentUser==='child1' || currentUser==='child2'}
                >
                  <option value="">Seleccionar</option>
                  {Object.keys(parents).map(p => <option key={p} value={p}>{parents[p]}</option>)}
                </select>
                <textarea
                  placeholder="Observaciones"
                  value={notes[getScheduleKey(currentDate, child, period)] || ''}
                  onChange={(e) => setNotes(prev => ({
                    ...prev,
                    [getScheduleKey(currentDate, child, period)]: e.target.value
                  }))}
                  className="w-full text-xs p-1 border rounded mt-1"
                  style={{ minHeight:'50px' }}
                  disabled={currentUser==='child1' || currentUser==='child2'}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // ------------------ WEEK VIEW ------------------
  const WeekView = () => {
    const weekDates = getWeekDates(currentDate);
    const firstMonth = weekDates[0].toLocaleDateString('es-ES',{month:'long'});
    const lastMonth = weekDates[6].toLocaleDateString('es-ES',{month:'long'});
    const monthLabel = firstMonth===lastMonth?firstMonth:`${firstMonth} / ${lastMonth}`;

    return (
      <div className="p-2 overflow-x-auto">
        <div className="flex items-center justify-between mb-2">
          <button onClick={()=>{ const d = new Date(currentDate); d.setDate(currentDate.getDate()-7); setCurrentDate(d);}} className="p-1"><ChevronLeft size={18}/></button>
          <div className="text-xs font-medium">{monthLabel}</div>
          <button onClick={()=>{ const d = new Date(currentDate); d.setDate(currentDate.getDate()+7); setCurrentDate(d);}} className="p-1"><ChevronRight size={18}/></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs">
          {weekDates.map((date,i)=>(
            <div key={i} className="border rounded p-1">
              <div className="font-bold text-center mb-1">{daysOfWeek[i]} {date.getDate()}</div>
              {periods.map(period=>{
                const child = currentUser==='child1'? 'child1' : currentUser==='child2'? 'child2' : null;
                return child && (
                  <div key={period} className="mb-1">
                    <div className="text-[10px] px-1 rounded text-center" style={{backgroundColor:schedule[getScheduleKey(date,child,period)] ? colors[schedule[getScheduleKey(date,child,period)]] : '#f3f4f6'}}>
                      {schedule[getScheduleKey(date,child,period)] ? (schedule[getScheduleKey(date,child,period)]==='parent1'?'Papá':'Mamá') : '-'}
                    </div>
                    <div className="text-[8px] px-1 rounded text-center" style={{backgroundColor:'#e5e7eb'}}>
                      {notes[getScheduleKey(date,child,period)] || ''}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ------------------ MONTH VIEW ------------------
  const MonthView = () => {
    const monthDates = getMonthDates(currentDate);
    return (
      <div className="p-2">
        <div className="flex items-center justify-between mb-2">
          <button onClick={()=>{ const d = new Date(currentDate); d.setMonth(currentDate.getMonth()-1); setCurrentDate(d); }} className="p-1"><ChevronLeft size={18}/></button>
          <div className="text-sm font-medium">{currentDate.toLocaleDateString('es-ES',{month:'long',year:'numeric'})}</div>
          <button onClick={()=>{ const d = new Date(currentDate); d.setMonth(currentDate.getMonth()+1); setCurrentDate(d); }} className="p-1"><ChevronRight size={18}/></button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {daysOfWeek.map(day => <div key={day} className="text-xs font-bold text-center">{day}</div>)}
          {monthDates.map((date,i)=>(
            <div key={i} className="border rounded p-1 min-h-16">
              {date && periods.map(period=>{
                const child = currentUser==='child1'? 'child1': currentUser==='child2'? 'child2':null;
                return child && (
                  <div key={period} className="mb-1">
                    <div className="text-[10px] px-1 rounded text-center" style={{backgroundColor:schedule[getScheduleKey(date,child,period)]? colors[schedule[getScheduleKey(date,child,period)]]:'#f3f4f6'}}>
                      {schedule[getScheduleKey(date,child,period)]? (schedule[getScheduleKey(date,child,period)]==='parent1'?'Papá':'Mamá') : '-'}
                    </div>
                    <div className="text-[8px] px-1 rounded text-center" style={{backgroundColor:'#e5e7eb'}}>
                      {notes[getScheduleKey(date,child,period)] || ''}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {modalObservation && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50" onClick={()=>setModalObservation(null)}>
            <div className="bg-white p-4 rounded max-w-md w-full" onClick={e=>e.stopPropagation()}>
              <h3 className="font-bold mb-2">Observaciones</h3>
              <p className="text-sm">{modalObservation}</p>
              <button onClick={()=>setModalObservation(null)} className="mt-2 px-3 py-1 bg-blue-600 text-white rounded">Cerrar</button>
            </div>
          </div>
        )}
      </div>
    )
  };

  // ------------------ RENDER ------------------
  if(step==='setup'){
    return <SetupScreen saveAndContinue={saveAndContinue} parents={parents} setParents={setParents} children={children} setChildren={setChildren} showNameEntry={showNameEntry} setShowNameEntry={setShowNameEntry} />;
  }

  const topBarColor = currentUser ? colors[currentUser]:'#3b82f6';
  const profileBorder = currentUser ? borderColors[currentUser]:'#ffffff';
  const displayName = currentUser==='child1'? children.child1: currentUser==='child2'? children.child2: currentUser==='parent1'? parents.parent1: currentUser==='parent2'?parents.parent2:currentUser;

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-white">
      <div className="flex items-center justify-between p-2" style={{backgroundColor:topBarColor}}>
        <div className="flex items-center gap-2 text-white">
          <Users size={20}/>
          <span className="font-bold text-sm">CoParenting</span>
        </div>
        <button onClick={()=>setStep('setup')} className="text-xs px-2 py-1 rounded border-2 font-medium"
          style={{borderColor: profileBorder, backgroundColor:'white', color:topBarColor}}>
          {displayName}
        </button>
      </div>

      <div className="flex gap-1 p-2 border-b overflow-x-auto">
        <button onClick={()=>setCurrentView('daily')} className={`px-3 py-1 text-xs rounded flex items-center gap-1 whitespace-nowrap ${currentView==='daily'?'bg-blue-600 text-white':'bg-gray-100'}`}><Calendar size={14}/>Día</button>
        <button onClick={()=>setCurrentView('week')} className={`px-3 py-1 text-xs rounded whitespace-nowrap ${currentView==='week'?'bg-blue-600 text-white':'bg-gray-100'}`}>Semana</button>
        <button onClick={()=>setCurrentView('month')} className={`px-3 py-1 text-xs rounded whitespace-nowrap ${currentView==='month'?'bg-blue-600 text-white':'bg-gray-100'}`}>Mes</button>
        {!(currentUser==='child1'||currentUser==='child2') &&
          <button onClick={()=>setCurrentView('stats')} className={`px-3 py-1 text-xs rounded flex items-center gap-1 whitespace-nowrap ${currentView==='stats'?'bg-blue-600 text-white':'bg-gray-100'}`}><BarChart3 size={14}/>Estadísticas</button>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {currentView==='daily' && <DailyView />}
        {currentView==='week' && <WeekView />}
        {currentView==='month' && <MonthView />}
      </div>
    </div>
  )
};

export default CoParentingApp;
