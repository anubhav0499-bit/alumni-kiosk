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
    template: 'Hi {name}, Welcome to Yaa they n 2026.',
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
