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
  const [currentUser, setCurrentUser] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [notes, setNotes] = useState({});
  const [currentView, setCurrentView] = useState('daily');
  const [currentDate, setCurrentDate] = useState(new Date());

  const periods = ['mañana', 'tarde', 'noche'];
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const saveAndContinue = (user) => {
    localStorage.setItem('coparenting_parents', JSON.stringify(parents));
    localStorage.setItem('coparenting_children', JSON.stringify(children));
    setCurrentUser(user);
    setShowNameEntry(false);
    setStep('main');
  };

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
    
    for (let i = 0; i < firstDay.getDay(); i++) {
      dates.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      dates.push(new Date(year, month, i));
    }
    
    return dates;
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getScheduleKey = (date, child, period) => {
    return `${formatDate(date)}_${child}_${period}`;
  };

  const getStats = () => {
    const stats = {
      child1: { parent1: { total: 0, weekday: 0, weekend: 0 }, parent2: { total: 0, weekday: 0, weekend: 0 }, other: { total: 0, weekday: 0, weekend: 0 } },
      child2: { parent1: { total: 0, weekday: 0, weekend: 0 }, parent2: { total: 0, weekday: 0, weekend: 0 }, other: { total: 0, weekday: 0, weekend: 0 } }
    };

    Object.keys(schedule).forEach(key => {
      const [dateStr, child, period] = key.split('_');
      const date = new Date(dateStr);
      const day = date.getDay();
      const isWeekend = day === 0 || day === 6;
      const parent = schedule[key];

      if (parent && stats[child] && stats[child][parent]) {
        stats[child][parent].total++;
        if (isWeekend) {
          stats[child][parent].weekend++;
        } else {
          stats[child][parent].weekday++;
        }
      }
    });

    return stats;
  };

  const DailyView = () => {
    const dateStr = formatDate(currentDate);
    const dayName = daysOfWeek[currentDate.getDay()];

    return (
      <div className="p-2">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 1);
            setCurrentDate(d);
          }} className="p-1"><ChevronLeft size={20} /></button>
          <div className="text-sm font-medium">{dayName} {currentDate.getDate()}/{currentDate.getMonth() + 1}</div>
          <button onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 1);
            setCurrentDate(d);
          }} className="p-1"><ChevronRight size={20} /></button>
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
                    onChange={(e) => setSchedule({...schedule, [getScheduleKey(currentDate, child, period)]: e.target.value})}
                    className="w-full text-xs p-1 border rounded"
                    style={{ backgroundColor: schedule[getScheduleKey(currentDate, child, period)] ? colors[schedule[getScheduleKey(currentDate, child, period)]] + '20' : 'white' }}
                    disabled={currentUser === 'child1' || currentUser === 'child2'}
                  >
                    <option value="">Seleccionar</option>
                    <option value="parent1">Papá</option>
                    <option value="parent2">Mamá</option>
                  </select>
                  <textarea
                    placeholder="Observaciones"
                    value={notes[getScheduleKey(currentDate, child, period)] || ''}
                    onChange={(e) => setNotes(prev => ({
                      ...prev,
                      [getScheduleKey(currentDate, child, period)]: e.target.value
                    }))}
                    className="w-full text-xs p-1 border rounded mt-1"
                    style={{ minHeight: '50px' }}
                    disabled={currentUser === 'child1' || currentUser === 'child2'}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const WeekView = () => {
    const weekDates = getWeekDates(currentDate);

    return (
      <div className="p-2 overflow-x-auto">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 7);
            setCurrentDate(d);
          }} className="p-1"><ChevronLeft size={18} /></button>
          <div className="text-xs font-medium">Semana {Math.ceil(currentDate.getDate() / 7)}</div>
          <button onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 7);
            setCurrentDate(d);
          }} className="p-1"><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs">
          {weekDates.map((date, i) => (
            <div key={i} className="border rounded p-1">
              <div className="font-bold text-center mb-1">{daysOfWeek[date.getDay()]} {date.getDate()}</div>
              {periods.map(period => (
                <div key={period} className="mb-1">
                  <div className="text-xs font-medium">{period[0].toUpperCase()}</div>
                  {['child1', 'child2'].map(child => {
                    const parent = schedule[getScheduleKey(date, child, period)];
                    return (
                      <div key={child} className="text-xs px-1 rounded" style={{ backgroundColor: parent ? colors[parent] + '40' : '#f3f4f6' }}>
                        {parent ? parent === 'parent1' ? 'Papá' : 'Mamá' : '-'}
                      </div>
                    );
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
          <button onClick={() => {
            const d = new Date(currentDate);
            d.setMonth(d.getMonth() - 1);
            setCurrentDate(d);
          }} className="p-1"><ChevronLeft size={18} /></button>
          <div className="text-sm font-medium">{currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</div>
          <button onClick={() => {
            const d = new Date(currentDate);
            d.setMonth(d.getMonth() + 1);
            setCurrentDate(d);
          }} className="p-1"><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {daysOfWeek.map(day => (
            <div key={day} className="text-xs font-bold text-center">{day}</div>
          ))}
          {monthDates.map((date, i) => (
            <div key={i} className="border rounded p-1 min-h-16">
              {date && (
                <>
                  <div className="text-xs font-bold">{date.getDate()}</div>
                  {periods.map(period => (
                    <div key={period} className="flex gap-0.5 text-[10px]">
                      {['child1', 'child2'].map(child => {
                        const parent = schedule[getScheduleKey(date, child, period)];
                        return (
                          <div key={child} className="flex-1 h-4 rounded text-center text-[10px]" style={{ backgroundColor: parent ? colors[parent] : '#e5e7eb' }}>
                            {parent ? parent === 'parent1' ? 'Papá' : 'Mamá' : ''}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (step === 'setup') {
    return <SetupScreen saveAndContinue={saveAndContinue} parents={parents} setParents={setParents} children={children} setChildren={setChildren} showNameEntry={showNameEntry} setShowNameEntry={setShowNameEntry} />;
  }

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-white">
      <div className="bg-blue-600 text-white p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} />
          <span className="font-bold text-sm">CoParenting</span>
        </div>
        <button onClick={() => setStep('setup')} className="text-xs bg-blue-700 px-2 py-1 rounded">
          {currentUser === 'parent1' ? 'Papá' : currentUser === 'parent2' ? 'Mamá' : currentUser === 'child1' ? children.child1 : children.child2}
        </button>
      </div>

      <div className="flex gap-1 p-2 border-b overflow-x-auto">
        <button
          onClick={() => setCurrentView('daily')}
          className={`px-3 py-1 text-xs rounded flex items-center gap-1 whitespace-nowrap ${currentView === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          <Calendar size={14} />
          Día
        </button>
        <button
          onClick={() => setCurrentView('week')}
          className={`px-3 py-1 text-xs rounded whitespace-nowrap ${currentView === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Semana
        </button>
        <button
          onClick={() => setCurrentView('month')}
          className={`px-3 py-1 text-xs rounded whitespace-nowrap ${currentView === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Mes
        </button>
        {!(currentUser === 'child1' || currentUser === 'child2') && (
          <button
            onClick={() => setCurrentView('stats')}
            className={`px-3 py-1 text-xs rounded flex items-center gap-1 whitespace-nowrap ${currentView === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            <BarChart3 size={14} />
            Estadísticas
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {currentView === 'daily' && <DailyView />}
        {currentView === 'week' && <WeekView />}
        {currentView === 'month' && <MonthView />}
        {currentView === 'stats' && !(currentUser === 'child1' || currentUser === 'child2') && <StatsView />}
      </div>
    </div>
  );
};

export default CoParentingApp;
