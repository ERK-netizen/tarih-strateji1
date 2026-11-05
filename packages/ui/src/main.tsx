import { render } from 'preact';
import '@fontsource/old-standard-tt/latin-400.css';
import '@fontsource/old-standard-tt/latin-ext-400.css';
import '@fontsource/old-standard-tt/latin-700.css';
import '@fontsource/old-standard-tt/latin-ext-700.css';
import '@fontsource/old-standard-tt/latin-400-italic.css';
import '@fontsource/ibm-plex-sans-condensed/latin-400.css';
import '@fontsource/ibm-plex-sans-condensed/latin-ext-400.css';
import '@fontsource/ibm-plex-sans-condensed/latin-500.css';
import '@fontsource/ibm-plex-sans-condensed/latin-ext-500.css';
import '@fontsource/ibm-plex-sans-condensed/latin-600.css';
import '@fontsource/ibm-plex-sans-condensed/latin-ext-600.css';
import '@fontsource/courier-prime/latin-400.css';
import '@fontsource/courier-prime/latin-ext-400.css';
import '@fontsource/courier-prime/latin-700.css';
import '@fontsource/courier-prime/latin-ext-700.css';
import './stil.css';
import { App } from './App.tsx';
import { istemci, tost } from './durum.ts';

istemci.dinle = (t, p) => { if (t === 'error' && p?.kod !== 'paket') tost(`${p?.ayrinti ?? 'Hata'}${p?.oneri ? ' — ' + p.oneri : ''}`, 'hata'); };
render(<App />, document.getElementById('app')!);
// yazı tipleri yüklenince haritayı yeniden çiz
void document.fonts?.ready.then(() => window.dispatchEvent(new Event('resize')));
