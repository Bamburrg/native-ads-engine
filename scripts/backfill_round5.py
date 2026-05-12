#!/usr/bin/env python3
"""Backfill round 5 (Hox/snoring) results into Convex."""
import json, re, sys, urllib.request, urllib.error, ssl, mimetypes
from pathlib import Path

CONVEX_URL = "https://zany-clownfish-30.convex.cloud"
SRC = Path("/Users/vegasandbox/scrawls-test-output/round5-snoring-gpt2")
AD_TEXT = Path("/tmp/snoring_ad.txt").read_text()

ctx = ssl.create_default_context()


def call(name: str, args: dict, kind: str = "mutation"):
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


def upload_file(path: Path) -> str:
    """Generate upload URL, POST file, return storageId."""
    upload_url = call("images:generateUploadUrl", {})
    data = path.read_bytes()
    mime = mimetypes.guess_type(path.name)[0] or "image/png"
    req = urllib.request.Request(
        upload_url,
        method="POST",
        data=data,
        headers={"Content-Type": mime},
    )
    with urllib.request.urlopen(req, timeout=120, context=ctx) as r:
        result = json.loads(r.read())
    return result["storageId"]


def parse_metadata(concept_text: str) -> dict:
    """Extract reptile triggers and google search from concept text."""
    triggers = re.search(r"Reptile triggers?:\s*([^\n]+)", concept_text, re.IGNORECASE)
    search = re.search(r"Google search:\s*`?([^\n`]+)`?", concept_text, re.IGNORECASE)
    return {
        "reptileTriggers": triggers.group(1).strip() if triggers else None,
        "googleSearch": search.group(1).strip() if search else None,
    }


def main():
    print("=== Backfilling round 5 (Hox/snoring) into Convex ===\n")

    # 1. create run
    print("creating run row...")
    pass1 = (SRC / "passes" / "pass1.txt").read_text()
    pass2 = (SRC / "passes" / "pass2.txt").read_text()
    pass3 = (SRC / "passes" / "pass3.txt").read_text()
    run_id = call("runs:createRun", {
        "name": "Hox / anti-snoring (jaw device)",
        "adText": AD_TEXT,
    })
    print(f"  run id: {run_id}")

    call("runs:updateRun", {
        "runId": run_id,
        "pass1Raw": pass1,
        "pass2Raw": pass2,
        "pass3Raw": pass3,
        "passesCompleted": 3,
    })

    # 2. concepts
    print("\nuploading concepts...")
    concepts_data = json.loads((SRC / "concepts" / "all.json").read_text())
    concept_ids: dict[str, str] = {}
    for i, c in enumerate(concepts_data, 1):
        cid = c["id"]
        text = c["text"]
        meta = parse_metadata(text)
        # determine pass: 1=C1-20, 2=C21-30, 3=C31-40
        n = int(cid[1:])
        pass_n = 1 if n <= 20 else (2 if n <= 30 else 3)
        concept_id = call("concepts:addConcept", {
            "runId": run_id,
            "cNumber": cid,
            "text": text,
            "reptileTriggers": meta["reptileTriggers"],
            "googleSearch": meta["googleSearch"],
            "pass": pass_n,
        })
        concept_ids[cid] = concept_id
        # also add render prompt if it exists
        prompt_path = SRC / "prompts" / f"{cid}.txt"
        if prompt_path.exists():
            call("concepts:setRenderPrompt", {
                "conceptId": concept_id,
                "renderPrompt": prompt_path.read_text(),
            })
        print(f"  [{i}/{len(concepts_data)}] {cid}")

    call("runs:updateRun", {
        "runId": run_id,
        "totalConcepts": len(concepts_data),
        "totalImages": 0,  # will increment as we upload
    })

    # 3. images
    print("\nuploading images...")
    img_dir = SRC / "gpt-image-2"
    img_files = sorted(img_dir.glob("C*.png"), key=lambda p: int(re.sub(r"\D", "", p.stem) or "0"))
    success = 0
    for i, img_path in enumerate(img_files, 1):
        cid = img_path.stem
        if cid not in concept_ids:
            print(f"  [{i}/{len(img_files)}] {cid} SKIP — no concept")
            continue
        try:
            storage_id = upload_file(img_path)
            call("images:recordImage", {
                "runId": run_id,
                "conceptId": concept_ids[cid],
                "cNumber": cid,
                "model": "gpt-image-2-text-to-image",
                "storageId": storage_id,
            })
            success += 1
            print(f"  [{i}/{len(img_files)}] {cid} ✓")
        except Exception as e:
            print(f"  [{i}/{len(img_files)}] {cid} FAIL: {e}")

    # 4. finalize
    call("runs:updateRun", {
        "runId": run_id,
        "totalImages": len(img_files),
        "completedImages": success,
        "status": "complete",
    })

    print(f"\n=== DONE ===")
    print(f"run id: {run_id}")
    print(f"concepts: {len(concepts_data)}")
    print(f"images uploaded: {success}/{len(img_files)}")


if __name__ == "__main__":
    main()
