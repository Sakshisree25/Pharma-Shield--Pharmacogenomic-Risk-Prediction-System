import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Outlet,
} from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { PlatformPage } from './pages/PlatformPage';
import { NotFoundPage } from './pages/NotFoundPage';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const AppLayout: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="app">
      <ScrollToTop />
      <div className="app-shell">
        {!isHome && <Navbar />}
        <main className="app-main">
          <div className="container">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="vcf-upload" element={<PlatformPage />} />
          <Route path="drug-input" element={<PlatformPage />} />
          <Route path="results-display" element={<PlatformPage />} />
          <Route path="export-share" element={<PlatformPage />} />
          <Route path="error-handling" element={<PlatformPage />} />
          <Route path="ai-insights" element={<PlatformPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
