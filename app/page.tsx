"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc } from "../convex/_generated/dataModel";

function StatusBadge({ status }: { status: Doc<"runs">["status"] }) {
  const styles: Record<typeof status, string> = {
    pending: "bg-gray-100 text-gray-700",
    running: "bg-yellow-100 text-yellow-800",
    complete: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HomePage() {
  const runs = useQuery(api.runs.listRuns);

  if (runs === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">No runs yet</h1>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Paste an ad into Claude Code and run the pipeline. Results will appear here as the
          concepts and images come in.
        </p>
        <Link
          href="/recipe"
          className="mt-6 inline-flex px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
        >
          Read the recipe
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Runs</h1>
          <p className="mt-1 text-sm text-gray-500">
            {runs.length} total · newest first
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {runs.map((run) => (
          <Link
            key={run._id}
            href={`/runs/${run._id}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-400 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 truncate pr-2">
                {run.name}
              </h3>
              <StatusBadge status={run.status} />
            </div>
            <p className="text-xs text-gray-500 mb-3">{formatDate(run._creationTime)}</p>
            <p className="text-sm text-gray-600 line-clamp-3 mb-3">
              {run.adText.slice(0, 200)}
              {run.adText.length > 200 ? "..." : ""}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{run.totalConcepts} concepts</span>
              <span>
                {run.completedImages}/{run.totalImages} images
              </span>
              <span>{run.passesCompleted}/3 passes</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
