import { useCityStore } from '../../state/useCityStore'
import { MapPanel } from './MapPanel'
import { SectorsPanel } from './SectorsPanel'
import { TransitPanel } from './TransitPanel'
import { SystemsPanel } from './SystemsPanel'
import { MessagesPanel } from './MessagesPanel'
import { ProfilePanel } from './ProfilePanel'
import { SettingsPanel } from '../SettingsPanel'

export function Panels() {
  const activePanel = useCityStore((s) => s.activePanel)
  if (!activePanel) return null
  return (
    <div className="panel-layer">
      {activePanel === 'map' ? <MapPanel /> : null}
      {activePanel === 'sectors' ? <SectorsPanel /> : null}
      {activePanel === 'transit' ? <TransitPanel /> : null}
      {activePanel === 'systems' ? <SystemsPanel /> : null}
      {activePanel === 'messages' ? <MessagesPanel /> : null}
      {activePanel === 'profile' ? <ProfilePanel /> : null}
      {activePanel === 'settings' ? <SettingsPanel /> : null}
    </div>
  )
}
