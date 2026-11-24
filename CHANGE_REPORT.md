# Space Shooter: Premium Campaign Upgrade: Change Report

Base: the `mini-game-arcade-zaim-space-shooter-fix` ZIP downloaded from the `space-shooter-fix` branch.
Scope: Space Shooter only. Nothing was merged, deployed or pushed. `main` was not touched.

---

## 1. What I found on the branch

The ZIP has no `.git` folder, so I compared it file by file with the original `main` ZIP you sent earlier.
The only difference was `README.md`. The game code, tests, pages and CSS were identical to `main`.
**No upgrade work existed on the branch**, so the whole upgrade was built from scratch on this base.

Baseline test results on the untouched branch:

| Suite | Result before | Cause |
|---|---|---|
| Gameplay regression | 44/46 | The two Space Shooter bugs below |
| Browser regression | 40/42 | The same two bugs, caught in real Chromium |
| Game, Arcade, Site structure, Render | all passing | |

## 2. Bugs fixed

| Bug | Root cause | Fix |
|---|---|---|
| Resume restarted the run | The overlay button was wired to `start()` in every state | One persistent primary button now routes by state: launch from the menu, `resume()` when paused, next/retry after results. `resume()` changes only the clock reference; nothing is reset |
| Holding P or Esc toggled pause repeatedly | `keydown` had no `e.repeat` guard | Repeats are ignored |
| Pause did not freeze timers | Shot cooldown, spawns, power-ups and invulnerability used `Date.now()` and `setTimeout` | Everything runs on a game clock advanced by `update(dt)` only while `PLAYING`. Particles, shake, star scroll, boss patterns and banners are included |
| Frame-rate dependent gameplay | Per-frame movement and a cooldown that snapped to frame boundaries | All movement uses `dt`. Fire rate carries the fractional remainder, so 30, 60 and 144 fps fire the same number of volleys (tested) |
| Stale mouse position after pausing | Found while reviewing input: a hovering mouse steered the ship to its old position on resume | Pointer steering is cleared on start and pause (regression test added) |
| Leaks | Window listener never removed, closure allocated every frame, pending timeout after destroy | Listeners removed in `destroy()`, one bound loop, no timeouts, pooled particles |

## 3. What was built

All in `js/games/space-shooter.js` (716 to 3,071 lines), organised as four blocks:
`SpaceShooterData` (content), `SpaceShooterSave` (storage), `SpaceShooterArt` (drawing), `SpaceShooterGame` (engine and screens).

**Ships.** Five, each with its own hand-drawn canvas artwork, weapon pattern and special ability:

| Ship | Price | Shield | Speed | Fire rate | Weapon | Ability |
|---|---|---|---|---|---|---|
| Vanguard | Free | 3 | 300 | 4.2/s | Twin pulse cannons | Pulse Wave: clears enemy fire, damages everything |
| Striker | 500 | 2 | 370 | 7.2/s | Alternating tracers | Afterburner: +50% speed and fire rate, ramming immunity |
| Bulwark | 1,500 | 5 | 235 | 3.0/s | Heavy slug with splash plus side guns | Aegis Barrier: absorbs hits and reflects bolts |
| Nova | 3,500 | 3 | 295 | 3.6/s | Piercing lance plus homing missiles | Nova Burst: ring of 28 piercing lances |
| Phantom | 7,000 | 3 | 345 | 4.6/s | Needle fan with 18% crits | Phase Cloak: intangible, +60% damage |

**Hangar.** Animated preview, stat bars, ability description, price and a clear Locked, Owned or Equipped state. Locked ships cannot be equipped, in the UI or through the engine API. Buying a ship equips it.

**Upgrades.** Damage (+12%/level), fire rate (+8%), shield (+1/+1/+2/+2/+3 cumulative, with auto-repair from level 3), speed (+6%), special ability (-7% cooldown, +10% power). Five levels each, 12,860 coins in total. The UI shows level pips, the next effect, the price, the exact shortfall when you cannot afford it, and a MAX state.

**Combat.**
- 7 enemy classes: drone, weaver, kamikaze, gunship, sniper (telegraphed shot), asteroid (splits), carrier (launches drones).
- Elites: 2.4x health, 3x points, 4x coins, always drop a power-up. They become more common in later sectors.
- 6 bosses, each with its own artwork, health bar and three phases: Rockjaw, Stormcaller, Scrapper, Hive Mother, Cryo Warden, The Eclipse.
- 5 power-ups: rapid fire, spread shot, overshield, repair and ability charge.
- Combo multiplier, hit sparks, explosions, shockwave rings, critical-hit text, screen shake and laser sprites.
- Boss supply drops: a repair at every boss warning, an ability charge at phase 2 and a repair at phase 3. I added these after simulation showed players arriving at bosses already drained.

**Campaign.**
- 6 sectors with their own palette, enemy mix and signature hazard: rock fields, lightning columns, drifting debris plus 35% extra coins, drone swarm formations, slippery ice plus icicles, and gravity wells.
- 18 missions (two objective missions and one boss mission per sector). Each has a bonus objective.
- Sector unlock chain, plus an endless Free Flight mode.
- 16 medals that pay coins.
- Rewards: first clear pays in full, replays pay 30%, 1 coin per 400 points, and coins you pick up are kept even when you fail.

**Interface.** DOM panels over a canvas, as you chose: main menu, hangar, upgrades, mission board, medals, gameplay HUD (canvas plus DOM), pause menu and results screen. Layouts adapt to the width of the game container, not the screen:
- Phone: five-tab bar, coin chip plus pinned launch button, snap-scrolling ship carousel, a relative-drag touch scheme that keeps the ship visible under your finger with auto-fire, a large FIRE button and an ability button with a cooldown fill. Touch targets are at least 44px (tested).
- Desktop: two-column hangar, three-up layouts where there is room.
- `prefers-reduced-motion` is respected.

**Saving.** Key `arcade_space_save_v1`, versioned and sanitised on every load, plus the original `arcade_space_highscore` which is still written exactly as before.
- Handles missing, corrupt, newer-format and blocked storage. Blocked storage shows a visible notice and the game still plays.
- Coins are banked on pause, abort, page hide and destroy, so a refresh mid-run cannot lose them.
- The Privacy Policy lists the new key. The site-structure storage audit passes.

## 4. Files changed (15: 2 added, 13 modified)

| File | Change |
|---|---|
| `js/games/space-shooter.js` | Rewritten (716 to 3,071 lines) |
| `css/arcade.css` | Appended a self-contained `.ss-*` Space Shooter section; nothing existing edited |
| `tests/space-shooter.test.js` | **New**: 89 tests (83 engine, 6 real-browser) |
| `CHANGE_REPORT.md` | **New**: this report |
| `package.json` | New suite added to `npm test` |
| `play/space-shooter.html` | Guide rewritten for the new game (tables generated from the game data). JSON-LD, FAQ (9 items), analytics and metadata kept consistent |
| `scripts/build-game-pages.js` | Space Shooter entry only (copy, controls, tips) plus the catalog blurb |
| `game/space-shooter.html` | Regenerated from the script |
| `game/brick-breaker.html`, `game/endless-runner.html`, `game/fruit-slice.html` | Regenerated; the only difference is the "related games" blurb that describes Space Shooter. No code touched |
| `js/arcade.js` | Space Shooter catalog description and controls text only (two strings) |
| `games.html` | The same two strings on the Space Shooter card |
| `privacy-policy.html` | One row added for `arcade_space_save_v1` |
| `README.md` | Feature row, test list, file tree and a Space Shooter notes section |

Not touched: the other nine games' code, `sitemap.xml`, `robots.txt`, `ads.txt`, the SEO and analytics tags, and all game and guide URLs. A comparison against the uploaded ZIP shows no original file was removed.

## 5. Feature checklist

Verified means an automated test or a measured check, described in section 6.

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | Resume continues the run | Done | Gameplay suite, browser suite and my own tests, including a real-time freeze test |
| 1 | Holding P or Esc does not flicker | Done | Gameplay and browser suites, and my tests |
| 2 | Five ships at the stated prices | Done | Data tests |
| 2 | Distinctive artwork and gameplay | Done | I inspected rendered sprites. Tests assert distinct weapon patterns, abilities and stats |
| 2 | Preview, stats, unlock, select; locked cannot be selected | Done | Engine, UI-HTML and real-browser tests |
| 3 | Damage, fire rate, shield, speed, ability upgrades | Done | Exact-price tests and tests that the numbers change in play |
| 3 | Levels, prices, locked and max states | Done | UI tests |
| 4 | Enemy classes with distinct behaviours | Done | Behaviour tests (steering, shooting, telegraph, spawning, splitting) |
| 4 | Elites | Done | Tests |
| 4 | Multiple bosses with health bars and patterns | Done | Six bosses with distinct fingerprints (tested) and rendered screenshots |
| 4 | Weapon effects and power-ups | Done | Tests; visual inspection |
| 4 | Explosions, particles, lasers, feedback | Done | Inspected in screenshots; pools bounded (tested) |
| 4 | Progressively harder | Done | Tests assert rising enemy health, fire rate, spawn pace, boss health and elite chance. The bot simulation confirms the curve |
| 5 | Six sectors, objectives, rewards, boss missions | Done | Data and flow tests |
| 5 | Achievements | Done | 16 medals, tested for single payout and persistence |
| 5 | Persistent progression | Done | Reload tests, node and real browser |
| 6 | Menu, hangar, upgrades, missions, HUD, pause, results | Done | HTML tests plus screenshots at desktop and phone sizes |
| 7 | Persist coins, ships, selection, upgrades, missions, medals | Done | Tests |
| 7 | Keep `arcade_space_highscore` | Done | Tests |
| 7 | Versioned, handles corrupt or missing data, does not reset progress | Done | Tests, including mutation checks |
| 7 | Privacy Policy updated | Done | Site-structure audit |
| 8 | URLs and guide unchanged and working | Done | Site and browser suites |
| 8 | Desktop and mobile controls | Done | Tests; phone viewport run in real Chromium |
| 8 | Frame-rate independence | Done | 30, 60 and 144 fps tests |
| 8 | Pause freezes everything | Done | Node snapshot test and a real-time browser test |
| 8 | No leaks | Done | 4-minute simulated flight in tests; heap measured flat |
| 8 | Other nine games intact | Done | All suites pass; no code in those games changed |
| 9 | Only Space Shooter plus shared integration | Done | See section 4 |

## 6. Exact test results

Final `npm test` run (exit code 0). The full output is in `TEST_RESULTS.txt`.

| Suite | Target | Result |
|---|---|---|
| `tests/game.test.js` (Game) | 11/11 | **11/11** |
| `tests/render.test.js` (Render) | pass | **pass** ("All rendering calls executed flawlessly") |
| `tests/arcade-games.test.js` (Arcade) | 24/24 | **24/24** |
| `tests/gameplay-regression.test.js` | 46/46 | **46/46** |
| `tests/site-structure.test.js` | 68/68 | **68/68** |
| `tests/space-shooter.test.js` (new) | n/a | **89/89** |
| `tests/browser-regression.test.js` | 42/42 | **42/42** |

The browser-dependent suites were run repeatedly (3 times for the new suite, 2 times for browser regression) with no failures.

**How I checked the tests can fail.** I deliberately broke the engine in six ways on a scratch copy: locked ships selectable, pause not freezing, frame-rate dependent fire rate, free ships, resume resetting the run, and a corrupt save crashing load. The new suite failed in every case.

## 7. Other verification

- **Visual.** I screenshotted every screen at desktop (1100 px) and phone (390 px) sizes in real Chromium, plus all six boss fights. This led to fixes for a clipped coin wallet, a tab bar overlapping content (a sticky element cannot escape its parent's content box), cramped three-column mission cards, an oversized phone hero, a results screen that hid its navigation, and touch buttons showing when not flying.
- **Frame pacing.** In real Chromium during a worst-case fight (final boss phase 3, about 54 to 80 bullets, beams, gravity well, ability use): average 16.67 ms, 99th percentile 18.8 ms, maximum 20.5 ms, zero frames over 25 ms across 715 frames. Game update cost averages 0.05 ms.
- **Memory.** Heap stayed at about 3.0 to 3.3 MB across six minutes of simulated Free Flight with garbage collection forced before each reading. All pools stay within their caps.
- **Balance.** A heuristic bot (predictive dodger) played the game headlessly. These numbers are bot results, not human results:
  - Bosses, with representative loadouts over 24 runs each:
    - Boss 1, base Vanguard: 23/24
    - Boss 2, Vanguard with light upgrades: 23/24
    - Boss 3, Vanguard with upgrades: 16/24; Bulwark: 24/24
    - Boss 4, Bulwark with upgrades: 24/24
    - Boss 5, Bulwark with upgrades: 12/24
    - Boss 6, Nova with upgrades: 16/24; fully upgraded Phantom: 24/24
  - Regular missions: 4/8 to 8/8 wins per mission, lasting about 45 to 100 seconds.
- **Console.** No script errors in any browser run. The only console noise is Google Fonts and Analytics failing to load in my offline sandbox.

## 8. Decisions I made that you may want to change

1. **Veteran bonus.** Players with an existing `arcade_space_highscore` and no campaign save start with `min(400, highScore / 8)` coins, so existing progress is honoured. It is applied once, and never to an existing save.
2. **Upgrades are global,** applying to every ship, rather than per ship.
3. **Replay rewards are 30%** of the mission reward (minimum 10 coins). Bonus objectives pay in full once, then 30%.
4. **Coins picked up are kept on failure,** and abort keeps them too.
5. **Medals are evaluated at the end of a run and on purchases,** not mid-run, so there is no in-flight toast.
6. **Boss supply drops** (see section 3) were added for balance.
7. **Sector 1 bonus** was relaxed from "Collect 2 power-ups" to "Collect a power-up" after the bot achieved it only 1 time in 8.
8. **Guide page.** `play/space-shooter.html` was regenerated from the game data with a one-off script that is not shipped. A test now fails if the guide's prices, rewards, boss names or upgrade costs drift from the game.

## 9. Remaining limitations

- **Branch not accessible.** I could not see git history, so "what was already on the branch" is based on a file diff against `main`. I cannot commit or push; copy the ZIP contents onto `space-shooter-fix` yourself.
- **Browsers.** Everything was verified in Chromium only. I did not test Safari, Firefox or real phones or tablets. Real touch feel (finger offset, palm rejection, iOS safe areas) is unverified. Layout uses CSS container queries (Chrome 105+, Safari 16+, Firefox 110+) with a media-query fallback that I wrote but did not browser-test.
- **Fonts.** Screenshots used fallback fonts because the sandbox is offline. The live site's display font has different metrics, so large headings may wrap slightly differently.
- **Balance is bot-derived.** I have no human playtest data. Difficulty may feel easier or harder than the numbers suggest, especially sectors 3 and 5.
- **Audio.** The game uses the site's existing sound methods and adds no new sounds. I could not listen to the output.
- **Progress is per browser.** There is no cloud sync, and clearing site data clears progress.
- **Guide drift.** The guide's tables are static HTML. The test catches drift in the values it checks, not in the prose.
