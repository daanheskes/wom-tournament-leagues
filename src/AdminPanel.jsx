import { useState } from 'react'

const SKILLS = [
  'overall', 'attack', 'defence', 'strength', 'hitpoints', 'ranged', 'prayer', 'magic',
  'cooking', 'woodcutting', 'fletching', 'fishing', 'firemaking', 'crafting', 'smithing',
  'mining', 'herblore', 'agility', 'thieving', 'slayer', 'farming', 'runecrafting',
  'hunter', 'construction', 'sailing',
]

const BOSSES = [
  'abyssal_sire', 'alchemical_hydra', 'amoxliatl', 'araxxor', 'artio', 'barrows_chests',
  'brutus', 'bryophyta', 'callisto', 'calvarion', 'cerberus', 'chambers_of_xeric',
  'chambers_of_xeric_challenge_mode', 'chaos_elemental', 'chaos_fanatic', 'commander_zilyana',
  'corporeal_beast', 'crazy_archaeologist', 'dagannoth_prime', 'dagannoth_rex',
  'dagannoth_supreme', 'deranged_archaeologist', 'doom_of_mokhaiotl', 'duke_sucellus',
  'general_graardor', 'giant_mole', 'grotesque_guardians', 'hespori', 'kalphite_queen',
  'king_black_dragon', 'kraken', 'kreearra', 'kril_tsutsaroth', 'lunar_chests', 'mad_angel',
  'maggot_king', 'mimic', 'nex', 'nightmare', 'phosanis_nightmare', 'obor', 'phantom_muspah',
  'sarachnis', 'scorpia', 'scurrius', 'shellbane_gryphon', 'skotizo', 'sol_heredit', 'spindel',
  'tempoross', 'the_gauntlet', 'the_corrupted_gauntlet', 'the_hueycoatl', 'the_leviathan',
  'the_royal_titans', 'the_whisperer', 'theatre_of_blood', 'theatre_of_blood_hard_mode',
  'thermonuclear_smoke_devil', 'tombs_of_amascut', 'tombs_of_amascut_expert', 'tzkal_zuk',
  'tztok_jad', 'vardorvis', 'venenatis', 'vetion', 'vorkath', 'wintertodt', 'yama', 'zalcano',
  'zulrah',
]

const GROUP_ID = 7020

function getCompetitionDates(existingCompetitions = [], additionalWeeks = 0) {
  const now = new Date()
  const nextWednesday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 30))
  const daysUntilWednesday = (3 - nextWednesday.getUTCDay() + 7) % 7

  nextWednesday.setUTCDate(nextWednesday.getUTCDate() + daysUntilWednesday)
  if (nextWednesday <= now) nextWednesday.setUTCDate(nextWednesday.getUTCDate() + 7)

  const usedWeekKeys = new Set(existingCompetitions
    .filter(competition => /(?:skill|boss)\s+of\s+the\s+week\s+#\d+/i.test(competition.title || ''))
    .map(competition => getWeekKey(competition.startsAt)))

  while (usedWeekKeys.has(getWeekKey(nextWednesday.toISOString()))) {
    nextWednesday.setUTCDate(nextWednesday.getUTCDate() + 7)
  }

  nextWednesday.setUTCDate(nextWednesday.getUTCDate() + additionalWeeks * 7)

  const nextMonday = new Date(nextWednesday)
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 5)
  return { startsAt: nextWednesday.toISOString(), endsAt: nextMonday.toISOString() }
}

function displayMetric(metric) {
  return metric.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function getWeekNumber(dateString) {
  const date = new Date(dateString)
  const thursday = new Date(date)
  thursday.setUTCDate(date.getUTCDate() + (4 - (date.getUTCDay() || 7)))
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4))
  return 1 + Math.round((thursday - firstThursday) / 604800000)
}

function getWeekKey(dateString) {
  const date = new Date(dateString)
  return `${date.getUTCFullYear()}-${getWeekNumber(dateString)}`
}

function getCompetitionsForWeek(competitions, dateString) {
  const weekKey = getWeekKey(dateString)
  return competitions.filter(competition => getWeekKey(competition.startsAt) === weekKey)
}

function normalizeGroupCode(value) {
  return value.replace(/\D/g, '')
}

function AdminPanel({ existingCompetitions }) {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('wom-admin') === 'true')
  const [passKey, setPassKey] = useState(() => sessionStorage.getItem('wom-admin-group-code') || '')
  const [mode, setMode] = useState('skill')
  const [metric, setMetric] = useState(SKILLS[0])
  const [status, setStatus] = useState(null)
  const [creating, setCreating] = useState(false)
  const [additionalWeeks, setAdditionalWeeks] = useState(0)
  const dates = getCompetitionDates(existingCompetitions, additionalWeeks)
  const competitionsInSelectedWeek = getCompetitionsForWeek(existingCompetitions, dates.startsAt)
  const competitionTitle = dates
    ? `${displayMetric(metric)} | ${mode === 'skill' ? 'Skill' : 'Boss'} of the week #${getWeekNumber(dates.startsAt)}`
    : ''

  async function login(event) {
    event.preventDefault()
    try {
      const response = await fetch('/.netlify/functions/create-competition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-passkey': passKey },
        body: JSON.stringify({ action: 'authenticate' }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        if (response.status === 404) throw new Error('Netlify Function not found. Deploy the site with the Netlify Function enabled.')
        throw new Error(data.message || 'Invalid group code.')
      }
      sessionStorage.setItem('wom-admin-group-code', passKey)
      sessionStorage.setItem('wom-admin', 'true')
      setAuthenticated(true)
      setStatus(null)
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode)
    setMetric(nextMode === 'skill' ? SKILLS[0] : BOSSES[0])
  }

  async function createCompetition(event) {
    event.preventDefault()
    setCreating(true)
    setStatus(null)

    try {
      const response = await fetch('/.netlify/functions/create-competition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-passkey': passKey },
        body: JSON.stringify({
          title: competitionTitle,
          metric,
          startsAt: dates.startsAt,
          endsAt: dates.endsAt,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'The competition could not be created.')
      setStatus({ type: 'success', data })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setCreating(false)
    }
  }

  if (!authenticated) {
    return (
      <section className="admin-panel login-panel">
        <div className="section-kicker">Restricted area</div>
          <h1>Admin access</h1>
        <p>Use the WiseOldMan group code to publish a new competition.</p>
        <form onSubmit={login} className="stack-form">
          <label htmlFor="group-code">Group code</label>
          <input id="group-code" type="password" inputMode="numeric" value={passKey} onChange={event => setPassKey(normalizeGroupCode(event.target.value))} autoFocus />
          <button type="submit">Log in</button>
        </form>
        {status?.type === 'error' && <p className="form-message error">{status.message}</p>}
      </section>
    )
  }

  const options = mode === 'skill' ? SKILLS : BOSSES
  return (
    <section className="admin-panel">
      <div className="admin-heading">
        <div>
          <div className="section-kicker">Admin console</div>
          <h1>New competition</h1>
        </div>
      </div>
      <div className="mode-tabs" role="tablist" aria-label="Competition type">
        <button type="button" className={mode === 'skill' ? 'active' : ''} onClick={() => changeMode('skill')}>Skill</button>
        <button type="button" className={mode === 'boss' ? 'active' : ''} onClick={() => changeMode('boss')}>Boss</button>
      </div>
      <form onSubmit={createCompetition} className="creation-form">
        <p>Automatic title: <strong>{competitionTitle}</strong></p>
        <div>
          <button type="button" onClick={() => setAdditionalWeeks(additionalWeeks - 1)}>-1 week</button>
          <button type="button" onClick={() => setAdditionalWeeks(0)}>Current week</button>
          <button type="button" onClick={() => setAdditionalWeeks(additionalWeeks + 1)}>+1 week</button>
        </div>
        <label htmlFor="competition-metric">{mode === 'skill' ? 'Skill' : 'Boss'}</label>
        <select id="competition-metric" value={metric} onChange={event => setMetric(event.target.value)}>
          {options.map(option => <option key={option} value={option}>{displayMetric(option)}</option>)}
        </select>
        <div className="date-grid">
          <div><span>Start</span><strong>{dates ? `${new Date(dates.startsAt).toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC` : '...'}</strong></div>
          <div><span>End</span><strong>{dates ? `${new Date(dates.endsAt).toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC` : '...'}</strong></div>
        </div>
        {competitionsInSelectedWeek.length > 0 && (
          <p>
            Existing competition this week:{' '}
            {competitionsInSelectedWeek.map((competition, index) => (
              <span key={competition.id}>
                {index > 0 ? ', ' : ''}
                <a href={`https://wiseoldman.net/competitions/${competition.id}/`} target="_blank" rel="noreferrer">
                  {competition.title}
                </a>
              </span>
            ))}
          </p>
        )}
        <button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create competition'}</button>
      </form>
      {status?.type === 'error' && <p className="form-message error">{status.message}</p>}
      {status?.type === 'success' && (
        <div className="form-message success">
          <strong>Competition created.</strong>
          <span>ID: {status.data.id}</span>
          {status.data.verificationCode && <span>Verification code: <code>{status.data.verificationCode}</code></span>}
        </div>
      )}
    </section>
  )
}

export default AdminPanel
