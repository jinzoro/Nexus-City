import { useState } from 'react'
import { PanelShell } from './panels/PanelShell'
import { SectionLabel } from './ui'
import { IdentityCard } from './IdentityCard'
import { SecurityCard } from './SecurityCard'
import { useSocialStore } from '../social/useSocialStore'

const TABS = [
  { id: 'identity', label: 'IDENTITY' },
  { id: 'security', label: 'SECURITY' },
  { id: 'privacy', label: 'PRIVACY' },
  { id: 'social', label: 'SOCIAL' },
] as const

export function SettingsPanel() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('identity')
  const { profile, signOut } = useSocialStore()

  return (
    <PanelShell title="SETTINGS" subtitle="CITIZEN TERMINAL // ACCOUNT" icon="profile" wide footer={<>
      <span>PROFILE ACTIVE</span>
      <span className="panel-footer__sep">//</span>
      <span>{profile?.handle ?? 'NO CITIZEN'}</span>
    </>}>
      <div className="settings-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`settings-tab ${tab === t.id ? 'settings-tab--on' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'identity' && (
        <div className="settings-content">
          <SectionLabel>IDENTITY</SectionLabel>
          <IdentityCard />
        </div>
      )}

      {tab === 'security' && (
        <div className="settings-content">
          <SectionLabel>SECURITY</SectionLabel>
          <SecurityCard />
        </div>
      )}

      {tab === 'privacy' && (
        <div className="settings-content">
          <SectionLabel>PRIVACY</SectionLabel>
          <p className="settings-note">Privacy controls live in IDENTITY. Set visibility to GHOST to disappear from rosters. DM policy controls who can open a thread with you.</p>
        </div>
      )}

      {tab === 'social' && (
        <div className="settings-content">
          <SectionLabel>SOCIAL</SectionLabel>
          <p className="settings-note">Social mesh diagnostics and preference controls are being wired up. For now, use IDENTITY to adjust visibility and DM policy.</p>
        </div>
      )}
    </PanelShell>
  )
}
