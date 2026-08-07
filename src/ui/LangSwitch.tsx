import { useI18n } from '../i18n'
import { LANGS } from '../i18n/strings'

export function LangSwitch() {
  const { lang, setLang } = useI18n()
  return (
    <div className="lang" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l.id}
          className={l.id === lang ? 'on' : ''}
          onClick={() => setLang(l.id)}
          aria-pressed={l.id === lang}
          title={l.label}
        >
          {l.id.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
