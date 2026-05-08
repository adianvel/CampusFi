import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { SolanaProvider } from './contexts/SolanaProvider';
import { MagicBlockProvider } from './contexts/MagicBlockProvider';
import '@solana/wallet-adapter-react-ui/styles.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SolanaProvider>
      <MagicBlockProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MagicBlockProvider>
    </SolanaProvider>
  </StrictMode>,
);
