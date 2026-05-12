#!/usr/bin/env python3
"""
Native Ads Engine — live pipeline runner.

Usage:
    python3 run_pipeline.py "<run name>" <ad-file-path>           # default 2 passes (30 concepts)
    python3 run_pipeline.py "<run name>" <ad-file-path> --passes 3  # include pass 3

Streams output to Convex as it generates so the dashboard updates live.
"""
import argparse, json, os, sys, time, urllib.request, urllib.error, ssl, re, mimetypes
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock


def _load_env_local():
    env_path = Path(__file__).resolve().parent.parent / ".env.local"
    if not env_path.exists():
        return
    for raw in env_path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env_local()


def _required(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        sys.exit(f"missing env var: {name} (set in .env.local)")
    return v


CONVEX_URL = _required("NEXT_PUBLIC_CONVEX_URL")
GENESIS_URL = "https://genesis-openclaw-api.vercel.app/api/v1/chat/completions"
GENESIS_KEY = _required("GENESIS_API_KEY")
KIE_KEY = _required("KIE_API_KEY")
KIE_CREATE = "https://api.kie.ai/api/v1/jobs/createTask"
KIE_POLL = "https://api.kie.ai/api/v1/jobs/recordInfo"
OPENROUTER = "https://openrouter.ai/api/v1/chat/completions"
OR_KEY = _required("OPENROUTER_API_KEY")
MODEL_SLUG = "gpt-image-2-text-to-image"
MAX_RENDER_PARALLEL = 4
KIE_429_BACKOFF = 20
POLL_INTERVAL = 12

ctx = ssl.create_default_context()


SYS = (
    "You are unaware-static-image-ads-bot. Your job is to generate native, "
    "photographable, in-feed static image ad concepts based on ad copy. "
    "Each concept must be a specific scene a phone could photograph — concrete, "
    "real-world, scroll-stopping. No abstract or designed-looking layouts."
)

def pass1_msg(ad: str) -> str:
    return (
        "Here is the ad copy. Generate 20 in-feed native static image concepts based "
        "on this specific copy. Each concept must be a specific image that could actually "
        "be photographed with a phone. Not abstract ideas — concrete, photographable scenes. "
        "Include which reptile trigger(s) each concept hits. Include a Google search string "
        "for finding reference images.\n\nFormat each concept as:\n"
        "C{N}: {one-line scene description}\n"
        "Reptile triggers: {list}\n"
        "Google search: {string}\n\n"
        f"AD COPY:\n{ad}"
    )


PASS2_MSG = (
    "Now give me 10 MORE concepts that are stranger, more lateral, more adjacent. "
    "More weird, more intense, less literal. Objects and scenes that feel less "
    "like an ad and more like a thumb-stopping photo from someone's camera roll. "
    "Continue numbering from C21. Same format."
)
PASS3_MSG = (
    "Now give me 10 MORE concepts. Push even further: stranger, more lateral, more "
    "adjacent. Objects and scenes that have ZERO obvious connection to the ad but "
    "hit the same emotional frequency. Things you'd see scrolling and screenshot "
    "to send to a friend. Continue numbering from C31. Same format."
)

SYNTH = """Convert this image concept into a single text-to-image render prompt.

The image must look like a REAL iPhone 8 photo taken by someone with ZERO photography skills — your aunt grabbing her phone to snap something fast. NOT a professional photo. NOT staged. NOT well-composed.

REQUIRED visual cues to bake into the prompt:
- iPhone 8 era camera quality (12MP, visible digital noise in shadows, no portrait blur, no HDR)
- Amateur framing: slightly off-center, weird tilt, awkward crop, possibly a finger or thumb partially in frame
- Bad lighting — pick one: harsh flash that flattens everything; fluorescent overhead casting yellow-green tint; underexposed dim indoor; blown-out window backlight
- Slight motion blur or missed focus, BUT subject is still recognizable
- Mild JPEG compression artifacts in shadows and dark areas
- Flat, uncorrected phone colors — no grading, no warmth boost
- Casual snapshot energy — like someone whipped out their phone fast and didn't check the result
- Should feel like a screenshot from someone's camera roll, NOT an ad and NOT a stock photo
- 9:16 vertical phone orientation

AVOID THESE WORDS in the prompt: "cinematic", "professional", "studio", "DSLR", "shallow depth of field", "bokeh", "golden hour", "polished", "stunning", "beautiful", "perfect composition", "rule of thirds", "advertisement", "marketing", "high quality".

The goal: someone scrolling Instagram couldn't tell this from a real friend's post.

Output ONLY the render prompt text. No preamble. No quotes. No "Here is...". 80-130 words.

CONCEPT:
"""


def http(url, method="GET", headers=None, body=None, timeout=120):
    data = body.encode() if isinstance(body, str) else body
    req = urllib.request.Request(url, method=method, data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
        return r.status, r.read().decode()


def convex_call(name: str, args: dict, kind: str = "mutation"):
    body = json.dumps({"path": name, "args": args, "format": "json"}).encode()
    req = urllib.request.Request(
        f"{CONVEX_URL}/api/{kind}",
        method="POST",
        data=body,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60, context=ctx) as r:
        result = json.loads(r.read())
    if result.get("status") != "success":
        raise RuntimeError(f"Convex {name} failed: {result}")
    return result["value"]


def convex_upload(path: Path) -> str:
    upload_url = convex_call("images:generateUploadUrl", {})
    data = path.read_bytes() if isinstance(path, Path) else path
    mime = "image/png"
    if isinstance(path, Path):
        mime = mimetypes.guess_type(path.name)[0] or "image/png"
    req = urllib.request.Request(
        upload_url,
        method="POST",
        data=data,
        headers={"Content-Type": mime},
    )
    with urllib.request.urlopen(req, timeout=120, context=ctx) as r:
        return json.loads(r.read())["storageId"]


def convex_upload_bytes(data: bytes, mime: str = "image/png") -> str:
    upload_url = convex_call("images:generateUploadUrl", {})
    req = urllib.request.Request(
        upload_url,
        method="POST",
        data=data,
        headers={"Content-Type": mime},
    )
    with urllib.request.urlopen(req, timeout=120, context=ctx) as r:
        return json.loads(r.read())["storageId"]


def genesis_chat(messages, max_retries=3):
    body = json.dumps({"model": "unaware-static-image-ads-bot", "messages": messages, "stream": True})
    headers = {
        "Authorization": f"Bearer {GENESIS_KEY}",
        "X-Provider-Key": OR_KEY,
        "Content-Type": "application/json",
    }
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(GENESIS_URL, method="POST", data=body.encode(), headers=headers)
            chunks = []
            with urllib.request.urlopen(req, timeout=300, context=ctx) as r:
                for raw in r:
                    line = raw.decode("utf-8", errors="replace").strip()
                    if not line.startswith("data: "):
                        continue
                    payload = line[6:]
                    if payload == "[DONE]":
                        break
                    try:
                        ev = json.loads(payload)
                        choices = ev.get("choices") or []
                        if not choices:
                            continue
                        delta = choices[0].get("delta") or {}
                        if delta.get("content"):
                            chunks.append(delta["content"])
                    except json.JSONDecodeError:
                        continue
            return "".join(chunks)
        except Exception as e:
            print(f"  [genesis retry {attempt+1}]: {e}", flush=True)
            if attempt < max_retries - 1:
                time.sleep(15)
            else:
                raise


def openrouter_chat(prompt: str, model="anthropic/claude-sonnet-4.5", max_tokens=500):
    body = json.dumps(
        {"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": max_tokens}
    )
    headers = {"Authorization": f"Bearer {OR_KEY}", "Content-Type": "application/json"}
    status, text = http(OPENROUTER, "POST", headers, body, timeout=120)
    return json.loads(text)["choices"][0]["message"]["content"].strip()


def kie_create(prompt: str):
    payload = {
        "model": MODEL_SLUG,
        "input": {
            "prompt": prompt,
            "aspect_ratio": "9:16",
            "resolution": "1K",
            "output_format": "PNG",
        },
    }
    headers = {"Authorization": f"Bearer {KIE_KEY}", "Content-Type": "application/json"}
    status, text = http(KIE_CREATE, "POST", headers, json.dumps(payload), timeout=60)
    data = json.loads(text)
    if data.get("code") == 429:
        return None
    if data.get("code") != 200:
        raise RuntimeError(f"kie create error: {data.get('msg')}")
    return data["data"]["taskId"]


def kie_poll(task_id):
    headers = {"Authorization": f"Bearer {KIE_KEY}"}
    status, text = http(f"{KIE_POLL}?taskId={task_id}", "GET", headers, timeout=30)
    return json.loads(text)


def http_download_bytes(url) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120, context=ctx) as r:
        return r.read()


def parse_metadata(text: str) -> dict:
    triggers = re.search(r"Reptile triggers?:\s*([^\n]+)", text, re.IGNORECASE)
    search = re.search(r"Google search:\s*`?([^\n`]+)`?", text, re.IGNORECASE)
    return {
        "reptileTriggers": triggers.group(1).strip() if triggers else None,
        "googleSearch": search.group(1).strip() if search else None,
    }


def parse_concepts(text: str, start_n: int = 1) -> list[dict]:
    pattern = re.compile(r"(?:^|\n)[\s\*#\-_>]*(C\d+)[\s\*:.—\-\)]+", re.MULTILINE)
    matches = list(pattern.finditer(text))
    seen, concepts = set(), []
    for i, m in enumerate(matches):
        cid = m.group(1)
        n = int(cid[1:])
        if n < start_n or cid in seen:
            continue
        seen.add(cid)
        s = m.start()
        e = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        concepts.append({"id": cid, "text": text[s:e].strip(), "n": n})
    return concepts


def synth_and_render(concept: dict, run_id: str, pass_n: int, lock: Lock, counters: dict):
    """Synth a single concept's render prompt, fire kie.ai, poll, upload to Convex."""
    cid = concept["id"]
    try:
        # 1. Insert concept row in Convex
        meta = parse_metadata(concept["text"])
        concept_id = convex_call(
            "concepts:addConcept",
            {
                "runId": run_id,
                "cNumber": cid,
                "text": concept["text"],
                "reptileTriggers": meta["reptileTriggers"],
                "googleSearch": meta["googleSearch"],
                "pass": pass_n,
            },
        )
        with lock:
            counters["concepts"] += 1
            convex_call("runs:updateRun", {"runId": run_id, "totalConcepts": counters["concepts"]})

        # 2. Synth render prompt
        render_prompt = openrouter_chat(SYNTH + concept["text"])
        convex_call(
            "concepts:setRenderPrompt", {"conceptId": concept_id, "renderPrompt": render_prompt}
        )

        # 3. Fire kie.ai with retry on 429
        tid = kie_create(render_prompt)
        if tid is None:
            time.sleep(KIE_429_BACKOFF)
            tid = kie_create(render_prompt)
        if tid is None:
            print(f"  ✗ {cid}: kie 429 after backoff", flush=True)
            return
        with lock:
            counters["fired"] += 1
            convex_call("runs:updateRun", {"runId": run_id, "totalImages": counters["fired"]})

        # 4. Poll for result
        deadline = time.time() + 300
        while time.time() < deadline:
            time.sleep(POLL_INTERVAL)
            info = kie_poll(tid)
            if info.get("code") != 200:
                continue
            state = info["data"].get("state")
            if state == "success":
                rj = info["data"].get("resultJson")
                if not rj:
                    print(f"  ✗ {cid}: success state but no resultJson", flush=True)
                    return
                rd = json.loads(rj)
                urls = rd.get("resultUrls") or rd.get("imageUrls") or []
                if not urls:
                    print(f"  ✗ {cid}: no urls", flush=True)
                    return
                # 5. Download + upload to Convex storage
                data = http_download_bytes(urls[0])
                storage_id = convex_upload_bytes(data, "image/png")
                convex_call(
                    "images:recordImage",
                    {
                        "runId": run_id,
                        "conceptId": concept_id,
                        "cNumber": cid,
                        "model": MODEL_SLUG,
                        "storageId": storage_id,
                    },
                )
                with lock:
                    counters["completed"] += 1
                print(f"  ✓ {cid} ({counters['completed']} done)", flush=True)
                return
            if state == "failed":
                print(f"  ✗ {cid}: kie failed: {info['data'].get('failMsg')}", flush=True)
                return
        print(f"  ✗ {cid}: poll timeout", flush=True)
    except Exception as e:
        print(f"  ✗ {cid}: {e}", flush=True)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("name", help="Run name (e.g. 'Hox snoring v2')")
    p.add_argument("ad_file", help="Path to ad text file")
    args = p.parse_args()

    ad_text = Path(args.ad_file).read_text()
    print(f"\n=== {args.name} ===\n  3-pass mandatory | ad: {args.ad_file} ({len(ad_text)} chars)\n")

    # 1. Create run
    run_id = convex_call("runs:createRun", {"name": args.name, "adText": ad_text})
    print(f"run id: {run_id}")
    print(f"dashboard: https://native-ads-engine.vercel.app/runs/{run_id}\n")

    lock = Lock()
    counters = {"concepts": 0, "fired": 0, "completed": 0}
    convo = [{"role": "system", "content": SYS}]

    # Use one pool for the whole pipeline so concepts get rendered as soon as their pass completes.
    with ThreadPoolExecutor(max_workers=MAX_RENDER_PARALLEL) as pool:
        futures = []

        # PASS 1
        print("→ Pass 1 firing…", flush=True)
        t0 = time.time()
        convo.append({"role": "user", "content": pass1_msg(ad_text)})
        out = genesis_chat(convo)
        convo.append({"role": "assistant", "content": out})
        convex_call("runs:updateRun", {"runId": run_id, "pass1Raw": out, "passesCompleted": 1})
        print(f"  ← Pass 1 in {time.time()-t0:.1f}s", flush=True)
        for c in parse_concepts(out, start_n=1):
            futures.append(pool.submit(synth_and_render, c, run_id, 1, lock, counters))

        # PASS 2
        print("→ Pass 2 firing…", flush=True)
        t0 = time.time()
        convo.append({"role": "user", "content": PASS2_MSG})
        out = genesis_chat(convo)
        convo.append({"role": "assistant", "content": out})
        convex_call("runs:updateRun", {"runId": run_id, "pass2Raw": out, "passesCompleted": 2})
        print(f"  ← Pass 2 in {time.time()-t0:.1f}s", flush=True)
        for c in parse_concepts(out, start_n=21):
            futures.append(pool.submit(synth_and_render, c, run_id, 2, lock, counters))

        # PASS 3
        print("→ Pass 3 firing…", flush=True)
        t0 = time.time()
        convo.append({"role": "user", "content": PASS3_MSG})
        out = genesis_chat(convo)
        convo.append({"role": "assistant", "content": out})
        convex_call("runs:updateRun", {"runId": run_id, "pass3Raw": out, "passesCompleted": 3})
        print(f"  ← Pass 3 in {time.time()-t0:.1f}s", flush=True)
        for c in parse_concepts(out, start_n=31):
            futures.append(pool.submit(synth_and_render, c, run_id, 3, lock, counters))

        print(f"\nwaiting on {len(futures)} concept tasks…\n", flush=True)
        for fut in as_completed(futures):
            pass  # progress logged inside each task

    # finalize
    convex_call(
        "runs:updateRun",
        {
            "runId": run_id,
            "status": "complete" if counters["completed"] > 0 else "failed",
        },
    )
    print(f"\n=== DONE ===")
    print(f"  concepts: {counters['concepts']}")
    print(f"  fired:    {counters['fired']}")
    print(f"  completed: {counters['completed']}")
    print(f"\ndashboard: https://native-ads-engine.vercel.app/runs/{run_id}")


if __name__ == "__main__":
    main()
