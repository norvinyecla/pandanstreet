import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.tsx';
import { RequireAuth } from './auth/RequireAuth.tsx';
import { AppShell } from './components/AppShell.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { ProfileEditPage } from './pages/ProfileEditPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <RequireAuth>
                  <ProfileEditPage />
                </RequireAuth>
              }
            />
            <Route
              path="/users/:id"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
          </Routes>
        </AppShell>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
