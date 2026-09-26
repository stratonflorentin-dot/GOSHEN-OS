"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  CheckCircle2,
  Grid2x2,
  Pause,
  Play,
  RotateCcw,
  Save,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { accuracyLabel, haversineM, pathLengthM, polygonAreaM2 } from "@/lib/geo";
import { formatAreaTriple, formatHa } from "@/lib/format";
import { createPlotAction } from "./actions";

const FarmMap = dynamic(() => import("@/features/map/MapLibreMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-muted/50 text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

type FarmOption = { farmId: string; name: string };

type Phase = "details" | "walking";

const ACCURACY_LIMIT_M = 30;
const MIN_DISTANCE_M = 2;

function fmtKm(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

function fmtClock(s: number): string {
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function NewPlotPage({ farms }: { farms: FarmOption[] }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("details");

  const [farmId, setFarmId] = useState(farms[0]?.farmId ?? "");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [plotType, setPlotType] = useState("plot");
  const [landUse, setLandUse] = useState("cropland");
  const [irrigationType, setIrrigationType] = useState("");
  const [soilTexture, setSoilTexture] = useState("");
  const [notes, setNotes] = useState("");

  const [points, setPoints] = useState<[number, number][]>([]);
  const [recording, setRecording] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const watchId = useRef<number | null>(null);
  const startedAt = useRef<number>(0);

  const acc = accuracyLabel(accuracy);
  const distance = pathLengthM(points);
  const area = polygonAreaM2(points);
  const hasBoundary = points.length >= 4;

  useEffect(() => {
    if (phase !== "walking" || !recording) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase, recording]);

  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  function beginWatch() {
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: a } = pos.coords;
        setAccuracy(a ?? null);
        setCoords([latitude, longitude]);
        if ((a ?? Infinity) <= ACCURACY_LIMIT_M) {
          setPoints((prev) => {
            const last = prev[prev.length - 1];
            if (last && haversineM(last, [latitude, longitude]) < MIN_DISTANCE_M) return prev;
            return [...prev, [latitude, longitude]];
          });
        }
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable it in your browser settings to walk the plot boundary."
            : "Could not get your location. Try moving to open sky.",
        );
        setRecording(false);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
  }

  function stopWatch() {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }

  function startWalk() {
    if (!("geolocation" in navigator)) {
      setError("Your browser does not support GPS location. You can still save the plot without a boundary.");
      return;
    }
    setError(null);
    setPoints([]);
    setElapsed(0);
    startedAt.current = Date.now();
    setRecording(true);
    setPhase("walking");
    beginWatch();
  }

  function togglePause() {
    if (recording) {
      stopWatch();
      setRecording(false);
    } else {
      startedAt.current = Date.now() - elapsed * 1000;
      setRecording(true);
      beginWatch();
    }
  }

  async function save() {
    if (!farmId) {
      setError("Select the farm this plot belongs to.");
      return;
    }
    if (!name.trim() || !code.trim()) {
      setError("Plot name and code are both required.");
      return;
    }
    stopWatch();
    setSaving(true);
    setError(null);
    const res = await createPlotAction({
      farmId,
      name: name.trim(),
      code: code.trim(),
      plotType,
      landUse,
      irrigationType: irrigationType || undefined,
      soilTexture: soilTexture || undefined,
      notes: notes.trim() || undefined,
      boundary: hasBoundary ? points : undefined,
      boundarySource: hasBoundary ? "gps_walk" : undefined,
    });
    if ("error" in res) {
      setSaving(false);
      setError(res.error);
      return;
    }
    router.push(`/plots/${res.plotId}`);
    router.refresh();
  }

  if (phase === "walking") {
    return (
      <div className="mx-auto max-w-lg">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Walk the plot boundary</h1>
          <button
            onClick={() => {
              stopWatch();
              setRecording(false);
              setPhase("details");
            }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">GPS accuracy</span>
            <span
              className={
                acc.tone === "good"
                  ? "font-medium text-success"
                  : acc.tone === "fair"
                    ? "font-medium text-warning"
                    : "font-medium text-destructive"
              }
            >
              {accuracy != null ? `${Math.round(accuracy)} m — ${acc.label}` : acc.label}
            </span>
          </div>

          <div className="mt-3 h-72 overflow-hidden rounded-2xl border border-black/5 sm:h-96">
            <FarmMap
              polygons={points.length >= 2 ? [{ id: "walk", name: "Plot", ring: points }] : []}
              center={coords ?? undefined}
              currentLocation={coords ? { point: coords, accuracy: accuracy ?? 5 } : undefined}
              zoom={18}
              initialView="satellite"
              showZoomControls
            />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Perimeter</dt>
              <dd className="font-semibold">{fmtKm(distance)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Points</dt>
              <dd className="font-semibold">{points.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Area</dt>
              <dd className="font-semibold">{area > 0 ? formatHa(area) : "Calculating…"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Elapsed</dt>
              <dd className="font-semibold">{fmtClock(elapsed)}</dd>
            </div>
          </dl>

          {area > 0 && <p className="mt-2 text-xs text-muted-foreground">{formatAreaTriple(area)}</p>}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              onClick={togglePause}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2.5 text-sm font-medium active:bg-black/5"
            >
              {recording ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {recording ? "Pause" : "Resume"}
            </button>
            <button
              onClick={() => setPoints((p) => p.slice(0, -1))}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2.5 text-sm font-medium active:bg-black/5"
            >
              <Undo2 className="h-4 w-4" /> Undo
            </button>
            <button
              onClick={() => {
                stopWatch();
                setPoints([]);
                setElapsed(0);
                startedAt.current = Date.now();
                setRecording(true);
                beginWatch();
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2.5 text-sm font-medium active:bg-black/5"
            >
              <RotateCcw className="h-4 w-4" /> Restart
            </button>
            <button
              onClick={() => {
                stopWatch();
                setRecording(false);
                setPhase("details");
              }}
              disabled={!hasBoundary}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition hover:bg-primary-600 disabled:opacity-40"
            >
              <CheckCircle2 className="h-4 w-4" /> Use boundary
            </button>
          </div>

          {!hasBoundary && (
            <p className="mt-3 text-xs text-muted-foreground">
              Walk at least 4 corners to close the polygon. Area is recalculated by PostGIS on save.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/plots"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to plots
      </Link>

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Grid2x2 className="h-5 w-5 text-primary-600" /> Add a plot
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A plot is a management unit inside a farm. You can walk its boundary now or add it later.
        </p>
      </div>

      {error && (
        <p className="mb-4 flex items-center gap-1.5 rounded-xl bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          <TriangleAlert className="h-4 w-4" /> {error}
        </p>
      )}

      <div className="card space-y-4 p-6">
        <div>
          <label htmlFor="farmId" className="field-label">Farm</label>
          <select
            id="farmId"
            value={farmId}
            onChange={(e) => setFarmId(e.target.value)}
            className="field-input"
            required
          >
            <option value="">Select a farm</option>
            {farms.map((f) => (
              <option key={f.farmId} value={f.farmId}>{f.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="field-label">Plot name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={160}
              placeholder="e.g. Plot A01"
              className="field-input"
            />
          </div>
          <div>
            <label htmlFor="code" className="field-label">Code</label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={40}
              placeholder="e.g. A01"
              className="field-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="plotType" className="field-label">Level</label>
            <select id="plotType" value={plotType} onChange={(e) => setPlotType(e.target.value)} className="field-input">
              <option value="block">Block</option>
              <option value="plot">Plot</option>
              <option value="subplot">Subplot</option>
            </select>
          </div>
          <div>
            <label htmlFor="landUse" className="field-label">Land use</label>
            <select id="landUse" value={landUse} onChange={(e) => setLandUse(e.target.value)} className="field-input">
              <option value="cropland">Cropland</option>
              <option value="pasture">Pasture</option>
              <option value="orchard">Orchard</option>
              <option value="greenhouse">Greenhouse</option>
              <option value="aquaculture">Aquaculture</option>
              <option value="fallow">Fallow</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="water">Water</option>
              <option value="forest">Forest</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="irrigationType" className="field-label">Irrigation (optional)</label>
            <select
              id="irrigationType"
              value={irrigationType}
              onChange={(e) => setIrrigationType(e.target.value)}
              className="field-input"
            >
              <option value="">Not set</option>
              <option value="rainfed">Rainfed</option>
              <option value="drip">Drip</option>
              <option value="sprinkler">Sprinkler</option>
              <option value="furrow">Furrow</option>
              <option value="flood">Flood</option>
              <option value="pivot">Pivot</option>
              <option value="manual">Manual</option>
              <option value="hose">Hose</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="soilTexture" className="field-label">Soil texture (optional)</label>
            <select
              id="soilTexture"
              value={soilTexture}
              onChange={(e) => setSoilTexture(e.target.value)}
              className="field-input"
            >
              <option value="">Not surveyed</option>
              <option value="sand">Sand</option>
              <option value="loamy_sand">Loamy sand</option>
              <option value="sandy_loam">Sandy loam</option>
              <option value="loam">Loam</option>
              <option value="silt_loam">Silt loam</option>
              <option value="clay_loam">Clay loam</option>
              <option value="clay">Clay</option>
              <option value="rock">Rock</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="field-label">Notes (optional)</label>
          <textarea id="notes" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} className="field-input" />
        </div>

        {hasBoundary && (
          <div className="rounded-xl bg-primary-50/60 p-3 text-sm">
            <p className="font-medium text-primary-800">Boundary captured</p>
            <p className="mt-0.5 text-xs text-primary-700">
              {points.length} points · {formatAreaTriple(area)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={startWalk}
            className="flex items-center justify-center gap-2 rounded-xl border border-black/10 py-2.5 text-sm font-medium active:bg-black/5"
          >
            {hasBoundary ? "Re-walk boundary" : "Walk boundary (GPS)"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition hover:bg-primary-600 disabled:opacity-40"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save plot"}
          </button>
        </div>
      </div>
    </div>
  );
}
