import { useCallback, useEffect, useState } from 'react'
import { dailyKey } from '../engine/daily'
import {
  fetchBoard,
  groupCode,
  leaderboardEnabled,
  makeGroupCode,
  playerName,
  setGroupCode,
  setPlayerName,
  type BoardId,
  type Entry,
} from '../net/leaderboard'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'

type Tab = 'career' | 'daily' | 'guess' | 'crest' | 'grid'
const TABS: Tab[] = ['career', 'daily', 'guess', 'crest', 'grid']

const boardFor = (tab: Tab): BoardId => (tab === 'daily' ? `daily:${dailyKey()}` : tab)

/**
 * The boards.
 *
 * There are two of them stacked in one screen: the open one everybody posts to,
 * and the one behind a code you share with people you know. The second is the
 * one that actually works — a board with no accounts cannot tell a good run
 * from a typed number, and a table of strangers' unverifiable scores is not
 * worth reading. The open board is kept because it is the first thing anybody
 * looks for, and it is honest about what it is.
 */
export function BoardsScreen({ onExit }: { onExit: () => void }) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('career')
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(playerName())
  const [code, setCode] = useState(groupCode())
  const [codeDraft, setCodeDraft] = useState('')

  const load = useCallback(async () => {
    if (!leaderboardEnabled()) return
    setLoading(true)
    setEntries(await fetchBoard(boardFor(tab)))
    setLoading(false)
  }, [tab])

  useEffect(() => {
    void load()
  }, [load])

  if (!leaderboardEnabled()) {
    return (
      <div className="flow game">
        <div className="rule-head">
          <h2>{t('board.title')}</h2>
          <button className="act act--quiet" onClick={onExit}>
            {t('app.back')}
          </button>
        </div>
        <p className="hint">{t('board.off')}</p>
      </div>
    )
  }

  return (
    <div className="flow game">
      <div className="rule-head">
        <h2>{t('board.title')}</h2>
        <button className="act act--quiet" onClick={onExit}>
          {t('app.back')}
        </button>
      </div>

      {/* Nothing can be posted without a name, so it is asked for first. */}
      <div className="board-you">
        <label className="board-field">
          <span>{t('board.yourName')}</span>
          <input
            value={name}
            maxLength={24}
            placeholder={t('board.namePlaceholder')}
            onChange={(e) => {
              setName(e.target.value)
              setPlayerName(e.target.value)
            }}
          />
        </label>

        <div className="board-field">
          <span>{t('board.friendCode')}</span>
          <div className="board-code">
            {code ? (
              <>
                <strong>{code}</strong>
                <button
                  className="act act--quiet"
                  onClick={() => {
                    void navigator.clipboard?.writeText(code)
                  }}
                >
                  {t('board.copy')}
                </button>
                <button
                  className="act act--quiet"
                  onClick={() => {
                    setGroupCode('')
                    setCode('')
                    void load()
                  }}
                >
                  {t('board.leave')}
                </button>
              </>
            ) : (
              <>
                <input
                  value={codeDraft}
                  maxLength={8}
                  placeholder={t('board.codePlaceholder')}
                  onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
                />
                <button
                  className="act act--quiet"
                  onClick={() => {
                    setGroupCode(codeDraft)
                    setCode(groupCode())
                    setCodeDraft('')
                    void load()
                  }}
                  disabled={codeDraft.trim().length < 4}
                >
                  {t('board.join')}
                </button>
                <button
                  className="act act--quiet"
                  onClick={() => {
                    const made = makeGroupCode()
                    setGroupCode(made)
                    setCode(groupCode())
                    void load()
                  }}
                >
                  {t('board.create')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="hint">{code ? t('board.inGroup', { code }) : t('board.openBoard')}</p>

      <div className="tempo" role="tablist">
        {TABS.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'on' : undefined}
            onClick={() => setTab(id)}
          >
            {t(`board.tab.${id}` as StringKey)}
          </button>
        ))}
      </div>

      {loading && <p className="hint">{t('board.loading')}</p>}
      {!loading && entries && entries.length === 0 && <p className="hint">{t('board.empty')}</p>}
      {!loading && entries === null && <p className="hint">{t('board.unreachable')}</p>}

      {!loading && entries && entries.length > 0 && (
        <div className="board-rows">
          {entries.map((entry) => (
            <div className={`board-row${entry.you ? ' board-row--you' : ''}`} key={`${entry.rank}-${entry.name}`}>
              <span className="board-rank">{entry.rank}</span>
              <span className="board-name">{entry.name}</span>
              <span className="board-detail">{entry.detail}</span>
              <span className="board-value">{entry.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
