import { useEffect, useMemo, useState } from "react";
import { useMarket } from "../contexts/MarketContext";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getKoreanToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function toDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function NewsCalendar({ selectedDate, onSelectDate }) {
  const { monthlyCount, fetchMonthlyCount } = useMarket();
  const today = getKoreanToday();
  const initialDate = selectedDate || today;
  const [viewYear, setViewYear] = useState(() => Number(initialDate.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(initialDate.slice(5, 7)));

  useEffect(() => {
    if (!selectedDate) return;
    setViewYear(Number(selectedDate.slice(0, 4)));
    setViewMonth(Number(selectedDate.slice(5, 7)));
  }, [selectedDate]);

  useEffect(() => {
    fetchMonthlyCount(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();
    const lastDay = new Date(viewYear, viewMonth, 0).getDate();
    const blanks = Array.from({ length: firstWeekday }, (_, index) => ({
      type: "empty",
      key: `empty-${index}`,
    }));
    const days = Array.from({ length: lastDay }, (_, index) => ({
      type: "day",
      day: index + 1,
      key: toDateKey(viewYear, viewMonth, index + 1),
    }));

    return [...blanks, ...days];
  }, [viewYear, viewMonth]);

  const moveMonth = (delta) => {
    const next = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth() + 1);
  };

  return (
    <section className="news-calendar-card" aria-label="보안 뉴스 달력">
      <div className="news-calendar-nav">
        <button type="button" onClick={() => moveMonth(-1)} aria-label="이전달">
          ←
        </button>
        <div className="news-calendar-title">
          {viewYear}년 {viewMonth}월
        </div>
        <button type="button" onClick={() => moveMonth(1)} aria-label="다음달">
          →
        </button>
      </div>

      <div className="news-calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="news-calendar-grid">
        {calendarCells.map((cell) => {
          if (cell.type === "empty") {
            return <div key={cell.key} className="news-cal-cell empty" aria-hidden="true" />;
          }

          const dateKey = cell.key;
          const count = monthlyCount[dateKey] || 0;
          const className = [
            "news-cal-cell",
            dateKey === today ? "today" : "",
            dateKey === selectedDate ? "selected" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={dateKey}
              type="button"
              className={className}
              onClick={() => onSelectDate(dateKey)}
              aria-pressed={dateKey === selectedDate}
              aria-label={`${dateKey} 보안뉴스 ${count}건`}
            >
              <span className="news-cal-day">{cell.day}</span>
              {count > 0 && (
                <span className="news-cal-badge badge-news">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}