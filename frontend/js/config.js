const CONFIG = {
  event: {
    title: 'Yaadein 2026',
    subtitle: 'Reconnect. Reimagine. Rejoice.',
    institution: 'Symbiosis School of Banking and Finance',
    date: 'SSBF',
    venue: 'SIU Lavale Campus, Pune',
    bannerUrl: ''
  },

  greeting: {
    // One utterance on the Indian English voice: no voice switch, so no gap,
    // and no dependency on the network mid-greeting.
    //
    // If a *local* Hindi voice is installed on the kiosk (Windows: Settings >
    // Time & language > Language & region > add Hindi > Language options >
    // Speech), change "Yaadein" to "यादें" here and voice.js will route just
    // that word to it — correct pronunciation with a gap too short to hear.
    // Do not do that while only the cloud Hindi voice is available: fetching it
    // costs ~0.5s of silence mid-sentence.
    template: 'Hi {name}, Welcome to Yaadein twenty twenty six.',
    // Used only if the template above contains Devanagari and the device turns
    // out to have no Hindi voice at all.
    templateFallback: 'Hi {name}, Welcome to Yaadein twenty twenty six.',
    voice: 'default',
    rate: 0.92,
    pitch: 1.0,
    volume: 1.0,
    chimeEnabled: true
  },

  api: {
    // Always same-origin. The Apps Script URL and its token stay server-side
    // in the /api proxy; for local dev run `vercel dev`.
    baseUrl: '/api'
  },

  kiosk: {
    inactivityTimeout: 60,
    language: 'en',
    deviceId: 'KIOSK-01'
  },

  colors: {
    primary: '#2DD4BF',
    secondary: '#0D9488',
    accent: '#5EEAD4',
    background: '#030B15'
  }
};
