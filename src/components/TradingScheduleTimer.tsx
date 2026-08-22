import React, { useState, useEffect } from 'react';
import { Clock, PlayCircle, PauseCircle, CalendarOff } from 'lucide-react';
import { motion } from 'framer-motion';

export function TradingScheduleTimer() {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({ hours: 0, minutes: 0, seconds: 0 });
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED' | 'WEEKEND'>('ACTIVE');
  const [targetLabel, setTargetLabel] = useState('');

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      // Converter tempo local para UTC-3 (Horário de Brasília)
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const brTime = new Date(utc + (3600000 * -3));

      const day = brTime.getDay();
      const hour = brTime.getHours();

      let currentStatus: 'ACTIVE' | 'PAUSED' | 'WEEKEND' = 'ACTIVE';
      const targetDate = new Date(brTime);
      targetDate.setSeconds(0);
      targetDate.setMilliseconds(0);

      // Logica de status
      if (day === 5 && hour >= 17) {
        currentStatus = 'WEEKEND';
        targetDate.setDate(brTime.getDate() + 3); // Sexta -> Segunda
        targetDate.setHours(6, 0, 0);
      } else if (day === 6) {
        currentStatus = 'WEEKEND';
        targetDate.setDate(brTime.getDate() + 2); // Sabado -> Segunda
        targetDate.setHours(6, 0, 0);
      } else if (day === 0) {
        currentStatus = 'WEEKEND';
        targetDate.setDate(brTime.getDate() + 1); // Domingo -> Segunda
        targetDate.setHours(6, 0, 0);
      } else if (day === 1 && hour < 6) {
        currentStatus = 'WEEKEND';
        targetDate.setHours(6, 0, 0); // Segunda antes das 6
      } else if (hour >= 17) {
        currentStatus = 'PAUSED';
        targetDate.setDate(brTime.getDate() + 1); // Volta amanhã
        targetDate.setHours(6, 0, 0);
      } else if (hour < 6) {
        currentStatus = 'PAUSED';
        targetDate.setHours(6, 0, 0); // Volta hoje às 06h
      } else {
        currentStatus = 'ACTIVE';
        targetDate.setHours(17, 0, 0); // Fecha às 17h
      }

      setStatus(currentStatus);

      if (currentStatus === 'ACTIVE') {
        setTargetLabel('Mercado Ativo - Fechamento às 17:00 em:');
      } else if (currentStatus === 'PAUSED') {
        setTargetLabel('Mercado Fechado - Robô retoma às 06:00 em:');
      } else {
        setTargetLabel('Fim de Semana - Abertura (Seg 06:00) em:');
      }

      const diffMs = targetDate.getTime() - brTime.getTime();
      if (diffMs > 0) {
        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        const s = Math.floor((diffMs % 60000) / 1000);
        setTimeLeft({ hours: h, minutes: m, seconds: s });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (val: number) => val.toString().padStart(2, '0');

  const getStatusColor = () => {
    switch (status) {
      case 'ACTIVE': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'PAUSED': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'WEEKEND': return 'text-red-500 bg-red-500/10 border-red-500/20';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'ACTIVE': return <PlayCircle className="w-5 h-5 text-emerald-500" />;
      case 'PAUSED': return <PauseCircle className="w-5 h-5 text-amber-500" />;
      case 'WEEKEND': return <CalendarOff className="w-5 h-5 text-red-500" />;
    }
  };

  if (status === 'ACTIVE') {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl border ${getStatusColor()} backdrop-blur-sm shadow-lg mb-6`}
    >
      <div className="flex items-center space-x-3 mb-2 sm:mb-0">
        <div className="relative">
          {getStatusIcon()}
          {status === 'ACTIVE' && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider">{status === 'ACTIVE' ? 'Operando' : status === 'PAUSED' ? 'Pausa Diária' : 'Fim de Semana'}</h3>
          <p className="text-xs opacity-80">{targetLabel}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 font-mono text-xl tracking-tight">
        <Clock className="w-4 h-4 opacity-50 mr-1" />
        <span className="bg-black/20 px-2 py-1 rounded-lg backdrop-blur-md font-bold">{formatTime(timeLeft.hours)}</span>
        <span className="opacity-50">:</span>
        <span className="bg-black/20 px-2 py-1 rounded-lg backdrop-blur-md font-bold">{formatTime(timeLeft.minutes)}</span>
        <span className="opacity-50">:</span>
        <span className="bg-black/20 px-2 py-1 rounded-lg backdrop-blur-md font-bold w-10 text-center">{formatTime(timeLeft.seconds)}</span>
      </div>
    </motion.div>
  );
}
