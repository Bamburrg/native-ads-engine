---
name: native-ads-engine
description: Generate native iPhone-style ad image concepts from any ad copy. Use when the user pastes an ad and wants 10 weird, lateral, "feels like a feeling" image ad concepts (the SCRAWLS Copy-Derived methodology). Runs a 3-pass conversation through Genesis bot for lateral priming, then renders only the most bizarre Pass 3 concepts through OpenAI gpt-image-2 in iPhone-8-amateur-snapshot style. Results stream to a hosted dashboard in real time. Trigger when the user shares ad copy and says anything like "run this", "generate concepts", "make image ads", "scrawls this", or just pastes ad text after the skill is mentioned.
---

# Native Ads Engine — SCRAWLS Copy-Derived Pipeline

## What this skill does

Takes ad copy → returns 10 native iPhone-style image ad concepts (the most bizarre, lateral, "feels like a feeling" outputs). Pipeline runs locally on the user's machine, results stream live to a hosted Convex + Vercel dashboard.

**Time:** ~3-5 min wall clock per run
**Cost:** ~$0.40/run (10 images × $0.04 on kie.ai gpt-image-2)
**Output:** dashboard URL with 10 PNG images at 1K resolution, 9:16 vertical, plus the bot concepts and Sonnet render prompts that produced them

## When to invoke

Invoke this skill automatically when:
- User pastes ad copy (long form, sales-y, video ad transcript) and asks to generate concepts/images
- User says "run this", "scrawls this", "generate native concepts", "fire the pipeline", "make ads from this"
- User mentions Native Ads Engine, NAE, or Copy-Derived

Do NOT invoke for:
- Static designed ads (testimonials, comparison tables, etc.) — that's a different pipeline
- Image edits / image-to-image work
- Single one-off image generation

## How to run

**Three steps. Fire them in this exact order.**

### Step 1: Save the ad to a temp file

```bash
cat > /tmp/scrawls_ad_$(date +%s).txt <<'AD_EOF'
[paste the user's full ad copy here, exactly as given]
AD_EOF
```

Use a unique filename per run (timestamped). The ad text is the COMPLETE copy the user provided — full paragraphs, all the lines.

### Step 2: Fire the pipeline

```bash
cd ~/.claude/skills/native-ads-engine
python3 run_pipeline.py "Short descriptive run name" /tmp/scrawls_ad_<timestamp>.txt
```

The run name should be 3-6 words capturing the ad's offer (e.g., "Hox snoring jaw device", "Type 2 metformin foot check", "Nuts metabolic type quiz").

The script will:
1. Print a dashboard URL — share this with the user IMMEDIATELY (don't wait for completion)
2. Fire 3 Genesis bot passes (~60s, only the 3rd is stored)
3. Synthesize render prompts for Pass 3's 10 concepts (Sonnet 4.5)
4. Fire kie.ai gpt-image-2 renders (with auto-retry on stall)
5. Upload PNGs to Convex as each completes
6. Print "✓ DONE" with completion stats

### Step 3: Tell the user the URL + status

Share the dashboard URL right after firing (don't wait). Then optionally watch for completion and report the final stats.

## Setup (one-time, before first run)

The skill needs three API keys (each user brings their own — no shared keys) in a `.env` file inside the skill directory:

```bash
cat > ~/.claude/skills/native-ads-engine/.env <<'EOF'
KIE_API_KEY=<your own kie.ai API key — sign up at https://kie.ai>
OPENROUTER_API_KEY=<your own OpenRouter key — sign up at https://openrouter.ai>
GENESIS_API_KEY=<your own Genesis bearer token — generate from Genesis admin panel>
EOF
```

The Convex URL defaults to the shared Native Ads Engine dashboard. All runs from any user land at https://native-ads-engine.vercel.app — to use your own private dashboard, deploy your own Convex instance and set `NEXT_PUBLIC_CONVEX_URL` in `.env`.

## What changes in the dashboard

After firing, the user can refresh the dashboard URL to see:
- Run name + ad copy + status (pending → running → complete)
- Live counter of concepts (1 of 10 → 10 of 10) and images
- "Images" view — 9:16 thumbnails, click any to lightbox with download button
- "Prompts" view — the bot's lateral concept text + the Sonnet-generated render prompt for each, all visible inline (this is what makes the methodology transparent)

## Common pitfalls

- **Insufficient kie.ai credits** — pipeline fails fast with "Credits insufficient" error. Tell user to top up at https://kie.ai (~$0.40/run, $20 buys ~50 runs).
- **Genesis 429 rate limit** — handled automatically (retries with backoff). If it fully fails, wait 30s and rerun.
- **kie.ai task stalls** — auto-retry handles this. If both attempts time out (rare), 1 image will be missing from the 10. Acceptable for V1.
- **Network drops mid-run** — pipeline is idempotent on Convex side (each task creates new rows). Just rerun.

## Why this exists

The SCRAWLS Copy-Derived methodology (Luke Belmar / Genesis): take ad copy, run it through a 3-pass lateral expansion to get bizarre native-looking image ad concepts that don't read as ads. The 3 passes prime the bot conversationally — Pass 3's wild outputs depend on Pass 1+2 being there even though only Pass 3 is stored.

The shitty-realistic synth converts each abstract concept into a specific iPhone-8-amateur-snapshot render prompt (no "cinematic / professional / DSLR" — explicit anti-polish vocabulary) so gpt-image-2 produces images that pass for real iPhone camera roll snaps, not stock photos or designed ads.

## Reference

- Live dashboard: https://native-ads-engine.vercel.app
- Source repo: https://github.com/Bamburrg/native-ads-engine
- Recipe doc (full methodology): https://native-ads-engine.vercel.app/recipe
