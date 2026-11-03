import React from 'react';
import { createRoot } from 'react-dom/client';
import { CustomerViewerRoot } from './components/CustomerViewerRoot';
import './index.css';

createRoot(document.getElementById('root')!).render(<CustomerViewerRoot />);
