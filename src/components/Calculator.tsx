import React, { useState } from 'react';
import { X, Delete, Equal, Plus, Minus, X as Multiply, Divide } from 'lucide-react';
import { motion } from 'motion/react';

interface CalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onUseResult?: (result: string) => void;
}

export const Calculator = ({ isOpen, onClose, onUseResult }: CalculatorProps) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  if (!isOpen) return null;

  const handleNumber = (num: string) => {
    if (display === '0' || isFinished) {
      setDisplay(num);
      setIsFinished(false);
    } else {
      setDisplay(display + num);
    }
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
    setIsFinished(false);
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setIsFinished(false);
  };

  const handleEqual = () => {
    try {
      const fullEquation = equation + display;
      // Using Function constructor as a simple way to evaluate basic math strings
      // In a production app, a safer parser would be better
      const result = Function('"use strict";return (' + fullEquation + ')')();
      setDisplay(String(result));
      setEquation('');
      setIsFinished(true);
    } catch (e) {
      setDisplay('Error');
      setEquation('');
    }
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const buttons = [
    { label: 'C', action: handleClear, color: 'text-red-500' },
    { label: '⌫', action: handleBackspace, color: 'text-blue-500', icon: <Delete className="w-5 h-5" /> },
    { label: '/', action: () => handleOperator('/'), color: 'text-blue-500', icon: <Divide className="w-5 h-5" /> },
    { label: '*', action: () => handleOperator('*'), color: 'text-blue-500', icon: <Multiply className="w-5 h-5" /> },
    { label: '7', action: () => handleNumber('7') },
    { label: '8', action: () => handleNumber('8') },
    { label: '9', action: () => handleNumber('9') },
    { label: '-', action: () => handleOperator('-'), color: 'text-blue-500', icon: <Minus className="w-5 h-5" /> },
    { label: '4', action: () => handleNumber('4') },
    { label: '5', action: () => handleNumber('5') },
    { label: '6', action: () => handleNumber('6') },
    { label: '+', action: () => handleOperator('+'), color: 'text-blue-500', icon: <Plus className="w-5 h-5" /> },
    { label: '1', action: () => handleNumber('1') },
    { label: '2', action: () => handleNumber('2') },
    { label: '3', action: () => handleNumber('3') },
    { label: '=', action: handleEqual, color: 'bg-blue-600 text-white', rowSpan: 2, icon: <Equal className="w-5 h-5" /> },
    { label: '0', action: () => handleNumber('0'), colSpan: 2 },
    { label: '.', action: () => handleNumber('.') },
  ];

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl border-t border-gray-100 max-w-md mx-auto"
    >
      <div className="p-4 flex items-center justify-between border-b border-gray-50">
        <h3 className="font-bold text-gray-900">Quick Calc</h3>
        <button onClick={onClose} className="p-2 text-gray-400">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="p-6">
        <div className="bg-gray-50 p-6 rounded-2xl mb-6 text-right">
          <div className="text-xs text-gray-400 h-4 mb-1 font-mono">{equation}</div>
          <div className="text-4xl font-black text-gray-900 font-mono truncate">{display}</div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {buttons.map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              className={`
                h-16 flex items-center justify-center rounded-2xl font-bold text-xl transition-all active:scale-90
                ${btn.color || 'bg-gray-100 text-gray-900'}
                ${btn.colSpan === 2 ? 'col-span-2' : ''}
                ${btn.rowSpan === 2 ? 'h-full row-span-2' : ''}
              `}
            >
              {btn.icon || btn.label}
            </button>
          ))}
        </div>

        {onUseResult && (
          <button
            onClick={() => onUseResult(display)}
            className="w-full mt-6 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            Use Result
          </button>
        )}
      </div>
    </motion.div>
  );
};
