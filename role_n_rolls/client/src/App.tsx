import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/shared/AppShell';
import { MJScreen } from '@/pages/MJScreen';
import { CharacterCreation } from '@/pages/CharacterCreation';
import { LoreBuilder } from '@/pages/LoreBuilder';
import { MapsPage } from '@/pages/Maps';
import { SessionPage } from '@/pages/Session';
import { AuthPage } from '@/pages/Auth';
import { PublicLorePage } from '@/pages/PublicLore';
import { SharedView } from '@/pages/CharacterCreation/SharedView';
import { SettingsPage } from '@/pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/lore/:token" element={<PublicLorePage />} />
      <Route path="/character/shared/:encoded" element={<SharedView />} />
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/session" replace />} />
        <Route path="/session" element={<SessionPage />} />
        <Route path="/mj" element={<MJScreen />} />
        <Route path="/character" element={<CharacterCreation />} />
        <Route path="/character/:characterId" element={<CharacterCreation />} />
        <Route path="/lore" element={<LoreBuilder />} />
        <Route path="/maps" element={<MapsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/session" replace />} />
      </Route>
    </Routes>
  );
}
