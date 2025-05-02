import React from 'react';

interface ActivityCalendarProps {
  activityData: {[date: string]: number};
  colorMode?: 'green' | 'blue' | 'purple'; // Позволяет менять цветовую схему календаря
  title?: string;
}

const ActivityCalendar: React.FC<ActivityCalendarProps> = ({ 
  activityData, 
  colorMode = 'green',
  title = 'Your activity calendar'
}) => {
  // Генерируем календарную сетку только для текущего месяца
  const generateCalendarData = () => {
    // Правильно получаем текущую дату (без времени)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Первый день текущего месяца
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    // Последний день текущего месяца
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    
    const monthsLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthLabel = monthsLabels[currentMonth];
    
    // Формируем правильно отформатированную текущую дату для сравнения
    const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Создаем массив с днями текущего месяца
    const days = [];
    for (let d = new Date(firstDayOfMonth); d <= lastDayOfMonth; d.setDate(d.getDate() + 1)) {
      // Создаем корректную строку даты в формате YYYY-MM-DD
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const count = activityData[dateStr] || 0;
      
      // Вычисляем интенсивность цвета на основе количества задач
      let intensity = 0;
      if (count > 0) {
        intensity = count === 1 ? 1 : count < 3 ? 2 : count < 5 ? 3 : 4;
      }
      
      // Преобразуем день недели: 0 (воскресенье) -> 6, 1-6 -> 0-5
      const adjustedDayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
      
      days.push({
        date: new Date(d),
        dateString: dateStr,
        count,
        intensity,
        dayOfMonth: d.getDate(),
        dayOfWeek: adjustedDayOfWeek,
        isToday: dateStr === todayStr
      });
    }
    
    // Организуем дни по неделям для отображения в календарной сетке
    const weeks = [];
    let currentWeek = [];
    
    // Добавляем пустые ячейки для дней перед первым днем месяца
    // Преобразуем для начала недели с понедельника
    const firstDayOfWeekIndex = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
    for (let i = 0; i < firstDayOfWeekIndex; i++) {
      currentWeek.push(null);
    }
    
    // Добавляем дни в недели
    days.forEach(day => {
      currentWeek.push(day);
      
      // Если это последний день недели (воскресенье, которое теперь 6), начинаем новую неделю
      if (day.dayOfWeek === 6) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });
    
    // Если остались дни в последней неделе, добавляем их
    if (currentWeek.length > 0) {
      // Добавляем пустые ячейки в конец последней недели
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
    
    return { monthLabel, weeks, today };
  };
  
  const { monthLabel, weeks } = generateCalendarData();
  
  // Функция для определения цвета ячейки в зависимости от интенсивности и выбранной цветовой схемы
  const getCellColor = (intensity: number) => {
    if (colorMode === 'blue') {
      switch(intensity) {
        case 0: return 'bg-gray-100'; // Нет активности
        case 1: return 'bg-blue-200'; // Низкая активность
        case 2: return 'bg-blue-300'; // Средняя активность
        case 3: return 'bg-blue-500'; // Высокая активность
        case 4: return 'bg-blue-700'; // Очень высокая активность
        default: return 'bg-gray-100';
      }
    } else if (colorMode === 'purple') {
      switch(intensity) {
        case 0: return 'bg-gray-100'; // Нет активности
        case 1: return 'bg-purple-200'; // Низкая активность
        case 2: return 'bg-purple-300'; // Средняя активность
        case 3: return 'bg-purple-500'; // Высокая активность
        case 4: return 'bg-purple-700'; // Очень высокая активность
        default: return 'bg-gray-100';
      }
    } else {
      // По умолчанию используем зеленый
      switch(intensity) {
        case 0: return 'bg-gray-100'; // Нет активности
        case 1: return 'bg-green-200'; // Низкая активность
        case 2: return 'bg-green-300'; // Средняя активность
        case 3: return 'bg-green-500'; // Высокая активность
        case 4: return 'bg-green-700'; // Очень высокая активность
        default: return 'bg-gray-100';
      }
    }
  };

  // Получаем цвет для легенды в зависимости от выбранной цветовой схемы
  const getColorClass = (level: number) => {
    const baseColor = colorMode === 'blue' ? 'bg-blue' : 
                      colorMode === 'purple' ? 'bg-purple' : 'bg-green';
    
    switch(level) {
      case 0: return 'bg-gray-100';
      case 1: return `${baseColor}-200`;
      case 2: return `${baseColor}-300`;
      case 3: return `${baseColor}-500`;
      case 4: return `${baseColor}-700`;
      default: return 'bg-gray-100';
    }
  };
  
  return (
    <div className="py-3">
      {/* Заголовок месяца */}
      <div className="text-center font-medium text-gray-700 mb-2">
        {title && <div className="text-sm text-gray-500 mb-1">{title}</div>}
        {monthLabel}
      </div>
      
      {/* Календарная сетка */}
      <div className="w-full max-w-sm mx-auto">
        {/* Дни недели */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          <div className="text-xs text-center text-gray-500">Mo</div>
          <div className="text-xs text-center text-gray-500">Tu</div>
          <div className="text-xs text-center text-gray-500">We</div>
          <div className="text-xs text-center text-gray-500">Th</div>
          <div className="text-xs text-center text-gray-500">Fr</div>
          <div className="text-xs text-center text-gray-500">Sa</div>
          <div className="text-xs text-center text-gray-500">Su</div>
        </div>
        
        {/* Недели */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1 mb-1">
            {week.map((day, dayIndex) => (
              <div 
                key={`${weekIndex}-${dayIndex}`} 
                className={`h-6 w-6 flex items-center justify-center rounded-sm ${
                  day ? getCellColor(day.intensity) : 'bg-gray-50'
                } ${day?.isToday ? 'ring-2 ring-blue-500' : ''}`}
                title={day ? `${day.dateString}: ${day.count} activities` : ''}
              >
                {day && (
                  <span className={`text-xs font-semibold ${day.intensity > 2 ? 'text-white' : 'text-gray-800'}`}>
                    {day.dayOfMonth}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      {/* Легенда */}
      <div className="flex items-center justify-center mt-3 text-xs text-gray-500">
        <span className="mr-2">Less</span>
        <div className={`h-3 w-3 rounded-sm ${getColorClass(0)}`}></div>
        <div className={`h-3 w-3 rounded-sm mx-1 ${getColorClass(1)}`}></div>
        <div className={`h-3 w-3 rounded-sm mx-1 ${getColorClass(2)}`}></div>
        <div className={`h-3 w-3 rounded-sm mx-1 ${getColorClass(3)}`}></div>
        <div className={`h-3 w-3 rounded-sm ${getColorClass(4)}`}></div>
        <span className="ml-2">More</span>
      </div>
    </div>
  );
};

export default ActivityCalendar;