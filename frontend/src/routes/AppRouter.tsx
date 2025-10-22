import { Route, Routes } from 'react-router-dom';

import { AppShell } from '../components/layout/AppShell';
import { HomePage } from '../pages/HomePage';
import { PricingPage } from '../pages/PricingPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ProtectedRoute } from './ProtectedRoute';

const NotFoundPage = () => <div>Страница не найдена</div>;

const AppRouter = () => (
  <AppShell>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/crm/*" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </AppShell>
);

export default AppRouter;
