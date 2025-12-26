import React, { useState, useEffect, useRef } from 'react';
import { SRUTHIS, RAGAS, PULSE_OPTIONS, Sruthi, Swara, Raga } from './constants';
import { audioService } from './services/audioService';
import { SwaraButton } from './components/SwaraButton';

type Tab = 'trainer' | 'looper';

const App: React.FC = () => {
  // Global State
  const [activeTab, setActiveTab] = useState<Tab>('trainer');
  const [selectedSruthi, setSelectedSruthi] = useState<Sruthi>(SRUTHIS[0]);
  const [selectedRaga, setSelectedRaga] = useState<Raga>(RAGAS[0]); // Default Mayamalavagowla
  const [volume, setVolume] = useState<number>(0.5);

  // Install Prompt State
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Derived State
  const currentSwaras = selectedRaga.swaras;

  // Trainer Mode State
  const [activeSwaraId, setActiveSwaraId] = useState<string | null>(null);
  const [pulseDuration, setPulseDuration] = useState<number>(3);

  // Looper Mode State
  const [sequence, setSequence] = useState<Swara[]>([]);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [playbackIndex, setPlaybackIndex] = useState<number | null>(null);
  const sequenceScrollRef = useRef<HTMLDivElement>(null);

  // --- Install Prompt Listener ---
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    });
  };

  // --- Common Helpers ---

  const calculateFrequency = (baseFreq: number, semitones: number) => {
    return baseFreq * Math.pow(2, semitones / 12);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    audioService.setVolume(newVol);
  };

  const handleSruthiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sruthi = SRUTHIS.find(s => s.kattai === e.target.value);
    if (sruthi) {
      setSelectedSruthi(sruthi);
      // If trainer is playing, restart with new pitch
      if (activeTab === 'trainer' && activeSwaraId) {
        const currentSwara = currentSwaras.find(s => s.id === activeSwaraId);
        if (currentSwara) playSwaraTrainer(currentSwara, sruthi, pulseDuration);
      }
    }
  };

  const handleRagaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raga = RAGAS.find(r => r.name === e.target.value);
    if (raga) {
      setSelectedRaga(raga);
      // If trainer is playing, restart with new raga scale (pitch might change)
      if (activeTab === 'trainer' && activeSwaraId) {
        // Find the equivalent note in the new Raga (same ID, potentially different semitones)
        // setTimeout to allow state update or use the new raga object directly
        const newSwara = raga.swaras.find(s => s.id === activeSwaraId);
        if (newSwara) playSwaraTrainer(newSwara, selectedSruthi, pulseDuration);
      }
    }
  }

  // --- Trainer Logic ---

  const handleDurationChange = (duration: number) => {
    setPulseDuration(duration);
    if (activeSwaraId) {
      const currentSwara = currentSwaras.find(s => s.id === activeSwaraId);
      if (currentSwara) playSwaraTrainer(currentSwara, selectedSruthi, duration);
    }
  };

  const playSwaraTrainer = (swara: Swara, currentSruthi: Sruthi, duration: number) => {
    const freq = calculateFrequency(currentSruthi.frequency, swara.semitones);
    audioService.playTone(freq, duration);
    setActiveSwaraId(swara.id);
  };

  const stopTrainer = () => {
    audioService.stopTone();
    setActiveSwaraId(null);
  };

  // --- Looper Logic ---

  const addToSequence = (swara: Swara) => {
    setSequence(prev => [...prev, swara]);
    // Preview note short
    const freq = calculateFrequency(selectedSruthi.frequency, swara.semitones);
    audioService.playOneShot(freq, 0.5);
    
    // Auto scroll to bottom
    setTimeout(() => {
      if (sequenceScrollRef.current) {
        sequenceScrollRef.current.scrollTop = sequenceScrollRef.current.scrollHeight;
      }
    }, 10);
  };

  const removeFromSequence = () => {
    setSequence(prev => prev.slice(0, -1));
  };

  const clearSequence = () => {
    setSequence([]);
    stopLoop();
  };

  const toggleLoop = () => {
    if (isLooping) {
      stopLoop();
    } else {
      if (sequence.length === 0) return;
      setIsLooping(true);
      // setPlaybackIndex(0); // Removed to allow useEffect to handle initial play
    }
  };

  const stopLoop = () => {
    setIsLooping(false);
    setPlaybackIndex(null);
    audioService.stopTone(); // Ensure silence
  };

  // Loop Timer Effect
  useEffect(() => {
    let interval: number;

    if (isLooping && sequence.length > 0) {
      // Play first note immediately
      const playCurrent = (index: number) => {
        const swara = sequence[index];
        const freq = calculateFrequency(selectedSruthi.frequency, swara.semitones);
        // Play for 1s (Pulse duration logic removed, fixed 1s)
        audioService.playOneShot(freq, 1.0); 
      };

      // Initial play
      if (playbackIndex === null) {
          setPlaybackIndex(0);
          playCurrent(0);
      }

      interval = window.setInterval(() => {
        setPlaybackIndex(prev => {
          if (prev === null) return 0;
          const next = (prev + 1) % sequence.length;
          playCurrent(next);
          return next;
        });
      }, 1000); // Fixed 1 second interval
    }

    return () => {
      window.clearInterval(interval);
    };
  }, [isLooping, sequence, selectedSruthi]); // Removed playbackIndex dependency to avoid re-creating interval on every tick

  // Scroll to active note during playback
  useEffect(() => {
    if (playbackIndex !== null && sequenceScrollRef.current) {
      const child = sequenceScrollRef.current.children[playbackIndex] as HTMLElement;
      if (child) {
        const container = sequenceScrollRef.current;
        // Calculate position to center the active note vertically
        const childTop = child.offsetTop;
        const containerTop = container.offsetTop;
        
        container.scrollTo({
            top: childTop - containerTop - (container.clientHeight / 2) + (child.clientHeight / 2),
            behavior: 'smooth' 
        });
      }
    }
  }, [playbackIndex]);

  // Handle Tab Switch (Cleanup)
  useEffect(() => {
    stopTrainer();
    stopLoop();
  }, [activeTab]);

  // Initial Volume
  useEffect(() => {
    audioService.setVolume(volume);
  }, []);


  // --- Combined Input Handler ---
  const handleSwaraClick = (swara: Swara) => {
    if (activeTab === 'trainer') {
      if (activeSwaraId === swara.id) {
        stopTrainer();
      } else {
        playSwaraTrainer(swara, selectedSruthi, pulseDuration);
      }
    } else {
      // Looper Mode
      addToSequence(swara);
    }
  };

  const isSwaraActive = (swara: Swara) => {
    if (activeTab === 'trainer') {
      return activeSwaraId === swara.id;
    } else {
      // Highlight if currently playing in loop
      if (playbackIndex !== null && sequence[playbackIndex]) {
        return sequence[playbackIndex].id === swara.id;
      }
      return false;
    }
  };

  // Helper for Raga Dropdown
  const RagaDropdown = () => (
    <div className="relative w-full">
      <select
        value={selectedRaga.name}
        onChange={handleRagaChange}
        className="w-full appearance-none bg-slate-900 border border-slate-600 rounded-xl py-3 px-4 text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-10"
      >
        {RAGAS.map((r) => (
          <option key={r.name} value={r.name}>
            {r.name}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] bg-slate-900 text-slate-100 p-4 flex flex-col items-center overflow-hidden selection:bg-indigo-500 selection:text-white">
      <div className="max-w-md w-full h-full flex flex-col gap-4">
        
        {/* Header & Tabs */}
        <div className="shrink-0 flex flex-col gap-3 pt-2">
           <div className="flex items-center justify-center relative">
             <h1 className="text-xl font-bold text-center bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Sruthi Trainer
             </h1>
             {installPrompt && (
               <button
                 onClick={handleInstallClick}
                 className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:text-white bg-slate-800 hover:bg-indigo-600 rounded-full transition-all shadow-lg animate-pulse"
                 title="Install App"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                 </svg>
               </button>
             )}
           </div>
          
          <div className="flex bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('trainer')}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'trainer' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Trainer
            </button>
            <button
              onClick={() => setActiveTab('looper')}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'looper' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Looper
            </button>
          </div>
        </div>

        {/* Dynamic Controls Section */}
        <div className="bg-slate-800/40 p-5 rounded-3xl border border-slate-700 shadow-xl backdrop-blur-sm flex-1 flex flex-col justify-evenly min-h-0 relative">
          
          {/* TRAINER CONTROLS */}
          {activeTab === 'trainer' && (
            <>
              {/* Controls Row: Sruthi & Raga */}
              <div className="flex gap-3">
                {/* Sruthi Selector (Left) */}
                <label className="flex-1 flex flex-col gap-2 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 truncate">
                    Sruthi (Kattai)
                    </span>
                    <div className="relative">
                    <select
                        value={selectedSruthi.kattai}
                        onChange={handleSruthiChange}
                        className="w-full appearance-none bg-slate-900 border border-slate-600 rounded-xl py-3 px-4 text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-8"
                    >
                        {SRUTHIS.map((s) => (
                        <option key={s.kattai} value={s.kattai}>
                            {s.kattai} ({s.note})
                        </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    </div>
                </label>

                {/* Raga Selector (Right) */}
                <label className="flex-[1.5] flex flex-col gap-2 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 truncate">
                    Raga
                    </span>
                    <RagaDropdown />
                </label>
              </div>

              {/* Pulse Duration */}
              <div className="flex flex-col gap-2">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                   Pulse Duration
                 </span>
                 <div className="flex bg-slate-900 p-1 rounded-xl">
                   {PULSE_OPTIONS.map((dur) => (
                     <button
                       key={dur}
                       onClick={() => handleDurationChange(dur)}
                       className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                         pulseDuration === dur
                           ? 'bg-slate-700 text-indigo-400 shadow-sm'
                           : 'text-slate-500 hover:text-slate-300'
                       }`}
                     >
                       {dur === 0 ? <span className="text-lg leading-none">&infin;</span> : `${dur}s`}
                     </button>
                   ))}
                 </div>
              </div>

              {/* Volume */}
              <label className="flex flex-col gap-2">
                 <div className="flex justify-between items-center ml-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Master Volume</span>
                    <span className="text-[10px] font-mono text-slate-500">{Math.round(volume * 100)}%</span>
                 </div>
                 <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"/>
              </label>

              {/* Stop Button */}
              <button
                onClick={stopTrainer}
                disabled={!activeSwaraId}
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md ${activeSwaraId ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
              >
                Stop Sound
              </button>
            </>
          )}

          {/* LOOPER CONTROLS */}
          {activeTab === 'looper' && (
            <>
               <div className="flex justify-between items-end mb-2">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Sequence ({sequence.length})</span>
                  <div className="flex gap-2 w-2/3 justify-end">
                    {/* Compact Raga Select */}
                    <div className="relative flex-1 min-w-[100px]">
                        <select
                        value={selectedRaga.name}
                        onChange={handleRagaChange}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg py-1 px-2 text-xs text-slate-300 focus:outline-none appearance-none"
                        >
                            {RAGAS.map((r) => (<option key={r.name} value={r.name}>{r.name}</option>))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none text-slate-400">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>

                    {/* Compact Sruthi Select */}
                    <div className="relative w-20 shrink-0">
                        <select
                        value={selectedSruthi.kattai}
                        onChange={handleSruthiChange}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg py-1 px-2 text-xs text-slate-300 focus:outline-none appearance-none"
                        >
                        {SRUTHIS.map((s) => (<option key={s.kattai} value={s.kattai}>{s.kattai}</option>))}
                        </select>
                         <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none text-slate-400">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                  </div>
               </div>

               {/* Sequence Display */}
               <div 
                 ref={sequenceScrollRef}
                 className="relative h-48 bg-slate-900 rounded-xl border border-slate-700 p-3 flex flex-wrap content-start gap-2 overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-slate-700"
               >
                 {sequence.length === 0 ? (
                   <span className="w-full text-center text-xs text-slate-600 italic mt-10">Tap keys below to add notes</span>
                 ) : (
                   sequence.map((swara, idx) => (
                     <div 
                        key={`${swara.id}-${idx}`}
                        className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-md font-bold text-xs transition-all ${
                          playbackIndex === idx 
                            ? 'bg-indigo-500 text-white scale-110 shadow-lg shadow-indigo-500/50 border border-indigo-300 z-10' 
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                     >
                       {swara.shortLabel}
                     </div>
                   ))
                 )}
               </div>

               {/* Edit Controls */}
               <div className="grid grid-cols-2 gap-3 mb-4">
                  <button 
                    onClick={removeFromSequence}
                    disabled={sequence.length === 0}
                    className="py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" /></svg>
                    Backspace
                  </button>
                  <button 
                    onClick={clearSequence}
                    disabled={sequence.length === 0}
                    className="py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-rose-300 text-xs font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear All
                  </button>
               </div>

               {/* Play/Stop Loop */}
               <button
                 onClick={toggleLoop}
                 disabled={sequence.length === 0}
                 className={`
                    w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2
                    ${isLooping 
                      ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20 animate-pulse' 
                      : sequence.length > 0 ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
                 `}
               >
                 {isLooping ? (
                   <>
                     <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                     Stop Loop
                   </>
                 ) : (
                   <>
                     <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                     Play Loop
                   </>
                 )}
               </button>
               
               {/* Volume (Compact) */}
               <div className="mt-4 flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Vol</span>
                  <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"/>
               </div>
            </>
          )}

        </div>

        {/* Keyboard Interface - Compact 3 Row Layout */}
        <div className="shrink-0 flex flex-col gap-3 pb-2">
           {/* Row 1: Sa, Ri, Ga */}
           <div className="grid grid-cols-3 gap-3">
             {currentSwaras.slice(0, 3).map((swara) => (
               <SwaraButton
                 key={swara.id}
                 swara={swara}
                 isActive={isSwaraActive(swara)}
                 onClick={handleSwaraClick}
               />
             ))}
           </div>

           {/* Row 2: Ma, Pa, Da */}
           <div className="grid grid-cols-3 gap-3">
             {currentSwaras.slice(3, 6).map((swara) => (
               <SwaraButton
                 key={swara.id}
                 swara={swara}
                 isActive={isSwaraActive(swara)}
                 onClick={handleSwaraClick}
               />
             ))}
           </div>

           {/* Row 3: Ni, High Sa (Centered) */}
           <div className="grid grid-cols-3 gap-3">
             <div className="col-start-1">
                <SwaraButton
                  swara={currentSwaras[6]} // Ni
                  isActive={isSwaraActive(currentSwaras[6])}
                  onClick={handleSwaraClick}
                />
             </div>
             <div className="col-start-2">
                <SwaraButton
                  swara={currentSwaras[7]} // High Sa
                  isActive={isSwaraActive(currentSwaras[7])}
                  onClick={handleSwaraClick}
                />
             </div>
             {/* Empty 3rd col - Frequency Display */}
             <div className="col-start-3 flex flex-col justify-center items-center text-[10px] text-slate-600 font-mono opacity-50">
               {((activeTab === 'trainer' && activeSwaraId) || (activeTab === 'looper' && playbackIndex !== null && sequence[playbackIndex]))
                  ? calculateFrequency(
                      selectedSruthi.frequency, 
                      // If it's the active swara, use its current semitones. If it's a sequence note, use the stored semitones.
                      activeTab === 'trainer' && activeSwaraId 
                        ? (currentSwaras.find(s => s.id === activeSwaraId)?.semitones || 0)
                        : (sequence[playbackIndex!]?.semitones || 0)
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