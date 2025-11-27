import React, { useState } from 'react';
import { Calendar, Users, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import SetupScreen from './SetupScreen'; // <-- Importa el componente que creamos

const CoParentingApp = () => {
  const savedParents = typeof window !== 'undefined' ? localStorage.getItem('coparenting_parents') : null;
  const savedChildren = typeof window !== 'undefined' ? localStorage.getItem('coparenting_children') : null;
  
  const [step, setStep] = useState('setup');
  const [showNameEntry, setShowNameEntry] = useState(!savedParents || !savedChildren);
  const [parents, setParents] = useState(savedParents ? JSON.parse(savedParents) : { parent1: '', parent2: '', other: '' });
  const [children, setChildren] = useState(savedChildren ? JSON.parse(savedChildren) : { child1: '', child2: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [notes, setNotes] = useState({});
  const [currentView, setCurrentView] = useState('daily');
  const [currentDate, setCurrentDate] = useState(new Date());

  const colors = { parent1: '#86efac', parent2: '#fde047', child1: '#60a5fa', child2: '#f9a8d4', other: '#10B981' };
  const periods = ['mañana', 'tarde', 'noche'];
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const saveAndContinue = (user) => {
    localStorage.setItem('coparenting_parents', JSON.stringify(parents));
    localStorage.setItem('coparenting_children', JSON.stringify(children));
    setCurrentUser(user);
    setShowNameEntry(false);
    setStep('main');
  };

  const formatDate = (date) => date.toISOString().split('T')[0];
  const getScheduleKey = (date, child, period) => `${formatDate(date)}_${child}_${period}`;

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

    for (let i = 0; i < firstDay.getDay(); i++) dates.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) dates.push(new Date(year, month, i));

    return dates;
  };

  const getStats = () => {
    const stats = {
      child1: { parent1: { total: 0, weekday: 0, weekend: 0 }, parent2: { total: 0, weekday: 0, weekend: 0 }, other: { total: 0, weekday: 0, weekend: 0 } },
      child2: { parent1: { total: 0, weekday: 0, weekend: 0 }, parent2: { total: 0, weekday: 0, weekend: 0 }, other: { total: 0, weekday: 0, weekend: 0 } }
    };

    Object.keys(schedule).forEach(key => {
      const [dateStr, child, period] = key.split('_');
      const date = new Date(dateStr);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const parent = schedule[key];
      if (parent && stats[child] && stats[child][parent]) {
        stats[child][parent].total++;
        if (isWeekend) stats[child][parent].weekend++;
        else stats[child][parent].weekday++;
      }
    });

    return stats;
  };

  const DailyView = () => {
    const dayName = daysOfWeek[currentDate.getDay()];
    return (
      <div className="p-2">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })}><ChevronLeft size={20} /></button>
          <div className="text-sm font-medium">{dayName} {currentDate.getDate()}/{currentDate.getMonth() + 1}</div>
          <button onClick={() => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}><ChevronRight size={20} /></button>
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
                    onChange={(e) => setSchedule(prev => ({ ...prev, [getScheduleKey(currentDate, child, period)]: e.target.value }))}
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
                    onChange={(e) => setNotes(prev => ({ ...prev, [getScheduleKey(currentDate, child, period)]: e.target.value }))}
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
            {['child1','child2'].map(child => (
              <div key={child} className="border rounded p-2">
                <div className="font-medium mb-1">{children[child]}</div>
                {['parent1','parent2',...(parents.other ? ['other'] : [])].map(parent => {
                  const count = Object.keys(schedule).filter(k => k.split('_')[1] === child && schedule[k] === parent).length;
                  return <div key={parent} className="flex justify-between" style={{ color: colors[parent] }}>
                    <span>{parents[parent]}</span>
                    <span className="font-bold">{count}</span>
                  </div>;
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
          <button onClick={() => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}><ChevronLeft size={18} /></button>
          <div className="text-xs font-medium">Semana {Math.ceil(currentDate.getDate() / 7)}</div>
          <button onClick={() => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs">
          {weekDates.map((date,i) => (
            <div key={i} className="border rounded p-1">
              <div className="font-bold text-center mb-1">{daysOfWeek[date.getDay()]} {date.getDate()}</div>
              {periods.map(period => (
                <div key={period} className="mb-1">
                  <div className="text-xs font-medium">{period[0].toUpperCase()}</div>
                  {['child1','child2'].map(child => {
                    const parent = schedule[getScheduleKey(date, child, period)];
                    return <div key={child} className="text-xs px-1 rounded" style={{ backgroundColor: parent ? colors[parent] + '40' : '#f3f4f6' }}>{parent ? parents[parent].substring(0,3) : '-'}</div>;
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
          <button onClick={() => setCurrentDate(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })}><ChevronLeft size={18} /></button>
          <div className="text-sm font-medium">{currentDate.toLocaleDateString('es-ES',{month:'long',year:'numeric'})}</div>
          <button onClick={() => setCurrentDate(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })}><ChevronRight size={18} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {daysOfWeek.map(day => <div key={day} className="text-xs font-bold text-center">{day}</div>)}
          {monthDates.map((date,i) => (
            <div key={i} className="border rounded p-1 min-h-16">
              {date && <>
                <div className="text-xs font-bold">{date.getDate()}</div>
                {periods.map(period => (
                  <div key={period} className="flex gap-0.5">
                    {['child1','child2'].map(child => {
                      const parent = schedule[getScheduleKey(date, child, period)];
                      return <div key={child} className="flex-1 h-1.5 rounded" style={{ backgroundColor: parent ? colors[parent] : '#e5e7eb' }} />;
                    })}
                  </div>
                ))}
              </>}
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
            {['parent1','parent2',...(parents.other?['other']:[])].map(parent => (
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
    return (
      <SetupScreen
        parents={parents}
        setParents={setParents}
        children={children}
        setChildren={setChildren}
        saveAndContinue={saveAndContinue}
        showNameEntry={showNameEntry}
        setShowNameEntry={setShowNameEntry}
      />
    );
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
        <button onClick={() => setCurrentView('daily')} className={`px-3 py-1 text-xs rounded flex items-center gap-1 whitespace-nowrap ${currentView==='daily'?'bg-blue-600 text-white':'bg-gray-100'}`}>
          <Calendar size={14} /> Día
        </button>
        <button onClick={() => setCurrentView('week')} className={`px-3 py-1 text-xs rounded whitespace-nowrap ${currentView==='week'?'bg-blue-600 text-white':'bg-gray-100'}`}>Semana</button>
        <button onClick={() => setCurrentView('month')} className={`px-3 py-1 text-xs rounded whitespace-nowrap ${currentView==='month'?'bg-blue-600 text-white':'bg-gray-100'}`}>Mes</button>
        <button onClick={() => setCurrentView('stats')} className={`px-3 py-1 text-xs rounded flex items-center gap-1 whitespace-nowrap ${currentView==='stats'?'bg-blue-600 text-white':'bg-gray-100'}`}>
          <BarChart3 size={14} /> Estadísticas
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {currentView==='daily' && <DailyView />}
        {currentView==='week' && <WeekView />}
        {currentView==='month' && <MonthView />}
        {currentView==='stats' && <StatsView />}
      </div>
    </div>
  );
};

export default CoParentingApp;
