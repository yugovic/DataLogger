import React, { useState } from 'react';

interface NumericKeypadProps {
  value?: number;
  onSubmit: (value: number) => void;
  onClose: () => void;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({ value = 0, onSubmit, onClose }) => {
  const [input, setInput] = useState<string>(String(value));

  const append = (d: string) => setInput((prev) => (prev === '0' ? d : prev + d));
  const backspace = () => setInput((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  const clear = () => setInput('0');
  const plus5 = () => setInput((prev) => String((parseInt(prev) || 0) + 5));
  const minus5 = () => setInput((prev) => String(Math.max(0, (parseInt(prev) || 0) - 5)));

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end md:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl p-4 w-full max-w-xs shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="text-center text-gray-800 dark:text-gray-100 text-2xl font-mono mb-3">{input}</div>
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} className="py-3 bg-gray-100 dark:bg-gray-700 rounded text-xl" onClick={() => append(String(n))}>{n}</button>
          ))}
          <button className="py-3 bg-gray-100 dark:bg-gray-700 rounded text-xl" onClick={() => append('0')}>0</button>
          <button className="py-3 bg-gray-100 dark:bg-gray-700 rounded text-xl" onClick={backspace}>⌫</button>
          <button className="py-3 bg-gray-100 dark:bg-gray-700 rounded text-xl" onClick={clear}>CLR</button>
          <button className="py-3 bg-blue-100 dark:bg-blue-900/40 rounded text-base" onClick={plus5}>+5</button>
          <button className="py-3 bg-red-100 dark:bg-red-900/40 rounded text-base" onClick={minus5}>-5</button>
          <button className="py-3 bg-green-500 text-white rounded text-base col-span-3" onClick={() => onSubmit(parseInt(input) || 0)}>OK</button>
        </div>
      </div>
    </div>
  );
};

export default NumericKeypad;

