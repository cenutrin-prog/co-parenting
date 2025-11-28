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
  const [currentView, setCurrentView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [popupObs, setPopupObs] = useState(null);

  const periods = ['Mañana', 'Tarde', 'Noche'];
  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const saveAndContinue = (user) => {
    localStorage.setItem('coparenting_parents', JSON.stringify(parents));
    localStorage.setItem('coparenting_children', JSON.stringify(children));
    setCurrentUser(user);
    setShowNameEntry(false);
    setStep('main');
  };

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

  const formatDate = (date) => date.toISOString().split('T')[0];
  const getScheduleKey = (date, child, period) => `${formatDate(date)}_${child}_${period}`;

  const DailyView = () => (
    <div className="p-1">
      {periods.map(period => (
        <div key={period} className="mb-1">
          <div className="text-xs font-bold mb-1">{period}</div>
          {['child1','child2'].map(child => (
            <div key={child} className="mb-1 border rounded p-1">
              <div className="text-[10px] font-medium">{children[child]}</div>
              <select
                value={schedule[getScheduleKey(currentDate, child, period)] || ''}
                onChange={(e)=>setSchedule({...schedule, [getScheduleKey(currentDate, child, period)]: e.target.value})}
                disabled={currentUser==='child1'||currentUser==='child2'}
                className="w-full text-xs p-1 border rounded"
                style={{backgroundColor: schedule[getScheduleKey(currentDate, child, period)] ? colors[schedule[getScheduleKey(currentDate, child, period)]]+'40' : 'white'}}
              >
                <option value="">Seleccionar</option>
                <option value="parent1">{parents.parent1 || 'Papá'}</option>
                <option value="parent2">{parents.parent2 || 'Mamá'}</option>
                {parents.other && <option value="other">{parents.other}</option>}
              </select>
              <textarea
                value={notes[getScheduleKey(currentDate, child, period)] || ''}
                onChange={(e)=>setNotes({...notes, [getScheduleKey(currentDate, child, period)]: e.target.value})}
                disabled={currentUser==='child1'||currentUser==='child2'}
                className="w-full text-xs p-1 border rounded mt-1"
                style={{minHeight:'40px'}}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const WeekView = () => {
    const weekDates = getWeekDates(currentDate);
    const monthLabel = `${weekDates[0].toLocaleDateString('es-ES',{month:'long'})} / ${weekDates[6].toLocaleDateString('es-ES',{month:'long'})}`;
    return (
      <div className="p-1 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <button onClick={()=>{const d=new Date(currentDate);d.setDate(currentDate.getDate()-7);setCurrentDate(d);}} className="p-1"><ChevronLeft size={18}/></button>
          <div className="text-xs font-medium">{monthLabel}</div>
          <button onClick={()=>{const d=new Date(currentDate);d.setDate(currentDate.getDate()+7);setCurrentDate(d);}} className="p-1"><ChevronRight size={18}/></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-[10px]">
          {weekDates.map((date,i)=>(
            <div key={i} className="border rounded p-1 min-h-[60px] flex flex-col justify-between">
              <div className="font-bold text-center">{daysOfWeek[i]} {date.getDate()}</div>
              {periods.map((period,j)=>(
                <div key={j} className="grid grid-rows-4 gap-1 text-[8px]">
                  {['child1','child2'].map((child,k)=>{
                    const parent = schedule[getScheduleKey(date,child,period)];
                    const obs = notes[getScheduleKey(date,child,period)] || '';
                    return (
                      <>
                        <div key={child+'p'} className="text-center rounded" style={{backgroundColor: parent ? colors[parent] : '#f3f4f6'}}>
                          {parent ? (parent==='parent1'?'Papá':'Mamá') : '-'}
                        </div>
                        <div key={child+'o'} className="text-center border rounded">{obs || '-'}</div>
                      </>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  };

  const MonthView = () => {
    const monthDates = getMonthDates(currentDate);
    const monthLabel = currentDate.toLocaleDateString('es-ES',{month:'long',year:'numeric'});
    return (
      <div className="p-1">
        <div className="flex items-center justify-between mb-1">
          <button onClick={()=>{const d=new Date(currentDate);d.setMonth(currentDate.getMonth()-1);setCurrentDate(d);}} className="p-1"><ChevronLeft size={18}/></button>
          <div className="text-xs font-medium">{monthLabel}</div>
          <button onClick={()=>{const d=new Date(currentDate);d.setMonth(currentDate.getMonth()+1);setCurrentDate(d);}} className="p-1"><ChevronRight size={18}/></button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-[8px]">
          {daysOfWeek.map(d=><div key={d} className="text-[8px] font-bold text-center">{d}</div>)}
          {monthDates.map((date,i)=>(
            <div key={i} className="border rounded p-0.5 min-h-[50px] flex flex-col justify-between">
              {date ? periods.map(period=>{
                return ['child1','child2'].map(child=>{
                  const parent = schedule[getScheduleKey(date,child,period)];
                  const obs = notes[getScheduleKey(date,child,period)] || '';
                  return (
                    <>
                      <div className="text-[6px] text-center" style={{backgroundColor: parent? colors[parent]:'#f3f4f6'}}>
                        {parent ? (parent==='parent1'?'Papá':'Mamá') : '-'}{obs? '*' : ''}
                      </div>
                    </>
                  )
                })
              }): <div className="text-[6px] text-center">-</div>}
            </div>
          ))}
        </div>
      </div>
    )
  };

  if(step==='setup'){
    return <SetupScreen saveAndContinue={saveAndContinue} parents={parents} setParents={setParents} children={children} setChildren={setChildren} showNameEntry={showNameEntry} setShowNameEntry={setShowNameEntry} />;
  }

  const topBarColor = currentUser ? colors[currentUser] : '#3b82f6';
  const profileBorder = currentUser ? borderColors[currentUser] : '#ffffff';
  const displayName = currentUser==='parent1'?parents.parent1:currentUser==='parent2'?parents.parent2:currentUser;

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-white">
      <div className="flex items-center justify-between p-1" style={{ backgroundColor: topBarColor }}>
        <div className="flex items-center gap-1 text-white"><Users size={16}/>CoParenting</div>
        <button onClick={()=>setStep('setup')} className="text-[10px] px-2 py-1 rounded border-2 font-medium"
          style={{borderColor: profileBorder, backgroundColor:'white', color:topBarColor}}>
          {displayName || 'Usuario'}
        </button>
      </div>
      <div className="flex gap-1 p-1 border-b overflow-x-auto">
        {currentUser!=='child1' && currentUser!=='child2' && <button onClick={()=>setCurrentView('daily')} className={`px-2 py-0.5 text-[8px] rounded ${currentView==='daily'?'bg-blue-600 text-white':'bg-gray-100'}`}><Calendar size={12}/>Día</button>}
        <button onClick={()=>setCurrentView('week')} className={`px-2 py-0.5 text-[8px] rounded ${currentView==='week'?'bg-blue-600 text-white':'bg-gray-100'}`}>Semana</button>
        <button onClick={()=>setCurrentView('month')} className={`px-2 py-0.5 text-[8px] rounded ${currentView==='month'?'bg-blue-600 text-white':'bg-gray-100'}`}>Mes</button>
        {!(currentUser==='child1'||currentUser==='child2') && <button onClick={()=>setCurrentView('stats')} className={`px-2 py-0.5 text-[8px] rounded ${currentView==='stats'?'bg-blue-600 text-white':'bg-gray-100'}`}><BarChart3 size={12}/>Estadísticas</button>}
      </div>
      <div className="flex-1 overflow-y-auto">
        {currentView==='daily' && <DailyView />}
        {currentView==='week' && <WeekView />}
        {currentView==='month' && <MonthView />}
      </div>
      {popupObs && (
        <div className="fixed inset-0 flex justify-center items-center bg-black/40" onClick={()=>setPopupObs(null)}>
          <div className="bg-white p-4 rounded max-w-sm">{popupObs}</div>
        </div>
      )}
    </div>
  )
};

export default CoParentingApp;
