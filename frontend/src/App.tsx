import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.tsx';
import { RequireAuth } from './auth/RequireAuth.tsx';
import { AppShell } from './components/AppShell.tsx';
import { BulletinBoardPage } from './pages/BulletinBoardPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { PlazaPage } from './pages/PlazaPage.tsx';
import { ProfileEditPage } from './pages/ProfileEditPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { ShoutoutsPage } from './pages/ShoutoutsPage.tsx';
import { TileCreatePage } from './pages/TileCreatePage.tsx';
import { TileEditPage } from './pages/TileEditPage.tsx';

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
            <Route
              path="/tiles/new"
              element={
                <RequireAuth>
                  <TileCreatePage />
                </RequireAuth>
              }
            />
            <Route
              path="/tiles/:id/edit"
              element={
                <RequireAuth>
                  <TileEditPage />
                </RequireAuth>
              }
            />
            <Route
              path="/shoutouts"
              element={
                <RequireAuth>
                  <ShoutoutsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/bulletin-board"
              element={
                <RequireAuth>
                  <BulletinBoardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/plaza"
              element={
                <RequireAuth>
                  <PlazaPage />
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
