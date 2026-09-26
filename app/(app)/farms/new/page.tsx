"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPinned,
  Pause,
  Play,
  Undo2,
  RotateCcw,
  CheckCircle2,
  TriangleAlert,
  Save,
} from "lucide-react";
import dynamic from "next/dynamic";
import { haversineM, pathLengthM, polygonAreaM2, accuracyLabel } from "@/lib/geo";
import { formatHa } from "@/lib/format";
import { createFarmAction } from "./actions";

const FarmMap = dynamic(() => import("@/features/map/MapLibreMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-muted/50 text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

type Phase = "details" | "walking" | "complete";
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

export default function NewFarmPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("details");

  // Details
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [ward, setWard] = useState("");
  const [village, setVillage] = useState("");
  const [farmType, setFarmType] = useState("mixed");

  // GPS walk
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
  const validPolygon = points.length >= 4;
  const accGood = accuracy != null && accuracy <= ACCURACY_LIMIT_M;

  useEffect(() => {
    if (phase !== "walking" || !recording) return;
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
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
            ? "Location permission denied. Enable it in your browser settings to walk the boundary."
            : "Could not get your location. Try moving to open sky.",
        );
        setRecording(false);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
  }

  function startWalk() {
    if (!("geolocation" in navigator)) {
      setError("Your browser does not support GPS location.");
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

  function stopWatch() {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }

  function finishWalk() {
    stopWatch();
    setRecording(false);
    setPhase("complete");
  }

  function undoPoint() {
    setPoints((prev) => prev.slice(0, -1));
  }

  function restart() {
    stopWatch();
    setPoints([]);
    setElapsed(0);
    startedAt.current = Date.now();
    setRecording(true);
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
    if (!name.trim()) {
      setError("Give the farm a name before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await createFarmAction({
      name: name.trim(),
      farmType,
      region: region.trim() || undefined,
      district: district.trim() || undefined,
      ward: ward.trim() || undefined,
      village: village.trim() || undefined,
      boundary: points.length >= 4 ? points : undefined,
    });
    if ("error" in res && res.error) {
      setSaving(false);
      setError(res.error);
      return;
    }
    router.push("/farms");
    router.refresh();
  }

  if (phase === "details") {
    return (
      <div className="mx-auto max-w-md">
        <Link href="/farms" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to farms
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Create a farm</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the farm details, then walk its boundary with your phone.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            startWalk();
          }}
          className="card mt-5 space-y-4 p-6"
        >
          <div>
            <label htmlFor="farm-name" className="field-label">Farm name</label>
            <input
              id="farm-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={160}
              placeholder="e.g. Bagamoyo Farm"
              className="field-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="region" className="field-label">Region</label>
              <input id="region" value={region} onChange={(e) => setRegion(e.target.value)} className="field-input" />
            </div>
            <div>
              <label htmlFor="district" className="field-label">District</label>
              <input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} className="field-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ward" className="field-label">Ward</label>
              <input id="ward" value={ward} onChange={(e) => setWard(e.target.value)} className="field-input" />
            </div>
            <div>
              <label htmlFor="village" className="field-label">Village</label>
              <input id="village" value={village} onChange={(e) => setVillage(e.target.value)} className="field-input" />
            </div>
          </div>
          <div>
            <label htmlFor="farm-type" className="field-label">Farm type</label>
            <select
              id="farm-type"
              value={farmType}
              onChange={(e) => setFarmType(e.target.value)}
              className="field-input"
            >
              <option value="mixed">Mixed</option>
              <option value="crop">Crop</option>
              <option value="livestock">Livestock</option>
              <option value="aquaculture">Aquaculture</option>
              <option value="agroforestry">Agroforestry</option>
            </select>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white transition hover:bg-primary-600"
          >
            <MapPinned className="h-4 w-4" />
            Start recording boundary
          </button>
        </form>
      </div>
    );
  }

  if (phase === "walking") {
    return (
      <div className="mx-auto max-w-lg">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Walk the farm boundary</h1>
          <button
            onClick={() => {
              stopWatch();
              setPhase("details");
            }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Cancel
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
              polygons={points.length >= 2 ? [{ id: "walk", name: "Boundary", ring: points }] : []}
              center={coords ?? undefined}
              zoom={17}
              showZoomControls={false}
            />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Distance</dt>
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

          {coords && (
            <p className="mt-2 text-xs text-muted-foreground">
              Current position: {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              onClick={togglePause}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2.5 text-sm font-medium active:bg-black/5"
            >
              {recording ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {recording ? "Pause" : "Resume"}
            </button>
            <button
              onClick={undoPoint}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2.5 text-sm font-medium active:bg-black/5"
            >
              <Undo2 className="h-4 w-4" /> Undo
            </button>
            <button
              onClick={restart}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2.5 text-sm font-medium active:bg-black/5"
            >
              <RotateCcw className="h-4 w-4" /> Restart
            </button>
            <button
              onClick={finishWalk}
              disabled={points.length < 4}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition hover:bg-primary-600 disabled:opacity-40"
            >
              <CheckCircle2 className="h-4 w-4" /> Finish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Complete: save screen
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold tracking-tight">Farm boundary complete</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Review the captured boundary, name the farm, and save.
      </p>

      <div className="card mt-5 p-5">
        <div className="h-56 overflow-hidden rounded-2xl border border-black/5">
          <FarmMap
            polygons={points.length >= 2 ? [{ id: "preview", name: "Boundary", ring: points }] : []}
            showZoomControls={false}
          />
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Area</span>
            <span className="font-semibold">{formatHa(area)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Perimeter</span>
            <span className="font-semibold">{fmtKm(distance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">GPS accuracy</span>
            <span className={accGood ? "font-medium text-success" : "font-medium text-warning"}>
              {acc.label}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Polygon</span>
            <span className={validPolygon ? "font-medium text-success" : "font-medium text-destructive"}>
              {validPolygon ? "Valid" : "Not enough points"}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="farm-name-final" className="field-label">Farm name</label>
          <input
            id="farm-name-final"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={160}
            className="field-input"
          />
        </div>

        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
            <TriangleAlert className="h-4 w-4" /> {error}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => setPhase("details")}
            className="rounded-xl border border-black/10 py-2.5 text-sm font-medium active:bg-black/5"
          >
            Edit
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition hover:bg-primary-600 disabled:opacity-40"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save farm"}
          </button>
        </div>
      </div>
    </div>
  );
}
