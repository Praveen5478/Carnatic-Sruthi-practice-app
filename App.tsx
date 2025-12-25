import React, { useState, useEffect } from 'react';
import { SRUTHIS, SWARAS, PULSE_OPTIONS, Sruthi, Swara } from './constants';
import { audioService } from './services/audioService';
import { SwaraButton } from './components/SwaraButton';

const App: React.FC = () => {
  // Default to C (Kattai 1)
  const [selectedSruthi, setSelectedSruthi] = useState<Sruthi>(SRUTHIS[0]);
  const [activeSwaraId, setActiveSwaraId] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0.5);
  const [pulseDuration, setPulseDuration] = useState<number>(3); // Default 3 seconds

  // Handle Sruthi Change
  const handleSruthiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sruthi = SRUTHIS.find(s => s.kattai === e.target.value);
    if (sruthi) {
      setSelectedSruthi(sruthi);
      // If a note is active, restart it with new Pitch + current Duration
      if (activeSwaraId) {
        const currentSwara = SWARAS.find(s => s.id === activeSwaraId);
        if (currentSwara) {
            playSwara(currentSwara, sruthi, pulseDuration);
        }
      }
    }
  };

  // Handle Pulse Duration Change
  const handleDurationChange = (duration: number) => {
    setPulseDuration(duration);
    // If a note is active, restart it with current Pitch + new Duration
    if (activeSwaraId) {
      const currentSwara = SWARAS.find(s => s.id === activeSwaraId);
      if (currentSwara) {
          playSwara(currentSwara, selectedSruthi, duration);
      }
    }
  };

  // Handle Volume Change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    audioService.setVolume(newVol);
  };

  // Calculate Frequency: Base * 2^(n/12)
  const calculateFrequency = (baseFreq: number, semitones: number) => {
    return baseFreq * Math.pow(2, semitones / 12);
  };

  // Play Logic
  const playSwara = (swara: Swara, currentSruthi: Sruthi, duration: number) => {
    const freq = calculateFrequency(currentSruthi.frequency, swara.semitones);
    audioService.playTone(freq, duration);
    setActiveSwaraId(swara.id);
  };

  // Click Handler for Swara Buttons
  const handleSwaraClick = (swara: Swara) => {
    // Toggle logic
    if (activeSwaraId === swara.id) {
       stopAudio();
    } else {
       playSwara(swara, selectedSruthi, pulseDuration);
    }
  };

  // Stop Logic
  const stopAudio = () => {
    audioService.stopTone();
    setActiveSwaraId(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    audioService.setVolume(volume);
    return () => {
      audioService.stopTone();
    };
  }, []);

  return (
    <div className="h-[100dvh] bg-slate-900 text-slate-100 p-4 flex flex-col items-center overflow-hidden selection:bg-indigo-500 selection:text-white">
      <div className="max-w-md w-full h-full flex flex-col gap-4">
        
        {/* Header Section */}
        <div className="text-center shrink-0 pt-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Sruthi Trainer
          </h1>
        </div>

        {/* Controls Section - Flexible Spacing */}
        <div className="bg-slate-800/40 p-5 rounded-3xl border border-slate-700 shadow-xl backdrop-blur-sm flex-1 flex flex-col justify-evenly min-h-0">
          
          {/* Sruthi Selector */}
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
              Select Sruthi (Kattai)
            </span>
            <div className="relative">
              <select
                value={selectedSruthi.kattai}
                onChange={handleSruthiChange}
                className="w-full appearance-none bg-slate-900 border border-slate-600 rounded-xl py-3 px-4 text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                {SRUTHIS.map((s) => (
                  <option key={s.kattai} value={s.kattai}>
                    Kattai {s.kattai} &mdash; {s.note}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </label>

          {/* Pulse Duration Selector */}
          <div className="flex flex-col gap-2">
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
               Pulse Duration
             </span>
             <div className="flex bg-slate-900 p-1 rounded-xl">
               {PULSE_OPTIONS.map((dur) => (
                 <button
                   key={dur}
                   onClick={() => handleDurationChange(dur)}
                   className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center ${
                     pulseDuration === dur
                       ? 'bg-slate-700 text-indigo-400 shadow-sm'
                       : 'text-slate-500 hover:text-slate-300'
                   }`}
                   title={dur === 0 ? "Infinite (No Pulse)" : `${dur} Seconds`}
                 >
                   {dur === 0 ? <span className="text-lg leading-none">&infin;</span> : `${dur}s`}
                 </button>
               ))}
             </div>
          </div>

          {/* Volume Slider */}
          <label className="flex flex-col gap-2">
             <div className="flex justify-between items-center ml-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Master Volume
                </span>
                <span className="text-[10px] font-mono text-slate-500">{Math.round(volume * 100)}%</span>
             </div>
             <input 
               type="range" 
               min="0" 
               max="1" 
               step="0.01" 
               value={volume}
               onChange={handleVolumeChange}
               className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
             />
          </label>

          {/* Stop Button */}
          <button
            onClick={stopAudio}
            className={`
              w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md
              ${activeSwaraId 
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20 hover:shadow-rose-500/40' 
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'}
            `}
            disabled={!activeSwaraId}
          >
            Stop Sound
          </button>
        </div>

        {/* Keyboard Interface - Compact 3 Row Layout */}
        <div className="shrink-0 flex flex-col gap-3 pb-2">
           {/* Row 1: Sa, Ri, Ga */}
           <div className="grid grid-cols-3 gap-3">
             {SWARAS.slice(0, 3).map((swara) => (
               <SwaraButton
                 key={swara.id}
                 swara={swara}
                 isActive={activeSwaraId === swara.id}
                 onClick={handleSwaraClick}
               />
             ))}
           </div>

           {/* Row 2: Ma, Pa, Da */}
           <div className="grid grid-cols-3 gap-3">
             {SWARAS.slice(3, 6).map((swara) => (
               <SwaraButton
                 key={swara.id}
                 swara={swara}
                 isActive={activeSwaraId === swara.id}
                 onClick={handleSwaraClick}
               />
             ))}
           </div>

           {/* Row 3: Ni, High Sa (Centered) */}
           <div className="grid grid-cols-3 gap-3">
             {/* Center Ni and High Sa using col offsets or flex */}
             {/* Using grid placement to keep sizing consistent with above buttons */}
             <div className="col-start-1">
                <SwaraButton
                  swara={SWARAS[6]} // Ni
                  isActive={activeSwaraId === SWARAS[6].id}
                  onClick={handleSwaraClick}
                />
             </div>
             <div className="col-start-2">
                <SwaraButton
                  swara={SWARAS[7]} // High Sa
                  isActive={activeSwaraId === SWARAS[7].id}
                  onClick={handleSwaraClick}
                />
             </div>
             {/* Empty 3rd col - Frequency Display */}
             <div className="col-start-3 flex flex-col justify-center items-center text-[10px] text-slate-600 font-mono opacity-50">
               {activeSwaraId 
                  ? calculateFrequency(
                      selectedSruthi.frequency, 
                      SWARAS.find(s => s.id === activeSwaraId)?.semitones || 0
                    ).toFixed(1) + ' Hz'
                  : ''
               }
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;