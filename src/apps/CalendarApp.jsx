import React, { useState, useEffect } from 'react';

// Calendar App - Template showing consistent structure for HoloMat apps
const CalendarApp = ({ onClose }) => {
  // --- STATE MANAGEMENT ---
  // Basic state for calendar functionality
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([
    { id: 1, title: "Strategy Meeting", date: new Date().setHours(10, 0), duration: 60, category: "work" },
    { id: 2, title: "Project Review", date: new Date().setHours(14, 30), duration: 45, category: "work" },
    { id: 3, title: "Team Lunch", date: new Date().setHours(12, 0), duration: 90, category: "social" }
  ]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // --- HELPER FUNCTIONS ---
  // Generate calendar grid data
  const getDaysInMonth = (year, month) => {
    // Get days in current month
    const date = new Date(year, month, 1);
    const days = [];
    
    // Get the day of week for the first day (0-6, 0 = Sunday)
    const firstDayOfMonth = date.getDay();
    
    // Add empty cells for days before the 1st
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Add days of the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  // Format time from Date object to readable string
  const formatTime = (dateObj) => {
    return new Date(dateObj).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Navigate to previous month
  const prevMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  // Get events for a specific day
  const getEventsForDay = (day) => {
    if (!day) return [];
    
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day && 
             eventDate.getMonth() === targetDate.getMonth() && 
             eventDate.getFullYear() === targetDate.getFullYear();
    });
  };

  // --- DATA PREPARATION ---
  // Prepare calendar data
  const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  // --- JSX RENDERING ---
  return (
    <div className="h-full flex flex-col">
      {/* App Header Section - Consistent across apps */}
      <div className="flex justify-between items-center mb-4 bg-blue-900/20 rounded-lg p-3 border border-blue-900/30">
        <div className="text-blue-100 text-lg font-light tracking-wider">
          {monthName} {year}
        </div>
        <div className="flex space-x-2">
          {/* Navigation Controls */}
          <button 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-900/40 hover:bg-blue-800/50 text-blue-300"
            onClick={prevMonth}
          >
            <span>←</span>
          </button>
          <button 
            className="px-3 py-1 rounded bg-blue-900/40 hover:bg-blue-800/50 text-blue-300 text-sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </button>
          <button 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-900/40 hover:bg-blue-800/50 text-blue-300"
            onClick={nextMonth}
          >
            <span>→</span>
          </button>
        </div>
      </div>
      
      {/* Calendar Grid - Main content area */}
      <div className="flex-1 overflow-auto">
        {/* Days of week header */}
        <div className="grid grid-cols-7 mb-2 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-blue-400/70 text-xs py-1">{day}</div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            // Get events for this day
            const dayEvents = day ? getEventsForDay(day) : [];
            const isToday = day === new Date().getDate() && 
                           currentDate.getMonth() === new Date().getMonth() && 
                           currentDate.getFullYear() === new Date().getFullYear();
            
            return (
              <div 
                key={index} 
                className={`
                  h-20 border rounded p-1 relative
                  ${day ? 'border-blue-900/40' : 'border-transparent bg-transparent'} 
                  ${isToday ? 'bg-blue-900/30' : day ? 'bg-blue-950/30 hover:bg-blue-900/20' : ''}
                `}
              >
                {day && (
                  <>
                    <div className={`text-xs ${isToday ? 'text-blue-300 font-semibold' : 'text-blue-400/80'}`}>
                      {day}
                    </div>
                    <div className="mt-1 overflow-hidden">
                      {dayEvents.map(event => (
                        <div 
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`
                            text-xs mb-1 px-1 py-0.5 rounded truncate cursor-pointer
                            ${event.category === 'work' ? 'bg-blue-800/40 text-blue-200' : 'bg-indigo-800/40 text-indigo-200'}
                          `}
                        >
                          {formatTime(event.date)} {event.title}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Event Details Modal - Appears when an event is selected */}
      {selectedEvent && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-blue-950/90 border border-blue-800/50 p-4 rounded-lg w-full max-w-md animate-scaleIn">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-blue-200 text-lg">{selectedEvent.title}</h3>
              <button 
                className="w-6 h-6 rounded-full bg-blue-900/60 text-blue-400 flex items-center justify-center"
                onClick={() => setSelectedEvent(null)}
              >
                ×
              </button>
            </div>
            <div className="mb-3 py-2 border-b border-blue-900/50">
              <div className="flex items-center text-blue-300 text-sm mb-1">
                <span className="mr-2">
                  {/* Clock Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </span>
                {formatTime(selectedEvent.date)} • {selectedEvent.duration} minutes
              </div>
              <div className="flex items-center text-blue-300 text-sm">
                <span className="mr-2">
                  {/* Tag Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </span>
                {selectedEvent.category.charAt(0).toUpperCase() + selectedEvent.category.slice(1)}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button 
                className="px-3 py-1.5 bg-blue-800/40 hover:bg-blue-700/50 text-blue-300 text-xs rounded border border-blue-700/30"
              >
                Edit
              </button>
              <button 
                className="px-3 py-1.5 bg-red-900/30 hover:bg-red-800/40 text-red-300 text-xs rounded border border-red-800/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarApp;
