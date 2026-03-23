'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ExpEvent {
  type: string;
  points: number;
  label: string;
}

interface PopupItem {
  id: number;
  label: string;
  points: number;
  isNegative: boolean;
}

let popupIdCounter = 0;

export default function ExpPopup({ events }: { events: ExpEvent[] }) {
  const [popups, setPopups] = useState<PopupItem[]>([]);

  const addPopup = useCallback((label: string, points: number) => {
    const id = ++popupIdCounter;
    const isNegative = points < 0;
    setPopups(prev => [...prev, { id, label, points, isNegative }]);
    // Remove after animation completes
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id));
    }, 1500);
  }, []);

  useEffect(() => {
    if (events.length === 0) return;
    // Stagger popups by 200ms each
    events.forEach((event, i) => {
      setTimeout(() => {
        const sign = event.points >= 0 ? '+' : '';
        addPopup(`${event.label} ${sign}${event.points}`, event.points);
      }, i * 200);
    });
  }, [events, addPopup]);

  if (popups.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 pointer-events-none flex flex-col-reverse gap-1">
      {popups.map((popup, index) => (
        <div
          key={popup.id}
          className="exp-popup-float"
          style={{
            animationDelay: '0ms',
            // Stack offset
            transform: `translateY(${-index * 4}px)`,
          }}
        >
          <span
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm ${
              popup.isNegative
                ? 'bg-red-500/80 text-white'
                : 'bg-gradient-to-r from-pink-500/90 to-purple-500/90 text-white'
            }`}
          >
            {popup.isNegative ? '💔' : '✨'} {popup.label}
          </span>
        </div>
      ))}

      <style jsx>{`
        @keyframes expPopupFloat {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }
          15% {
            opacity: 1;
            transform: translateY(0) scale(1.05);
          }
          25% {
            transform: translateY(0) scale(1);
          }
          70% {
            opacity: 1;
            transform: translateY(-10px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-30px) scale(0.9);
          }
        }
        .exp-popup-float {
          animation: expPopupFloat 1.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
