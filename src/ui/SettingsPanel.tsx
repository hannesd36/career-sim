import { MODE_CONFIG, type GameMode } from '../engine/types'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'

const MODES: GameMode[] = ['blitz', 'quick', 'normal', 'story']

interface SettingsProps {
  mode: GameMode
  onMode: (m: GameMode) => void
  onExport: () => void
  onClose: () => void
}

/** How fast the career runs, and the way out of it. Nothing else belongs here. */
export function SettingsPanel({ mode, onMode, onExport, onClose }: SettingsProps) {
  const { t } = useI18n()
  return (
    <div className="settings">
      <div className="settings-row">
        <span className="kicker" style={{ margin: 0 }}>
          {t('mode.title')}
        </span>
        <span className="spacer" />
        <button className="act act--quiet" onClick={onExport}>
          {t('app.export')}
        </button>
        <button className="act" onClick={onClose}>
          {t('set.done')}
        </button>
      </div>

      <div className="pace">
        {MODES.map((m) => (
          <button
            key={m}
            className={`pace-opt${m === mode ? ' pace-opt--on' : ''}`}
            onClick={() => onMode(m)}
            aria-pressed={m === mode}
          >
            <div className="pace-name">{t(`mode.${m}` as StringKey)}</div>
            <div className="pace-n">{MODE_CONFIG[m].seasons}</div>
            <div className="pace-note">{t(`mode.${m}Events` as StringKey)}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
