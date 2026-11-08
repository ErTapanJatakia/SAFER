import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { SaferAuthProvider } from './context/SaferAuthContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <SaferAuthProvider>
    <App />
  </SaferAuthProvider>
);
