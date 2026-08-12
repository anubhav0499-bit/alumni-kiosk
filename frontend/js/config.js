const CONFIG = {
  event: {
    title: 'Yaadein 2026',
    subtitle: 'Reconnect. Reimagine. Rejoice.',
    institution: 'Symbiosis School of Banking and Finance',
    date: 'September 2026',
    venue: 'SIU Lavale Campus, Pune',
    bannerUrl: ''
  },

  greeting: {
    template: 'Hi {name}. It is our privilege to have you at SSBF.',
    voice: 'default',
    rate: 0.92,
    pitch: 1.0,
    volume: 1.0,
    chimeEnabled: true
  },

  api: {
    baseUrl: location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'https://script.google.com/macros/s/AKfycbw8Z1pUDnuef1Rqgk0XgmLR4QrXzYF89Vx4hprJ5mWLnd0v3rytfIS6YSqQtGEez9C5/exec'
      : '/api'
  },

  kiosk: {
    inactivityTimeout: 60,
    language: 'en',
    deviceId: 'KIOSK-01'
  },

  colors: {
    primary: '#A855E8',
    secondary: '#5B27BB',
    accent: '#C084FC',
    background: '#04030E'
  }
};
