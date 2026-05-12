import Link from "next/link";

export default function RecipePage() {
  return (
    <article className="prose prose-sm max-w-3xl">
      <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 no-underline">
        ← All runs
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">
        SCRAWLS Copy-Derived — Recipe
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        The full methodology for the Native Ads Engine pipeline. Locked 2026-05-12.
      </p>

      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">TL;DR</h2>
        <p className="text-sm text-gray-700">
          Take ad copy → run it through a Genesis bot to extract photographable image
          concepts → convert each concept into an iPhone-8-amateur-style render prompt → render
          through OpenAI&apos;s GPT Image 2 on kie.ai. Output: 30 native-feed images per ad,
          end-to-end in ~3-5 minutes.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Pipeline</h2>
        <pre className="bg-white rounded-xl border border-gray-200 p-4 text-xs text-gray-700 overflow-x-auto">
{`AD COPY
   ↓
unaware-static-image-ads-bot via Genesis API
   Pass 1: 20 native concepts (literal, safe)
   Pass 2: 10 more (lateral, adjacent)
   Pass 3 [optional]: 10 more (zero-connection emotional frequency)
   ↓ ~30-40 concepts (each with reptile triggers + Google search string)
Concept extraction (regex parse on C{N}: pattern)
   ↓
Shitty-realistic synth (Sonnet 4.5 via OpenRouter, parallel)
   → 9:16 iPhone 8 amateur snapshot render prompts
   ↓
kie.ai render (gpt-image-2-text-to-image)
   ↓
9:16 PNGs at 1K resolution
   ↓
Upload to Convex → public CDN URLs → dashboard`}
        </pre>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Pass 1 prompt (verbatim)
        </h2>
        <pre className="bg-white rounded-xl border border-gray-200 p-4 text-xs text-gray-700 whitespace-pre-wrap">
{`Here is the ad copy. Generate 20 in-feed native static image concepts based on this specific copy. Each concept must be a specific image that could actually be photographed with a phone. Not abstract ideas — concrete, photographable scenes. Include which reptile trigger(s) each concept hits. Include a Google search string for finding reference images.

Format each concept as:
C{N}: {one-line scene description}
Reptile triggers: {list}
Google search: {string}

AD COPY:
{ad text here}`}
        </pre>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Pass 2 prompt (verbatim)
        </h2>
        <pre className="bg-white rounded-xl border border-gray-200 p-4 text-xs text-gray-700 whitespace-pre-wrap">
{`Now give me 10 MORE concepts that are stranger, more lateral, more adjacent. More weird, more intense, less literal. Objects and scenes that feel less like an ad and more like a thumb-stopping photo from someone's camera roll. Continue numbering from C21. Same format.`}
        </pre>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Pass 3 prompt (optional, verbatim)
        </h2>
        <pre className="bg-white rounded-xl border border-gray-200 p-4 text-xs text-gray-700 whitespace-pre-wrap">
{`Now give me 10 MORE concepts. Push even further: stranger, more lateral, more adjacent. Objects and scenes that have ZERO obvious connection to the ad but hit the same emotional frequency. Things you'd see scrolling and screenshot to send to a friend. Continue numbering from C31. Same format.`}
        </pre>
        <p className="text-xs text-gray-500 mt-2">
          Pass 3 generates the wildest concepts (goldfish, folding chair in empty parking lot,
          half-dead houseplant). High emotional resonance, but also higher risk for
          &ldquo;doesn&apos;t make sense for the ad.&rdquo; Default pipeline drops this pass.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Shitty-realistic synth prompt (Sonnet 4.5)
        </h2>
        <p className="text-xs text-gray-500 mb-2">
          Use Sonnet, NOT Haiku. Haiku ignores the negative constraints and slips back into
          &ldquo;cinematic / professional / studio&rdquo; defaults.
        </p>
        <pre className="bg-white rounded-xl border border-gray-200 p-4 text-xs text-gray-700 whitespace-pre-wrap">
{`Convert this image concept into a single text-to-image render prompt.

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
{concept text here}`}
        </pre>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Renderer setup</h2>
        <table className="w-full text-sm bg-white rounded-xl border border-gray-200 overflow-hidden">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-4 py-2 font-medium text-gray-700 w-48">Endpoint</td>
              <td className="px-4 py-2 text-gray-700 font-mono text-xs">
                POST https://api.kie.ai/api/v1/jobs/createTask
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium text-gray-700">Model slug</td>
              <td className="px-4 py-2 text-gray-700 font-mono text-xs">
                gpt-image-2-text-to-image
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium text-gray-700">Aspect ratio</td>
              <td className="px-4 py-2 text-gray-700 font-mono text-xs">9:16</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium text-gray-700">Resolution</td>
              <td className="px-4 py-2 text-gray-700 font-mono text-xs">1K</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium text-gray-700">output_format</td>
              <td className="px-4 py-2 text-gray-700 font-mono text-xs">
                &quot;PNG&quot; (uppercase — gpt-image-2 specific gotcha)
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium text-gray-700">Throttle</td>
              <td className="px-4 py-2 text-gray-700 text-xs">
                1.5s between createTask fires (kie.ai 429s at 8+ parallel)
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium text-gray-700">Cost per image</td>
              <td className="px-4 py-2 text-gray-700 text-xs">~$0.04</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium text-gray-700">Render time</td>
              <td className="px-4 py-2 text-gray-700 text-xs">~1-2 min per image</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Cost per run</h2>
        <p className="text-sm text-gray-700">
          30 concepts × $0.04 (gpt-image-2) + ~$0.10 OpenRouter Sonnet synth + Genesis API
          (free tier on Luke&apos;s key) ={" "}
          <strong className="text-gray-900">~$1.30 per run</strong> at 30-image default.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Why it works</h2>
        <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
          <li>
            <strong>3-pass conversation</strong> forces lateral expansion. Pass 1 alone returns
            literal/safe concepts. Pass 2 + Pass 3 unlock the weird, scroll-stopping, native
            concepts that don&apos;t look like ads.
          </li>
          <li>
            <strong>Reptile triggers + Google search strings</strong> per concept give downstream
            ops a reference-image research path.
          </li>
          <li>
            <strong>Sonnet synth with explicit anti-polish constraints</strong> stops image
            models from defaulting to stock-photo cleanliness.
          </li>
          <li>
            <strong>gpt-image-2</strong> handles the iPhone-amateur aesthetic best of the 4
            kie.ai models tested (vs nano-banana-pro, seedream-v4, imagen4-ultra).
          </li>
        </ul>
      </section>
    </article>
  );
}
