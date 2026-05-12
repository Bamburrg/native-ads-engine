"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";

interface PageProps {
  params: Promise<{ id: string }>;
}

function Lightbox({
  imageUrl,
  cNumber,
  concept,
  renderPrompt,
  onClose,
}: {
  imageUrl: string;
  cNumber: string;
  concept: string;
  renderPrompt?: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-5xl mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{cNumber}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <img
              src={imageUrl}
              alt={cNumber}
              className="w-full h-auto rounded-lg border border-gray-200"
            />
          </div>
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold text-gray-900 mb-2">Concept</h3>
              <pre className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-3 rounded-lg">
                {concept}
              </pre>
            </section>
            {renderPrompt && (
              <section>
                <h3 className="font-semibold text-gray-900 mb-2">Render prompt</h3>
                <pre className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-3 rounded-lg text-xs">
                  {renderPrompt}
                </pre>
              </section>
            )}
            <a
              href={imageUrl}
              download={`${cNumber}.png`}
              className="inline-flex px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
            >
              Download image
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RunPage({ params }: PageProps) {
  const { id } = use(params);
  const runId = id as Id<"runs">;
  const run = useQuery(api.runs.getRun, { runId });
  const concepts = useQuery(api.concepts.listForRun, { runId });
  const images = useQuery(api.images.listForRun, { runId });
  const [openConcept, setOpenConcept] = useState<Doc<"concepts"> | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [showPass, setShowPass] = useState<number | null>(null);
  const [view, setView] = useState<"images" | "prompts">("images");

  if (run === undefined || concepts === undefined || images === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }
  if (run === null) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-gray-500">Run not found.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-gray-700 underline">
          Back to runs
        </Link>
      </div>
    );
  }

  const imagesByConcept = new Map<string, Doc<"images">[]>();
  for (const img of images) {
    const list = imagesByConcept.get(img.conceptId) ?? [];
    list.push(img);
    imagesByConcept.set(img.conceptId, list);
  }

  const passes = [run.pass1Raw, run.pass2Raw, run.pass3Raw];

  return (
    <div>
      <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
        ← All runs
      </Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{run.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {run.totalConcepts} concepts · {run.completedImages}/{run.totalImages} images ·
            status: {run.status}
          </p>
        </div>
        <button
          onClick={() => setShowAd((s) => !s)}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {showAd ? "Hide ad copy" : "Show ad copy"}
        </button>
      </div>

      {showAd && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Ad copy</h3>
          <pre className="whitespace-pre-wrap text-sm text-gray-700">{run.adText}</pre>
        </section>
      )}

      <section className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Raw bot output</h3>
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setShowPass(showPass === n ? null : n)}
              disabled={!passes[n - 1]}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border disabled:opacity-40 ${
                showPass === n
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              Pass {n}
            </button>
          ))}
        </div>
        {showPass && passes[showPass - 1] && (
          <pre className="mt-3 whitespace-pre-wrap text-xs text-gray-700 bg-white rounded-xl border border-gray-200 p-4 max-h-[400px] overflow-y-auto">
            {passes[showPass - 1]}
          </pre>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Concepts ({concepts.length})
          </h3>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setView("images")}
              className={`px-3 py-1 text-xs font-medium rounded ${
                view === "images" ? "bg-white shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Images
            </button>
            <button
              onClick={() => setView("prompts")}
              className={`px-3 py-1 text-xs font-medium rounded ${
                view === "prompts" ? "bg-white shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Prompts
            </button>
          </div>
        </div>

        {view === "images" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {concepts.map((concept) => {
              const conceptImages = imagesByConcept.get(concept._id) ?? [];
              const primaryImage = conceptImages[0];
              return (
                <button
                  key={concept._id}
                  onClick={() => primaryImage && setOpenConcept(concept)}
                  disabled={!primaryImage}
                  className="block bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-400 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="aspect-[9/16] bg-gray-100 relative">
                    {primaryImage ? (
                      <img
                        src={primaryImage.url}
                        alt={concept.cNumber}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-gray-400">
                        no image
                      </div>
                    )}
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                      {concept.cNumber}
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {concept.text.replace(/^C\d+[:\s\*\-—]*/, "").slice(0, 80)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {concepts.map((concept) => {
              const conceptImages = imagesByConcept.get(concept._id) ?? [];
              const primaryImage = conceptImages[0];
              return (
                <div
                  key={concept._id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-4">
                    {primaryImage ? (
                      <button
                        onClick={() => setOpenConcept(concept)}
                        className="block aspect-[9/16] bg-gray-100 rounded-md overflow-hidden hover:opacity-80"
                      >
                        <img
                          src={primaryImage.url}
                          alt={concept.cNumber}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      <div className="aspect-[9/16] bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-400">
                        no image
                      </div>
                    )}
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-gray-900 text-white text-xs font-mono rounded">
                          {concept.cNumber}
                        </span>
                        <span className="text-xs text-gray-500">pass {concept.pass}</span>
                        {concept.reptileTriggers && (
                          <span className="text-xs text-gray-500 truncate">
                            · {concept.reptileTriggers}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Bot concept</p>
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">
                          {concept.text.replace(/^[\*#\-_>\s]*C\d+[\s\*:.—\-\)]*/, "")}
                        </pre>
                      </div>
                      {concept.renderPrompt && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">
                            Sonnet render prompt (sent to gpt-image-2)
                          </p>
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans bg-gray-50 p-2 rounded">
                            {concept.renderPrompt}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {openConcept && (() => {
        const conceptImages = imagesByConcept.get(openConcept._id) ?? [];
        const img = conceptImages[0];
        if (!img) return null;
        return (
          <Lightbox
            imageUrl={img.url}
            cNumber={openConcept.cNumber}
            concept={openConcept.text}
            renderPrompt={openConcept.renderPrompt}
            onClose={() => setOpenConcept(null)}
          />
        );
      })()}
    </div>
  );
}
