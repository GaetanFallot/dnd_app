import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CampaignProvider, useCampaign } from './context/CampaignContext'
import Layout from './components/Layout/Layout'
import CharacterList from './components/CharacterList/CharacterList'
import CharacterSheet from './components/CharacterSheet/CharacterSheet'
import DMScreen from './components/DMScreen/DMScreen'
import WikiPage from './components/Wiki/WikiPage'
import HelpPage from './components/Help/HelpPage'
import CompendiumPage from './components/Compendium/CompendiumPage'

// Expose campaign to window so fsAdd/fsSet/fsDelete work outside hooks
function CampaignBridge() {
  const campaign = useCampaign()
  useEffect(() => { window.__campaign = campaign }, [campaign])
  return null
}

export default function App() {
  return (
    <CampaignProvider>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <CampaignBridge />
        <Routes>
          <Route path="/" element={<Layout><CharacterList /></Layout>} />
          <Route path="/sheet/:id" element={<Layout><CharacterSheet /></Layout>} />
          <Route path="/dm" element={<DMScreen />} />
          <Route path="/wiki" element={<Layout><WikiPage /></Layout>} />
          <Route path="/grimoire" element={<Layout><WikiPage /></Layout>} />
          <Route path="/compendium" element={<Layout><CompendiumPage /></Layout>} />
          <Route path="/help" element={<Layout><HelpPage /></Layout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </CampaignProvider>
  )
}
