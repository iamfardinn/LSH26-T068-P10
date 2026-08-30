import { useRef, useState } from 'react';
import { UploadCloud, RotateCcw, FileJson, ListChecks } from 'lucide-react';
import type { Household } from '../lib/data';
import { parseCaseJsonText, parseCaseObject, type FixtureCaseSummary } from '../lib/caseLoader';

export function CaseLoaderCard({
  onLoad,
  onReset,
  activeCaseId,
  isCustom,
}: {
  onLoad: (h: Household) => void;
  onReset: () => void;
  activeCaseId: string;
  isCustom: boolean;
}) {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loadedName, setLoadedName] = useState<string | null>(null);
  const [availableCases, setAvailableCases] = useState<FixtureCaseSummary[] | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function tryLoad(source: string, label: string | null) {
    const result = parseCaseJsonText(source);

    if (result.needsSelection && result.availableCases) {
      // The upload was the whole fixture file (many cases), not one case
      // — ask which one to load instead of guessing.
      setErrors([]);
      setAvailableCases(result.availableCases);
      setSelectedCaseId(result.availableCases[0].caseId);
      setLoadedName(label);
      return;
    }

    setAvailableCases(null);
    if (!result.ok || !result.household) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    setLoadedName(label);
    onLoad(result.household);
  }

  function loadSelectedCase() {
    const entry = availableCases?.find((c) => c.caseId === selectedCaseId);
    if (!entry) return;
    const result = parseCaseObject(entry.raw);
    if (!result.ok || !result.household) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    onLoad(result.household);
  }

  async function handleFile(file: File) {
    const content = await file.text();
    setText(content);
    tryLoad(content, file.name);
  }

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Upload a case file (.json)
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600"
          >
            <UploadCloud size={18} /> Click to choose a case JSON file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </div>

        <div className="flex-1">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            …or paste the case JSON directly
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'{ "case_id": "...", "opening_balance_bdt": "350.00", "days": [...], "recharges": [...], "today": "2026-06-30", "usual_daily_units": 19, "target_date": "2026-08-13", "comparison": {...} }'}
            rows={4}
            className="font-mono-num w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-indigo-500 focus:ring-2"
          />
          <button
            type="button"
            onClick={() => tryLoad(text, 'pasted JSON')}
            disabled={!text.trim()}
            className="mt-2 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileJson size={14} /> Load this case
          </button>
        </div>
      </div>

      {availableCases && (
        <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
            <ListChecks size={14} /> This file has {availableCases.length} cases — pick one to load
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none ring-indigo-500 focus:ring-2"
            >
              {availableCases.map((c) => (
                <option key={c.caseId} value={c.caseId}>
                  {c.caseId}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadSelectedCase}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
            >
              <FileJson size={14} /> Load selected case
            </button>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <div className="font-semibold">Couldn't load that case:</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500">
        <span>
          Active case: <b className="text-slate-900">{activeCaseId}</b>
          {isCustom && ' (loaded from file/paste)'}
          {loadedName && isCustom && <> — {loadedName}</>}
        </span>
        {isCustom && (
          <button
            type="button"
            onClick={() => {
              setText('');
              setErrors([]);
              setLoadedName(null);
              setAvailableCases(null);
              onReset();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-600 transition hover:border-slate-400"
          >
            <RotateCcw size={13} /> Reset to sample data (PUB-01)
          </button>
        )}
      </div>
    </div>
  );
}
