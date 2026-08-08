# Career Simulator

A browser football career simulator. You start at sixteen with a rating and a
vague idea of how good you might become, then pick a club every summer until you
retire. Runs entirely client-side — no backend, no accounts.

Two quizzes about real footballers sit alongside it: a tic tac toe grid of
clubs, countries and trophies, and a guess-the-player game. Both are played out
of a book of 1001 real footballers, both have a daily puzzle everybody in the
world shares, and both can be played against a friend anywhere through an
invite link. Neither needs a save, and there is still no backend: two browsers
talk to each other directly.

```bash
npm install
npm run dev        # http://localhost:5173
```

Available in German and English — the switch is in the top right, and the choice
sticks.

## Playing it on your phone

Both servers bind to every network interface, so anything on the same wifi can
reach them. Vite prints the address to open:

```bash
npm run dev       # http://<your-ip>:5173  — reloads on edit
npm run share     # http://<your-ip>:4173  — built once, much faster on a phone
```

Use `share` to actually play: the dev server compiles on demand, which a phone
feels. Find the address again later with `ipconfig` (look for IPv4 under your
active adapter) — a router hands it out by DHCP, so it can change after a
reboot.

Two things worth knowing:

- **Windows Firewall** must let `node.exe` accept incoming connections. If a
  phone times out, that is almost always why — allow it for private networks
  when the prompt appears.
- **Saves live in each device's browser.** A career started on the phone is not
  the one on the desktop. Export writes a `.json` you can import on the other
  device.

The machine running the command has to stay awake. For something permanent,
`dist/` after `npm run build` is a plain static folder — drop it on any web host,
a NAS, or a static host like Netlify or GitHub Pages. `base: './'` in the Vite
config keeps the asset paths relative, so it works from a subfolder too.

## Card tiers

The rating is a material, not just a number, and the thresholds are hard edges
so that crossing one is an event:

| tier | rating |
|---|---|
| Bronze | up to 64 |
| Silver | 65 – 74 |
| Gold | 75 – 84 |
| Rare Gold | 85 – 89 |
| Platinum | 90 – 98 |
| Icon | 99 |

Each tier is a flat metallic fill rather than a glow, and the player block
always shows how many points are left to the next one, because that is the
number people actually play for.

## Pace

The `1× 3× 5×` selector next to the play button decides how many seasons a
click covers, and the button spells out the consequence: *Play 5 seasons at
Werder Bremen*. Four modes in the gear menu set the default and how often life
gets in the way:

| mode | seasons per click | decisions |
|---|---|---|
| Blitz | 5 | rare |
| Quick | 3 | occasional |
| Normal | 1 | now and then |
| Story | 1 | almost every summer |

Three rules keep a fast-forward honest:

- **A run never moves you.** You stay at your club for the whole batch and the
  window opens once, at the end. Every transfer in a career is one you chose.
- **A decision pauses a run rather than ending it.** `Career.runLeft` carries
  what the click still owes; `closeEvent` plays it out. Clicking five seasons
  and getting one because something came up in year two is a broken promise.
- **Every click ends at a transfer window.** Five seasons land as five rows on
  the rail and the window opens on the left, with nothing to press Continue on.

## Two columns, two tenses

The career screen is a spread, and the two halves answer different questions.

**Left is the present tense.** The player card, the season you have just
played, and the one thing the game is waiting on. Nothing else is answerable,
so nothing else competes: `src/ui/Identity.tsx` for who you are,
`src/ui/SeasonPanel.tsx` for the year just gone, and under them the kick off,
the decision or the transfer window.

**Right is the whole career, by age.** `src/ui/Rail.tsx` draws it, and it runs
to forty whether you get there or not:

```
AGE  CAREER                         APPS  GLS   OVR
 ·   ⚑ Germany                        4    2     ·
16   ⬤ Sandhausen                    22    4    61
17   ⬤ Hertha Berlin  🏆             19    7    71
21   ⬤ Wolfsburg                     14    3    72
22   ⬤ Benfica        🏆             25    8    76
       2032/33   25 apps · 8 goals         76 +1
23   TO BE WRITTEN                               ?
25
27
…
39
```

Four things follow from that, and they are the point of it:

- **A career is measured in years, not in seasons.** Age is the number anybody
  actually thinks in, and the empty rows under the present are the part still
  to be played. They are the reason the column exists.
- **Consecutive seasons at one club are one row**, the way anybody would say it
  out loud. Coming back to a club years later is a second spell, not an
  amendment to the first.
- **The rail is a navigator.** Open a spell to list its seasons, click a season
  and it opens in the left hand column with its stat line, what the club did,
  what the ceiling did and what you decided that year. `Back to now` returns.
- **The rating is a flat tier block here** and nowhere else. Everywhere else in
  the game a tier is a rule under a numeral; in the rail it is the column you
  scan, and a career should be readable as a run of colour going one way or the
  other.

`CareerTable` still exists for the retirement board, where a finished career is
a record rather than a thing you are living.

## One currency

A decision spends rating points and nothing else. There is no form, no
reputation swing, no offer modifier hidden behind a choice: every branch is
a percentage and a signed number, and both are printed on the button.

```
Go under the knife          58%  +3      42%  −6
Rest it out                100%  −1
```

That is the whole interface for a gamble. Nothing to learn, nothing to look
up, and two options can be compared in a second. `EventEffect` in
`src/engine/events.ts` is deliberately three fields wide (`ovr`, `doping`,
`ban`) so it cannot drift back into a spreadsheet.

Two rules hold for the copy, both by hand in `src/i18n/strings.ts`: no number
is ever written into a sentence, and no dashes are used as punctuation.

## The idea

The setup screen asks four things: name, nationality, strong foot, position.
Then you play. Every time a run ends you get four to six offers, each showing
the role you would have there, worked out from your rating against that squad's
average. That is the whole game:

- **Minutes grow you.** A season as a key player at a mid-table club develops you
  faster than a season on a superclub's bench.
- **The league you play in matters, but does not cap you.** Scoring 25 in the
  third tier still raises your ceiling; it just raises it more slowly than
  scoring 15 in La Liga.
- **The ceiling is a range, not a number.** You are shown something like `60–90`
  at sixteen. It narrows every season and shifts with how you actually play. The
  true value is never displayed, but the season report tells you when it moved.
- **Past thirty the ceiling collapses onto your rating** and the decline begins.
  You retire when you choose, when nobody wants you, or at forty.

## Moments that matter

Nine decisions can interrupt a summer, each branch showing its odds and its
rating swing before you commit. Surgery, an extra summer in the gym, refusing
to train to force a move, the captain's armband, one season too many.

The longest thread is the banned programme. Taking it is +9 rating on the spot
and a test every season afterwards, starting at 10% and climbing about four
points a year. Getting caught is a two-year ban, minus twelve rating, and a
reputation that clubs remember. You can come off it at any point for -6. A
failed test lands on the season report it happened in, with its own banner,
because finding out by simply having no season next year is not a mechanic.

Measured over 200 careers with `scripts/balance.ts ST 200 reckless`, against a
bot that always declines:

| | never gambles | always gambles |
|---|---|---|
| peak rating (median) | 75 | **83** |
| 90th percentile | 92 | **97** |
| seasons played | 22.1 | 18.6 |
| career goals | 334 | 253 |
| major honours | 5.7 | 3.6 |
| Ballon d'Or in | 14.7% | **27.0%** |
| banned at some point | — | **98.0%** |

That is the shape the mechanic wants: it makes you a better player and gives you
a worse career. Knowing when to come off it is the actual skill.

Rolls are seeded on the event and the career, so reloading cannot change an
outcome you did not like. Every decision taken is kept in `eventLog` and listed
on the retirement screen, with runs of the same choice collapsed into one row.

## Transfers follow scouting routes

Offers are not drawn from a flat global talent pool, because real ones are not
either. `transferAffinity()` in `src/engine/career.ts` weighs a move by whether
it stays in the same country, the same football region, or crosses an ocean, and
whether it steps directly up or down your own league pyramid. Two things then
loosen that geography:

- **Reputation.** The distance penalty is damped as your level rises, so an
  unknown moves locally and a star can move anywhere.
- **Age.** Teenagers rarely cross a border. Saudi and MLS clubs buy reputation,
  so they come for you at thirty and ignore you at twenty-two.

The effect, measured over 600 windows per case with `scripts/transfers.ts`:

| starting point | most likely destination | offers from abroad |
|---|---|---|
| 20-year-old, 3. Liga, OVR 62 | 2. Bundesliga (32%) | 33% |
| 24-year-old, 2. Bundesliga, OVR 70 | 2. Bundesliga / Bundesliga | 35% |
| 26-year-old, Bundesliga, OVR 79 | Bundesliga (49%), then Serie A / PL / La Liga | 47% |
| 28-year-old, Bayern, OVR 89 | spread across the top five leagues | 55% |

## Layout

```
src/
  data/
    leagues.ts        30 divisions with strength, size, continental spots
    clubs.raw.json    curated club pool — "Club name|tier", 1 = title contender
    clubs.json        generated: the same clubs with crest URLs
    nations.ts        64 national teams with strength and confederation
  engine/
    rarity.ts         the six card tiers and their thresholds
    events.ts         the decision table: weights, choices, odds, rating swings
    types.ts          the shared shapes, modes and mode config
    rng.ts            seeded mulberry32 — a seed replays a career exactly
    sim.ts            one season: minutes, output, table, trophies, progression
    career.ts         career state machine, offers, transfer affinity
    storage.ts        localStorage saves, export/import
  i18n/
    strings.ts        every user-facing string, in German and English
    index.tsx         the provider, plus helpers for trophies and countries
  ui/                 screens and shared bits
                      Rail is the career by age, and the shape of the page
                      SeasonPanel reads one season, whichever the rail points at
                      LeagueTable rebuilds any standings from the seed
                      PenaltyScreen is the only thing that is not a simulation
scripts/
  fetch-badges.mjs    resolves crest URLs into clubs.json
  probe-missing.mjs   second pass for clubs spelled differently upstream
  balance.ts          runs hundreds of AI careers and prints the distributions
  transfers.ts        shows where offers actually come from
```

Nothing in the engine holds a rendered sentence. Trophies store an id plus what
they were won with, offers store which blurb to use, and retirement returns a
reason — all of it turned into text at draw time, so switching language
re-labels a finished career rather than leaving English fossils in the save.

## Where the numbers live

Almost all balancing sits in two places.

**`src/data/leagues.ts`** — `strength` is the average squad rating of a division
and the yardstick everything is measured against. `CLUB_TIER_OFFSET` turns a
club's tier into how far above or below its league it sits, so a Premier League
title contender is `78 + 7 = 85` and a relegation candidate is `78 - 6 = 72`.

**`src/engine/sim.ts`** — `PROFILE` is the per-90 output of an average player at
each position. `qualityMultiplier` and `creativityMultiplier` scale that by how
far you are above your division; both saturate deliberately, so a 99-rated
striker lands near 1.1 goals a game rather than two. `progress()` holds the
ageing curve, the potential drift and the narrowing of the visible range.

After changing any of it, check what you did to the game:

```bash
npx tsx scripts/balance.ts            # every position, 400 careers each
npx tsx scripts/balance.ts ST 1000    # one position, more samples
npx tsx scripts/transfers.ts          # where offers come from, by career stage
npx tsx scripts/balance.ts ST 200 reckless   # the same, but taking every gamble
```

It plays careers with a bot that always takes the best available role, so treat
the output as a good-player ceiling rather than an average. As shipped a striker
lands around a median peak of 76, with 90 at the ninetieth percentile.

`transferAffinity()` is the other dial worth knowing about. Its multipliers are
weighted against the whole club pool rather than pairwise: there are roughly ten
foreign clubs for every domestic one, so a mild home bias still sends most
players abroad. Raise the same-country multiplier to keep careers more local.

## Club data and crests

Clubs, leagues and tiers are hand-curated — no API supplies squad strength, and
that is the number the whole simulation turns on. Only the crests come from
outside, via [TheSportsDB](https://www.thesportsdb.com/):

```bash
npm run fetch:badges          # ~20 minutes, writes src/data/clubs.json
node scripts/probe-missing.mjs   # retries the ones spelled differently
OFFLINE=1 npm run fetch:badges   # rebuild from cache, no network
```

The free API key is capped at roughly 30 requests a minute and its list
endpoints return at most 10 rows, which is why the script looks clubs up one at
a time and sleeps between them. Results are cached in `scripts/.badge-cache.json`
so re-runs are cheap; a failed request is never cached as "no crest".

542 of 548 clubs currently resolve. The remaining six — Nottingham Forest, OH
Leuven, Wisła Płock, Al Ittihad, Al Shabab, San Lorenzo — are simply absent from
the free tier's search index and fall back to an initials badge. A paid key in
`SPORTSDB_KEY` would pick them up.

Crests are club trademarks. Fine for something you run yourself; think about it
before putting it behind a paywall.

## The final is a penalty

Knockout trophies are not awarded by a dice roll. The simulation decides
whether your club reaches the final; the final itself is one kick, taken by
you, in `takePenalty()`.

The keeper picks a corner on a stream seeded by the career and the season, so
his choice is fixed before you click and reloading cannot change it. Guessing
right does not automatically save it either: a good taker beats a keeper who
went the right way about a third of the time, more as your rating climbs. If
he went the other way and you still do not score, that is over the bar, not a
save, and the screen says so.

## Standings, on demand

Click any club anywhere in the game and its league table opens at that club's
row. Nothing is stored: `simulateTable()` runs on its own seeded stream keyed
on the career seed, the season and the league id, which is exactly the stream
the season itself used. What you see is what happened, rebuilt from three
numbers.

## Four grounds

The same design on four surfaces, cycled from the button in the bar and named
in the gear menu. Floodlights is the house style; the other three are
preferences, remembered per browser.

| ground | what it is | the loud colour |
|---|---|---|
| Floodlights | olive-black, a pitch at night | amber |
| Daylight | warm paper | amber, darkened |
| The pitch | deep grass | touchline white-green |
| The press | newsprint, the sports section | match-report red |

Each is nothing but a block of surface variables on `:root[data-theme='…']`.
No component knows which one is on, with two exceptions, both because contrast
is not a preference: the six rarity tiers are re-lit for the printed grounds,
and `--tier-fg` flips the ink on a filled tier block, since a tier is bright on
a dark ground and dark on paper.

The rest of the design holds itself to a short list: one accent colour used
sparingly, flat surfaces and hairline rules with no glows or decorative
gradients, Anton for anything that is a headline or a number that matters and
IBM Plex Sans for everything else, 96px between the major blocks of a page, and
a stated hover, active and focus at 200ms on everything you can click. The
rarity tiers are the single deliberate exception to the palette, because colour
there is data: a gold card has to look like a gold card.

## The player follows you down the page

The card at the top of the left column carries the name, the rating, the club,
the ceiling and the cabinet, with **age and market value set at rating size** —
they are the two numbers a career is discussed in, and they used to be four
words of metadata under the name.

The moment that card scrolls out of the window, the top bar takes the player
over: crest, name, age, value, rating underlined in its tier. It hands him back
when the card returns. An `IntersectionObserver` on the card itself does the
handover, rather than a scroll offset, so it stays right at any zoom or font
size.

## Eleven trophies, eleven drawings

`TROPHY_ART` in `src/ui/bits.tsx` draws each one: a plate for a league title, a
two-handled cup for a domestic one, tall ears for the continental, a figure
holding a globe for the World Cup, a boot, a glove, a ball on a plinth, a
shield for the team of the season. They used to share five silhouettes, which
meant the cabinet said how much you had won but never what.

Each is a *type* of trophy rather than a copy of a real one, drawn as a
silhouette plus one detail path at low opacity, in the current text colour — so
they work at 13px in a rail row and at any size in the cabinet, on all four
grounds, without needing a colour the palette does not have.

## Four things under the career

Under the career on the home screen sit two games, a cabinet and the book they
are all played out of. They share nothing with the simulation except the
ground, the type and the crests.

The book is `src/data/players.ts` and `src/data/legends2.ts` — **1001 real
players**, each with the senior clubs he played for in order, a country, a
position, a birth year and the honours that are unambiguous enough to ask
about. It runs from Pelé and Puskás to a seventeen year old at Porto, and it
covers current squads deep enough that a bench is answerable. No API supplies
it; a club id that is not in `clubs.json` will not compile, and
`npm run check:players` refuses a duplicate, a missing flag or a question
nobody in the book answers.

Honours that arrived after a career was first written down (a Club World Cup,
an Olympic gold, a Nations League) are patched on by id in `HONOUR_PATCH`
rather than by editing three hundred lines by hand.

**Football Tic Tac Toe** is the grid everyone knows. Three clubs along the top,
three of anything down the side — another club, a country, a division, a
trophy, a position, a decade, or a habit like "one club his whole career" — and
a name that belongs in both. `buildGrid()` in `src/engine/quiz.ts` draws six
criteria from a seed, forces the three down the side to be three *different*
kinds of question, then checks all nine intersections and throws the whole
board away if one of them has nobody in it. Difficulty is only that floor: four
answers a square, two, or one.

It is played four ways.

- **On your own.** Nine names, no opponent, and every square is worth the share
  of the answer sheet you used up: one of one is a hundred, one of twenty is
  five. The count of valid answers sits in the corner of every empty square
  before you commit, which turns the board into a series of small bets.
- **Against the computer.** It takes the win, blocks the loss, then takes the
  middle. The only thing it is bad at is remembering: it draws a blank on a
  share of its turns that the difficulty sets.
- **Against the person next to you**, one screen, turn about.
- **Against a friend anywhere**, through a link.

A wrong answer costs the turn, not the square, so the board keeps moving; the
same player cannot be used twice; three in a row wins, and a full board is
decided on count.

**Guess the Player** is one hidden footballer and eight guesses. Every name you
put in is measured against him on seven counts — country, position, birth year,
his league, his club, how many clubs, how many titles — and each comes back
lit, warm or dead. Warm is the useful one: the same confederation, the same
part of the pitch, a career that passed through the club he is at now, a year
within three. Every wrong guess also buys a clue, in the order they give him
away, ending with his initials. You can narrow the book to men still playing,
men who have finished, or men who won something. When he is out, his whole
career path and his silverware are shown.

Both games have a **daily**: one board and one hidden player that everybody in
the world gets on the same date, seeded off the day number, plus a result you
can copy into a group chat as squares without giving the answers away.

## Playing a friend through a link

Both games can be played against somebody who is not in the room, and nothing
of ours sits in the middle. Opening a room creates a WebRTC peer with a
five-character code; the other side pastes the code or follows a link with the
code already in it (`?room=ABCDE&game=grid`), and after a public broker has
introduced the two browsers every move travels directly between them.

`src/net/peer.ts` holds the connection and `src/net/useLobby.ts` holds it
steady across renders — a game cannot survive its socket being rebuilt
mid-turn. The signalling library is a hundred kilobytes, so it is fetched the
first time somebody actually opens a room and never on a first paint.

The side that opened the room owns the seed: it sends the board, and both
browsers build the identical grid from it. In the grid game turns alternate and
every move is a message; in the guessing game both of you get the same hidden
man and race, with the other one's guess count updating live.

## The cabinet

Fifteen things worth doing across the two games, each drawn as the trophy it
borrows its shape from — the European Cup with its ears, the World Cup as the
earth held up by two figures, a Ballon d'Or, an Olympic medal, a golden boot.
They are inline SVG with a metal gradient rather than photographs, so they
weigh nothing, never fail to load and print the same at thirteen pixels and at
a hundred. The same drawings label the honour rows on a grid, so "won the
Champions League" is a cup rather than a word. A locked award still shows its
drawing, greyed, because an empty shelf is the point of a cabinet.

Progress lives in this browser only, in a dozen numbers rather than a history.

## The book, open

There is no reason to keep the list shut, so `Das Lexikon` opens it: search a
name, filter by where he plays, sort by most clubs, most won or youngest, and
open anybody to see every club in order with its crest and every trophy he has.
It is also the fastest way to find out that the man you were sure about never
played there.

Typing is forgiving by design everywhere. `fold()` strips accents, apostrophes
and the Turkish dotless i, nicknames are searchable, and the only thing that
can ever be submitted is a player picked off the list — so a game is never lost
to a keyboard.

## Adding a language

Copy the `de` block in `src/i18n/strings.ts`, translate the values, and add the
language to `LANGS`. TypeScript will refuse to compile until every key is
present, so nothing can silently fall back to English. Country names live in
their own map at the bottom of the same file.

## Not in this version

Contracts, wages and money; individual attributes below the single OVR;
match-by-match simulation; manager relationships and morale.
