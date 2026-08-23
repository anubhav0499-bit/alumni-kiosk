// --- Voice Module: Speech Synthesis + Speech Recognition ---

const Voice = (() => {
  let recognition = null;
  let isListening = false;
  let bestVoice = null;

  function findBestVoice() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const enVoices = voices.filter(v => v.lang.startsWith('en'));
    if (!enVoices.length) return voices[0];
    const inVoices = enVoices.filter(v => v.lang === 'en-IN');

    // Tier 1: Indian English neural/natural voices (Windows 11 "Neerja" etc.)
    const inNeural = inVoices.find(v => /Online|Natural/i.test(v.name));
    if (inNeural) return inNeural;

    // Tier 2: Any Indian English voice
    if (inVoices.length) return inVoices[0];

    // Tier 3: Google Indian English (Chrome)
    const googleIn = enVoices.find(v => /Google.*India/i.test(v.name));
    if (googleIn) return googleIn;

    // Tier 4: Neural/natural English voices (any region)
    const neural = enVoices.find(v =>
      /Online|Natural/i.test(v.name) && /Aria|Jenny|Guy|Ana|Steffan|Neerja/i.test(v.name)
    ) || enVoices.find(v => /Online|Natural/i.test(v.name));
    if (neural) return neural;

    // Tier 5: Google cloud voices (Chrome)
    const google = enVoices.find(v => /^Google UK English Female/.test(v.name))
      || enVoices.find(v => /^Google/.test(v.name) && !v.localService);
    if (google) return google;

    // Tier 6: Any non-local (cloud) English voice
    const cloud = enVoices.find(v => !v.localService);
    if (cloud) return cloud;

    // Tier 7: Any English voice, avoid Zira/David (robotic)
    const decent = enVoices.find(v => !/Zira|David|Mark/i.test(v.name));
    return decent || enVoices[0];
  }

  // --- Speech Synthesis ---

  function speakChunk(text, options = {}) {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? CONFIG.greeting.rate;
      utterance.pitch = options.pitch ?? CONFIG.greeting.pitch;
      utterance.volume = options.volume ?? CONFIG.greeting.volume;
      utterance.lang = options.lang || 'en-IN';

      const voice = bestVoice || findBestVoice();
      if (voice) utterance.voice = voice;

      utterance.onend = resolve;
      utterance.onerror = (e) => {
        if (e.error === 'canceled') resolve();
        else reject(e);
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  // Chrome pauses/kills speech after ~15s. Keep it alive with a resume timer.
  let keepAliveTimer = null;

  function startKeepAlive() {
    stopKeepAlive();
    keepAliveTimer = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 5000);
  }

  function stopKeepAlive() {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
  }

  async function speak(text, options = {}) {
    if (!('speechSynthesis' in window)) throw new Error('Speech synthesis not supported');

    window.speechSynthesis.cancel();

    // Split into sentences to avoid Chrome's ~15s cutoff
    const sentences = text.match(/[^.!?]+[.!?]?\s*/g) || [text];

    startKeepAlive();
    try {
      for (let i = 0; i < sentences.length; i++) {
        const trimmed = sentences[i].trim();
        if (!trimmed) continue;
        await speakChunk(trimmed, options);
        if (i < sentences.length - 1) {
          await new Promise(r => setTimeout(r, 250));
        }
      }
    } finally {
      stopKeepAlive();
    }
  }

  function getVoices() {
    return window.speechSynthesis?.getVoices().filter(v => v.lang.startsWith('en')) || [];
  }

  async function greet(alumni) {
    const firstName = alumni.name.split(' ')[0];
    const text = CONFIG.greeting.template
      .replace('{name}', firstName)
      .replace('{event}', CONFIG.event.title);

    showWelcomeOverlay(alumni);

    try {
      if (CONFIG.greeting.chimeEnabled) await playChime();
    } catch {}
    try {
      await speak(text);
    } catch {}
  }

  let overlayTimer = null;

  function showWelcomeOverlay(alumni) {
    const firstName = alumni.name.split(' ')[0];
    let overlay = document.getElementById('welcome-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'welcome-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="welcome-content">
        <div class="welcome-sparkle">&#10022;</div>
        <p class="welcome-label">Welcome</p>
        <h2 class="welcome-name">${sanitize(firstName)}</h2>
        <p class="welcome-message">Welcome to <strong>Yaadein 2026</strong></p>
        <div class="welcome-sparkle welcome-sparkle-bottom">&#10022;</div>
      </div>
    `;

    if (overlayTimer) clearTimeout(overlayTimer);
    overlay.classList.add('visible');

    overlayTimer = setTimeout(() => {
      overlay.classList.remove('visible');
      overlayTimer = null;
    }, 6000);
  }

  let sharedAudioCtx = null;

  function getAudioContext() {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return sharedAudioCtx;
  }

  function playChime() {
    return new Promise(resolve => {
      try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();

        const notes = [
          { freq: 523.25, time: 0, duration: 0.5 },
          { freq: 659.25, time: 0.15, duration: 0.45 },
          { freq: 783.99, time: 0.3, duration: 0.5 },
          { freq: 1046.5, time: 0.5, duration: 0.7 }
        ];

        notes.forEach(({ freq, time, duration }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, ctx.currentTime + time);
          gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + time + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + time);
          osc.stop(ctx.currentTime + time + duration);
        });

        setTimeout(resolve, 1200);
      } catch {
        resolve();
      }
    });
  }

  function stopSpeaking() {
    stopKeepAlive();
    window.speechSynthesis?.cancel();
    const overlay = document.getElementById('welcome-overlay');
    if (overlay) overlay.classList.remove('visible');
  }

  // --- Speech Recognition ---

  function initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.maxAlternatives = 3;
    return recognition;
  }

  function startListening(onResult, onError, onInterim) {
    if (!recognition) initRecognition();
    if (!recognition) {
      onError?.('Speech recognition not supported in this browser.');
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    isListening = true;

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const transcript = last[0].transcript.trim();
        const confidence = last[0].confidence;
        isListening = false;
        onResult?.(transcript, confidence);
      } else {
        onInterim?.(last[0].transcript);
      }
    };

    recognition.onerror = (event) => {
      isListening = false;
      const messages = {
        'no-speech': 'No speech detected. Please try again.',
        'not-allowed': 'Microphone access denied. Please allow microphone access.',
        'network': 'Network error. Please check your connection.',
        'aborted': ''
      };
      const msg = messages[event.error] || `Voice error: ${event.error}`;
      if (msg) onError?.(msg);
    };

    recognition.onend = () => { isListening = false; };

    try {
      recognition.start();
    } catch {
      isListening = false;
      onError?.('Could not start voice recognition.');
    }
  }

  function stopListening() {
    recognition?.stop();
    isListening = false;
  }

  function getIsListening() { return isListening; }

  // Load voices
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      bestVoice = findBestVoice();
      if (bestVoice) console.log('TTS voice:', bestVoice.name, bestVoice.lang, bestVoice.localService ? '(local)' : '(cloud)');
    };
    window.speechSynthesis.getVoices();
  }

  return {
    speak, greet, getVoices, stopSpeaking, playChime,
    startListening, stopListening, isListening: getIsListening
  };
})();
