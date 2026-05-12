# Native Ads Engine — Claude Code Skill

Generate 10 native iPhone-style ad image concepts from any ad copy, in ~3-5 minutes, for ~$0.40. Built on the SCRAWLS Copy-Derived methodology (Luke Belmar / Genesis).

## What you get

Paste an ad into Claude Code → a script runs locally → 10 PNG images appear at the shared dashboard at **https://native-ads-engine.vercel.app**.

Each image is a 9:16 vertical native-feed concept that looks like a real iPhone camera-roll snap, not a designed ad. The 10 concepts come from the wildest, most lateral pass of a 3-pass conversation through the `unaware-static-image-ads-bot` on Genesis — the kind of weird-but-emotionally-resonant images that stop a thumb mid-scroll.

## Install (one-time)

### 1. Drop the skill into your Claude Code skills directory

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/Bamburrg/native-ads-engine.git /tmp/nae-clone
cp -r /tmp/nae-clone/skill ~/.claude/skills/native-ads-engine
rm -rf /tmp/nae-clone
```

(Or just download the `skill/` folder from the repo and drop it at `~/.claude/skills/native-ads-engine/`.)

### 2. Get your own API keys (all three — no shared keys)

| Key | Where | Cost |
|---|---|---|
| **kie.ai** | https://kie.ai → sign up → API Keys | ~$0.04/image, ~$0.40/run. $20 buys ~50 runs. |
| **OpenRouter** | https://openrouter.ai → Keys | ~$0.05/run for Sonnet synth |
| **Genesis API** | Genesis admin panel — generate your own bearer token | Free with key |

### 3. Configure the env file

```bash
cp ~/.claude/skills/native-ads-engine/.env.example ~/.claude/skills/native-ads-engine/.env
# then edit ~/.claude/skills/native-ads-engine/.env and fill in the three keys
```

That's it.

## Use it

In any Claude Code conversation, paste an ad and say something like "run this through the native ads engine" or just "generate concepts from this":

```
[paste the full ad copy as a multi-line message]

run this through the native ads engine
```

Claude will automatically invoke the skill, save your ad to a temp file, fire the pipeline, and print the dashboard URL. Refresh the dashboard URL to see images appear in real time as they render (~3-5 min total).

## What the dashboard shows

- **`/`** — list of all runs, newest first (everyone using the shared dashboard sees the same list)
- **`/runs/[id]`** — single run detail:
  - Show ad copy toggle
  - **Images view** — 10 thumbnails, click any to open lightbox with the full image, the bot's concept text, the Sonnet render prompt, and a download button
  - **Prompts view** — every concept's bot text + render prompt visible inline (no clicks needed)
- **`/recipe`** — the full methodology: pipeline diagram, all 3 pass prompts verbatim, the Sonnet shitty-realistic synth prompt verbatim, kie.ai setup table, cost notes

## Pipeline at a glance

```
AD COPY (any length)
  ↓
Genesis bot — 3 passes (~60s, only the 3rd is stored)
  Pass 1: 20 literal concepts (discarded — used to prime the bot)
  Pass 2: 10 lateral concepts (discarded — used to prime the bot)
  Pass 3: 10 zero-connection emotional-frequency concepts (KEPT)
  ↓
Sonnet 4.5 — convert each concept to an iPhone-8-amateur snapshot prompt
  ↓
kie.ai gpt-image-2 — render each concept as 9:16 1K PNG (with auto-retry)
  ↓
Convex storage + dashboard
```

The 3-pass priming is what makes Pass 3 produce "feels like a feeling" outputs (a half-dead houseplant, a folding chair in an empty parking lot, a goldfish in a bowl) that emotionally resonate with the ad without literally depicting the product.

## Costs (real-world)

| Item | Per run |
|---|---|
| 10 × gpt-image-2 renders | ~$0.40 |
| 1 × Sonnet 4.5 synth (10 prompts in parallel) | ~$0.05 |
| Genesis API (3 passes) | $0 (free with key) |
| **Total** | **~$0.45** |

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Credits insufficient" error | kie.ai balance empty | Top up at https://kie.ai |
| "missing env var" error | `.env` file not found or key not set | Verify `~/.claude/skills/native-ads-engine/.env` exists with all 3 keys |
| Pipeline runs but only 9/10 images appear | One kie.ai task stalled — auto-retry also failed | Acceptable. Rerun if you really need all 10. |
| Dashboard shows old/different runs | You're using the shared dashboard | Working as intended — everyone with the skill lands here. To get your own private dashboard, deploy your own Convex instance and override `NEXT_PUBLIC_CONVEX_URL` in `.env`. |

## Files in the skill

```
~/.claude/skills/native-ads-engine/
├── SKILL.md              # Trigger instructions for Claude Code (don't edit)
├── README.md             # This file (human-readable setup guide)
├── run_pipeline.py       # The pipeline (don't edit unless you know what you're doing)
├── .env.example          # Template — copy to .env and fill in keys
└── .env                  # Your secrets (you create this — do NOT commit)
```

## Source + repo

https://github.com/Bamburrg/native-ads-engine

The dashboard frontend (Next.js + Vercel) and Convex backend live in the same repo. The pipeline runs locally on your machine so you control your own kie.ai / OpenRouter spend.

## License

MIT — use it, fork it, modify it. Attribution to the SCRAWLS methodology (Luke Belmar / Genesis) appreciated.
