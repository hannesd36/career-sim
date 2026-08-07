import { MODE_CONFIG, type GameMode } from '../engine/types'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { THEMES, type Theme } from './useSettings'

const MODES: GameMode[] = ['blitz', 'quick', 'normal', 'story']

interface SettingsProps {
  mode: GameMode
  onMode: (m: GameMode) => void
  theme: Theme
  onTheme: (t: Theme) => void
  onExport: () => void
  onClose: () => void
}

/**
 * How fast the career runs, what it is played on, and the way out of it.
 * Nothing else belongs here.
 */
export function SettingsPanel({
  mode,
  onMode,
  theme,
  onTheme,
  onExport,
  onClose,
}: SettingsProps) {
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

      {/* The button in the bar walks through these; here they have names, and
          each one shows the ground and the loud colour it actually is. */}
      <div className="settings-row" style={{ marginTop: 'var(--s4)' }}>
        <span className="kicker" style={{ margin: 0 }}>
          {t('set.theme')}
        </span>
      </div>

      <div className="grounds">
        {THEMES.map((id) => (
          <button
            key={id}
            className={`ground${id === theme ? ' ground--on' : ''}`}
            onClick={() => onTheme(id)}
            aria-pressed={id === theme}
          >
            <span className={`ground-swatch ground-swatch--${id}`} aria-hidden="true">
              <i />
            </span>
            {t(`theme.${id}` as StringKey)}
          </button>
        ))}
      </div>
    </div>
  )
}
