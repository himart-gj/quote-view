import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { CustomerViewerRoot } from './components/CustomerViewerRoot';
import { installMobileViewportAndKeyboardGuard } from './utils/mobileQaRuntime';
import './index.css';

const BootMiniViewer: React.FC = () => {
  useEffect(() => installMobileViewportAndKeyboardGuard(), []);
  return <CustomerViewerRoot />;
};

createRoot(document.getElementById('root')!).render(<BootMiniViewer />);
