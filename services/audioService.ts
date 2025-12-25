class AudioService {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private currentVolume: number = 0.5;
  
  // Timing state for pulse loop
  private pulseTimerId: number | null = null;
  private nextPulseStartTime: number = 0;

  // Track currently playing nodes
  private currentNodes: {
    oscillators: OscillatorNode[];
    gain: GainNode;
  } | null = null;

  private initContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.gain.value = this.currentVolume;
      this.masterGainNode.connect(this.audioContext.destination);
    }
  }

  public setVolume(volume: number) {
    this.currentVolume = volume;
    if (this.masterGainNode && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.masterGainNode.gain.cancelScheduledValues(now);
      this.masterGainNode.gain.setTargetAtTime(volume, now, 0.1);
    }
  }

  public async playTone(frequency: number, pulseDuration: number) {
    this.initContext();

    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }

    const ctx = this.audioContext!;
    
    // Stop previous loop and nodes
    this.stopTone(true);

    // Create Nodes for Sruthi Box Simulation
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const oscMixGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const noteGain = ctx.createGain();

    // 1. Oscillator Setup
    // ZERO DETUNE to eliminate all pitch wobble/beating
    
    // Fundamental Sawtooth (Body)
    osc1.type = 'sawtooth';
    osc1.frequency.value = frequency;
    osc1.detune.value = 0;

    // Second Sawtooth (Richness without wobble - just unison stacking for volume density)
    osc2.type = 'sawtooth';
    osc2.frequency.value = frequency;
    osc2.detune.value = 0; 

    // Square (Woody character)
    osc3.type = 'square';
    osc3.frequency.value = frequency;
    osc3.detune.value = 0; 

    // 2. Mix
    oscMixGain.gain.value = 0.2; 

    // 3. Filter (Warm lowpass to simulate wooden box)
    filter.type = 'lowpass';
    filter.frequency.value = 2000; 
    filter.Q.value = 0.5;

    // Connections
    osc1.connect(oscMixGain);
    osc2.connect(oscMixGain);
    osc3.connect(oscMixGain);

    oscMixGain.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(this.masterGainNode!);

    // Start Oscillators
    const now = ctx.currentTime;
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    this.currentNodes = {
      oscillators: [osc1, osc2, osc3],
      gain: noteGain
    };

    // Initialize Tone
    if (pulseDuration === 0) {
      // Continuous Tone (Infinite)
      // Smoothly fade in to full volume (1.0 relative to master)
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(1.0, now + 0.1);
      
      // Do NOT schedule pulse loop
    } else {
      // Pulsing Tone
      this.nextPulseStartTime = now;
      this.schedulePulseLoop(pulseDuration);
    }
  }

  private schedulePulseLoop(activeDuration: number) {
    if (!this.audioContext || !this.currentNodes) return;
    
    const ctx = this.audioContext;
    const { gain } = this.currentNodes;
    
    const gapDuration = 0.5; // Gap of silence
    const fadeTime = 0.1;    // Short fade in
    
    // Ensure we are scheduling in the future
    const startTime = Math.max(this.nextPulseStartTime, ctx.currentTime);
    const midTime = startTime + (activeDuration / 2);
    const endTime = startTime + activeDuration;

    // Envelope Shape: 
    // 0 -> 30% (Fast Attack) -> 100% (Slow Swell) -> 0% (Slow Decay)
    
    // 1. Start from Silence (Gap end)
    gain.gain.setValueAtTime(0, startTime);
    
    // 2. Fast ramp to 30% Base Volume (Entry)
    gain.gain.linearRampToValueAtTime(0.3, startTime + fadeTime);

    // 3. Gradual Swell to 100% Peak (Midpoint)
    gain.gain.linearRampToValueAtTime(1.0, midTime);

    // 4. Gradual Decay to 0% Silence (End)
    gain.gain.linearRampToValueAtTime(0.0, endTime);

    // Schedule next loop
    const cycleDuration = activeDuration + gapDuration;
    this.nextPulseStartTime = startTime + cycleDuration;
    
    // Calculate timeout delay
    const delay = (this.nextPulseStartTime - ctx.currentTime) * 1000 - 100;
    
    this.pulseTimerId = window.setTimeout(() => {
      this.schedulePulseLoop(activeDuration);
    }, Math.max(delay, 10)); 
  }

  public stopTone(immediate = false) {
    // Clear the loop timer
    if (this.pulseTimerId) {
        window.clearTimeout(this.pulseTimerId);
        this.pulseTimerId = null;
    }

    if (!this.audioContext || !this.currentNodes) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const { gain, oscillators } = this.currentNodes;

    // Cancel any future envelope ramps
    gain.gain.cancelScheduledValues(now);
    
    // Smooth fade out
    gain.gain.setValueAtTime(gain.gain.value, now);
    const fadeDuration = immediate ? 0.05 : 0.2;
    gain.gain.linearRampToValueAtTime(0, now + fadeDuration);

    const nodesToStop = this.currentNodes;
    this.currentNodes = null;

    setTimeout(() => {
      oscillators.forEach(osc => {
        try {
            osc.stop();
            osc.disconnect();
        } catch(e) {}
      });
      gain.disconnect();
    }, fadeDuration * 1000 + 50);
  }
}

export const audioService = new AudioService();