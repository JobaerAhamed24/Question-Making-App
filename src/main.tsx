import { createRoot } from 'react-dom/client';

// Locally downloaded & bundled Bengali + Web Fonts (@fontsource)
import '@fontsource/hind-siliguri/300.css';
import '@fontsource/hind-siliguri/400.css';
import '@fontsource/hind-siliguri/500.css';
import '@fontsource/hind-siliguri/600.css';
import '@fontsource/hind-siliguri/700.css';

import '@fontsource/noto-sans-bengali/400.css';
import '@fontsource/noto-sans-bengali/500.css';
import '@fontsource/noto-sans-bengali/600.css';
import '@fontsource/noto-sans-bengali/700.css';

import '@fontsource/noto-serif-bengali/400.css';
import '@fontsource/noto-serif-bengali/600.css';
import '@fontsource/noto-serif-bengali/700.css';

import '@fontsource/tiro-bangla/400.css';

import '@fontsource/anek-bangla/400.css';
import '@fontsource/anek-bangla/500.css';
import '@fontsource/anek-bangla/600.css';
import '@fontsource/anek-bangla/700.css';

import '@fontsource/baloo-da-2/400.css';
import '@fontsource/baloo-da-2/500.css';
import '@fontsource/baloo-da-2/600.css';
import '@fontsource/baloo-da-2/700.css';

import '@fontsource/mina/400.css';
import '@fontsource/mina/700.css';

import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';

import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';

import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
