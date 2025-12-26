class AudioService {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private currentVolume: number = 0.5;
  
  // Timing state for pulse loop
  private pulseTimerId: number | null = null;
  private nextPulseStartTime: number = 0;

  // Track currently playing nodes for manual stop
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

  // Create the oscillator graph for a single note
  private createVoice(frequency: number): { oscillators: OscillatorNode[], gain: GainNode } {
    const ctx = this.audioContext!;
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const oscMixGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const noteGain = ctx.createGain();

    // Fundamental
    osc1.type = 'sawtooth';
    osc1.frequency.value = frequency;
    osc1.detune.value = 0;

    // Unison
    osc2.type = 'sawtooth';
    osc2.frequency.value = frequency;
    osc2.detune.value = 0; 

    // Square sub-harmonics/body
    osc3.type = 'square';
    osc3.frequency.value = frequency;
    osc3.detune.value = 0; 

    oscMixGain.gain.value = 0.2; 

    filter.type = 'lowpass';
    filter.frequency.value = 2000; 
    filter.Q.value = 0.5;

    osc1.connect(oscMixGain);
    osc2.connect(oscMixGain);
    osc3.connect(oscMixGain);

    oscMixGain.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(this.masterGainNode!);

    return { oscillators: [osc1, osc2, osc3], gain: noteGain };
  }

  // Play a single note for a fixed duration (Sequence/Preview)
  public async playOneShot(frequency: number, duration: number) {
    this.initContext();
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }

    const ctx = this.audioContext!;
    const now = ctx.currentTime;
    const { oscillators, gain } = this.createVoice(frequency);

    // Envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1.0, now + 0.05); // Attack
    gain.gain.setValueAtTime(1.0, now + duration - 0.05); // Sustain
    gain.gain.linearRampToValueAtTime(0, now + duration); // Release

    oscillators.forEach(osc => osc.start(now));
    oscillators.forEach(osc => osc.stop(now + duration + 0.1));

    // Cleanup logic is handled by the graph disconnection naturally after stop
    setTimeout(() => {
      gain.disconnect();
    }, (duration + 0.2) * 1000);
  }

  // Play a tone that loops or pulses indefinitely until stopTone is called
  public async playTone(frequency: number, pulseDuration: number) {
    this.initContext();

    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }

    const ctx = this.audioContext!;
    
    // Stop previous loop and nodes
    this.stopTone(true);

    const { oscillators, gain } = this.createVoice(frequency);
    const now = ctx.currentTime;

    oscillators.forEach(osc => osc.start(now));

    this.currentNodes = { oscillators, gain };

    // Initialize Tone
    if (pulseDuration === 0) {
      // Continuous Tone
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1.0, now + 0.1);
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
    
    const gapDuration = 0.5; 
    const fadeTime = 0.1;    
    
    const startTime = Math.max(this.nextPulseStartTime, ctx.currentTime);
    const midTime = startTime + (activeDuration / 2);
    const endTime = startTime + activeDuration;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + fadeTime);
    gain.gain.linearRampToValueAtTime(1.0, midTime);
    gain.gain.linearRampToValueAtTime(0.0, endTime);

    const cycleDuration = activeDuration + gapDuration;
    this.nextPulseStartTime = startTime + cycleDuration;
    
    const delay = (this.nextPulseStartTime - ctx.currentTime) * 1000 - 100;
    
    this.pulseTimerId = window.setTimeout(() => {
      this.schedulePulseLoop(activeDuration);
    }, Math.max(delay, 10)); 
  }

  public stopTone(immediate = false) {
    if (this.pulseTimerId) {
        window.clearTimeout(this.pulseTimerId);
        this.pulseTimerId = null;
    }

    if (!this.audioContext || !this.currentNodes) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const { gain, oscillators } = this.currentNodes;

    gain.gain.cancelScheduledValues(now);
    
    gain.gain.setValueAtTime(gain.gain.value, now);
    const fadeDuration = immediate ? 0.05 : 0.2;
    gain.gain.linearRampToValueAtTime(0, now + fadeDuration);

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