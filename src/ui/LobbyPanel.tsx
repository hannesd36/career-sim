import { useState } from 'react'
import { copyText } from '../engine/quiz'
import type { Lobby } from '../net/useLobby'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'

/**
 * The bit of furniture both games share when two people play across the
 * internet: a code, a link, and an honest line about what is happening.
 *
 * The code is five characters because somebody has to read it down a phone.
 * The link exists because nobody wants to.
 */
export function LobbyPanel({ lobby, hint }: { lobby: Lobby; hint?: string }) {
  const { t } = useI18n()
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  const flash = (what: 'code' | 'link') => {
    setCopied(what)
    setTimeout(() => setCopied(null), 1600)
  }

  if (lobby.state === 'idle' || lobby.state === 'closed') {
    return (
      <section className="lobby">
        <div className="lobby-head">
          <h3>{t('net.title')}</h3>
          <span className="aside">{hint ?? t('net.blurb')}</span>
        </div>
        <div className="lobby-two">
          <button className="act act--primary" onClick={lobby.start}>
            {t('net.create')}
          </button>
          <form
            className="lobby-join"
            onSubmit={(e) => {
              e.preventDefault()
              lobby.enter(code)
            }}
          >
            <input
              className="ruled"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t('net.codePlaceholder')}
              maxLength={6}
              autoComplete="off"
              spellCheck={false}
              aria-label={t('net.code')}
            />
            <button className="act" type="submit" disabled={!code.trim()}>
              {t('net.join')}
            </button>
          </form>
        </div>
        {lobby.state === 'closed' && <p className="note note--bad">{t('net.gone')}</p>}
      </section>
    )
  }

  if (lobby.state === 'error') {
    const key = ['taken', 'noroom', 'dropped'].includes(lobby.detail ?? '')
      ? (`net.err.${lobby.detail}` as StringKey)
      : ('net.err.other' as StringKey)
    return (
      <section className="lobby">
        <p className="note note--bad">{t(key)}</p>
        <button className="act" onClick={lobby.leave}>
          {t('net.again')}
        </button>
      </section>
    )
  }

  return (
    <section className="lobby">
      <div className="lobby-head">
        <h3>{t('net.title')}</h3>
        <button className="act act--quiet" onClick={lobby.leave}>
          {t('net.leave')}
        </button>
      </div>

      {lobby.room && (
        <button
          className="roomcode"
          onClick={async () => (await copyText(lobby.room!)) && flash('code')}
          title={t('net.copyCode')}
        >
          {lobby.room.split('').map((c, i) => (
            <span key={i}>{c}</span>
          ))}
        </button>
      )}

      {lobby.link && (
        <div className="lobby-link">
          <input className="ruled" value={lobby.link} readOnly onFocus={(e) => e.target.select()} />
          <button
            className="act"
            onClick={async () => (await copyText(lobby.link!)) && flash('link')}
          >
            {copied === 'link' ? t('net.copied') : t('net.copyLink')}
          </button>
        </div>
      )}

      <p className={`note${lobby.connected ? ' note--good' : ''}`}>
        {copied === 'code'
          ? t('net.copied')
          : lobby.state === 'waiting'
            ? t('net.waiting')
            : lobby.state === 'connecting'
              ? t('net.connecting')
              : lobby.state === 'open'
                ? t('net.connected')
                : t('net.opening')}
      </p>
    </section>
  )
}
