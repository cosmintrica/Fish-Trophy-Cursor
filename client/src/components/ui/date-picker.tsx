import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
}

const months = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
];

const weekDays = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sa', 'Du'];

export const DatePicker = ({ value, onChange, placeholder = 'Selectează data', className }: DatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      setCurrentMonth(date.getMonth());
      setCurrentYear(date.getFullYear());
    }
  }, [value]);

  // Calculate calendar position when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const updatePosition = () => {
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          const scrollX = window.scrollX || document.documentElement.scrollLeft;
          
          // Position below input, aligned to left
          const top = rect.bottom + scrollY + 8; // 8px gap
          const left = rect.left + scrollX;
          
          setCalendarPosition({ top, left });
        }
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        inputRef.current &&
        !inputRef.current.contains(target) &&
        !target.closest('.date-picker-calendar-portal')
      ) {
        setIsOpen(false);
      }
    };

    // Use capture phase to catch events before they bubble
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen]);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1; // Luni = 0
  };

  const handleDateSelect = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    setSelectedDate(date);
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(formattedDate);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    onChange(formattedDate);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedDate(null);
    onChange('');
    setIsOpen(false);
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentMonth === selectedDate.getMonth() &&
      currentYear === selectedDate.getFullYear()
    );
  };

  const displayValue = selectedDate
    ? `${String(selectedDate.getDate()).padStart(2, '0')}.${String(selectedDate.getMonth() + 1).padStart(2, '0')}.${selectedDate.getFullYear()}`
    : '';

  return (
    <>
      <div className={cn('relative', className)} ref={pickerRef}>
        <div
          ref={inputRef}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-11 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer flex items-center gap-2 hover:border-gray-400"
        >
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <span className={cn('flex-1 text-sm', displayValue ? 'text-gray-900' : 'text-gray-500')}>
            {displayValue || placeholder}
          </span>
        </div>
      </div>

      {isOpen && createPortal(
        <div
          className="date-picker-calendar-portal fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 w-80 animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            top: `${calendarPosition.top}px`,
            left: `${calendarPosition.left}px`
          }}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white/80 rounded-lg transition-colors"
                type="button"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div className="text-lg font-bold text-gray-900">
                {months[currentMonth]} {currentYear}
              </div>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white/80 rounded-lg transition-colors"
                type="button"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleToday}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-white/80 rounded-lg transition-colors"
                type="button"
              >
                Astăzi
              </button>
              {selectedDate && (
                <button
                  onClick={handleClear}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white/80 rounded-lg transition-colors"
                  type="button"
                >
                  Șterge
                </button>
              )}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            {/* Week days */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isTodayDay = isToday(day);
                const isSelectedDay = isSelected(day);

                return (
                  <button
                    key={day}
                    onClick={() => handleDateSelect(day)}
                    className={cn(
                      'aspect-square rounded-lg text-sm font-medium transition-all',
                      'hover:bg-blue-50 hover:text-blue-700',
                      isSelectedDay
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                        : 'text-gray-900',
                      isTodayDay && !isSelectedDay
                        ? 'bg-blue-100 text-blue-700 font-bold'
                        : ''
                    )}
                    type="button"
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

