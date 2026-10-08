class AudioEngine {
    constructor() {
        this.ctx = null;
        this.nodes = {};
        this.masterLimiter = null;
        this.dcBlocker = null;
        this.initAudioContext();
    }

    initAudioContext() {
        const unlockAudio = () => {
            if (this.ctx) {
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume().then(() => {
                        if (this.ctx.state === 'running') {
                            removeListeners();
                        }
                    }).catch(() => {});
                } else if (this.ctx.state === 'running') {
                    removeListeners();
                }
            } else {
                this.getContext();
            }
        };

        const removeListeners = () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('mousedown', unlockAudio);
        };

        document.addEventListener('click', unlockAudio);
        document.addEventListener('keydown', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);
        document.addEventListener('mousedown', unlockAudio);
    }

    // מקור יחיד לסביבת השמע עבור כל המודולים באפליקציה
    getContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
            this.setupMasterProtection();
        }
        
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }

        return this.ctx;
    }

    setupMasterProtection() {
        if (!this.ctx) return;

        // 1. High-Pass Filter / DC Blocker (סינון רכיבי DC ותדרים מתחת ל-20Hz)
        this.dcBlocker = this.ctx.createBiquadFilter();
        this.dcBlocker.type = 'highpass';
        this.dcBlocker.frequency.setValueAtTime(20, this.ctx.currentTime);
        this.dcBlocker.Q.setValueAtTime(0.707, this.ctx.currentTime);

        // 2. Brickwall Limiter (הגנה מפני עומס יתר וקפיצות ווליום)
        this.masterLimiter = this.ctx.createDynamicsCompressor();
        this.masterLimiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
        this.masterLimiter.knee.setValueAtTime(0.0, this.ctx.currentTime);
        this.masterLimiter.ratio.setValueAtTime(20.0, this.ctx.currentTime);
        this.masterLimiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.masterLimiter.release.setValueAtTime(0.1, this.ctx.currentTime);

        // חיבור השרשרת ל-destination הסופי
        this.dcBlocker.connect(this.masterLimiter);
        this.masterLimiter.connect(this.ctx.destination);
    }

    getMasterInput() {
        this.getContext();
        return this.dcBlocker;
    }

    async resume() {
        const ctx = this.getContext();
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
        return ctx;
    }
}

window.audioEngine = new AudioEngine();