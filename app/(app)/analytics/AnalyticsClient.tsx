"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart, TrendingUp, ChevronLeft, ChevronRight, Calendar, Download } from "lucide-react";
import { formatCurrency } from "@/lib/format";

// Use a simple ref-based approach instead of dynamic import for echarts
let echartsInstance: any = null;
async function loadECharts() {
  if (echartsInstance) return echartsInstance;
  const mod = await import("echarts");
  echartsInstance = mod;
  return echartsInstance;
}

type KpiCard = {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; label: string };
  color?: string;
};

const KPI_CARDS: KpiCard[] = [
  { label: "Total Revenue", value: 0, icon: TrendingUp, color: "text-success" },
  { label: "Total Expenses", value: 0, icon: TrendingUp, color: "text-destructive" },
  { label: "Net Profit", value: 0, icon: TrendingUp, color: "text-primary" },
  { label: "Crop Margin", value: "0%", icon: TrendingUp, color: "text-success" },
  { label: "Livestock Margin", value: "0%", icon: TrendingUp, color: "text-warning" },
  { label: "Inventory Value", value: 0, icon: TrendingUp, color: "text-muted-foreground" },
];

export default function AnalyticsPage({ initialKpis, farmId }: { initialKpis: any; farmId: string }) {
  const [kpis, setKpis] = useState(initialKpis);
  const [period, setPeriod] = useState<{ from: string; to: string }>({
    from: new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });
  const [plotPerf, setPlotPerf] = useState<any[]>([]);
  const [cropPerf, setCropPerf] = useState<any[]>([]);
  const [livestockPerf, setLivestockPerf] = useState<any[]>([]);
  const [seasonComp, setSeasonComp] = useState<any[]>([]);
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "plots" | "crops" | "livestock" | "seasons" | "cashflow">("overview");

  const chartRefs = useRef<Record<string, any>>({});

  async function fetchAnalytics() {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        farmId,
        from: period.from,
        to: period.to,
      });
      const fetchJson = async (path: string) => {
        const response = await fetch(`${path}?${params}`);
        const body = await response.json();
        if (!response.ok) {
          throw new Error(typeof body?.error === "string" ? body.error : "Analytics data could not be loaded.");
        }
        return body;
      };
      const [k, plots, crops, livestock, seasons, cash] = await Promise.all([
        fetchJson("/api/analytics/kpis"),
        fetchJson("/api/analytics/plots"),
        fetchJson("/api/analytics/crops"),
        fetchJson("/api/analytics/livestock"),
        fetchJson("/api/analytics/seasons"),
        fetchJson("/api/analytics/cashflow"),
      ]);
      setKpis(k);
      setPlotPerf(plots);
      setCropPerf(crops);
      setLivestockPerf(livestock);
      setSeasonComp(seasons);
      setCashFlow(cash);
    } catch (e) {
      console.error(e);
      setLoadError("Some analytics could not be refreshed. Showing the latest available farm totals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, [period, farmId]);

  useEffect(() => {
    if (!loadError) return;
    const timeout = window.setTimeout(() => setLoadError(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [loadError]);

  function renderChart(id: string, option: any) {
    const el = document.getElementById(id);
    if (!el) return;
    loadECharts().then((echarts) => {
      if (chartRefs.current[id]) {
        chartRefs.current[id].setOption(option, true);
      } else {
        const chart = echarts.init(el);
        chart.setOption(option);
        chartRefs.current[id] = chart;
      }
    });
  }

  useEffect(() => {
    // Revenue vs Expenses bar chart
    renderChart("revenue-expenses", {
      tooltip: { trigger: "axis" },
      legend: { data: ["Revenue", "Expenses"], bottom: 0 },
      grid: { left: 40, right: 20, top: 10, bottom: 40 },
      xAxis: { type: "category", data: cashFlow.map((c) => c.month) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => `TSh ${(v / 1e6).toFixed(1)}M` } },
      series: [
        { name: "Revenue", type: "bar", data: cashFlow.map((c) => c.revenue), itemStyle: { color: "#22c55e" } },
        { name: "Expenses", type: "bar", data: cashFlow.map((c) => c.expenses), itemStyle: { color: "#ef4444" } },
      ],
    });

    // Plot performance
    renderChart("plot-performance", {
      tooltip: { trigger: "axis" },
      legend: { data: ["Revenue", "Cost", "Margin %"], bottom: 0 },
      grid: { left: 40, right: 20, top: 10, bottom: 40 },
      xAxis: { type: "category", data: plotPerf.slice(0, 10).map((p) => p.plotCode) },
      yAxis: [
        { type: "value", name: "TSh", axisLabel: { formatter: (v: number) => `TSh ${(v / 1e6).toFixed(1)}M` } },
        { type: "value", name: "%", min: 0, max: 100, axisLabel: { formatter: (v: number) => `${v}%` } },
      ],
      series: [
        { name: "Revenue", type: "bar", yAxisIndex: 0, data: plotPerf.slice(0, 10).map((p) => p.totalRevenue), itemStyle: { color: "#22c55e" } },
        { name: "Cost", type: "bar", yAxisIndex: 0, data: plotPerf.slice(0, 10).map((p) => p.totalCost), itemStyle: { color: "#ef4444" } },
        { name: "Margin %", type: "line", yAxisIndex: 1, data: plotPerf.slice(0, 10).map((p) => p.marginPct), itemStyle: { color: "#3b82f6" } },
      ],
    });

    // Crop performance
    renderChart("crop-performance", {
      tooltip: { trigger: "axis" },
      legend: { data: ["Yield (kg/ha)", "Margin %"], bottom: 0 },
      grid: { left: 40, right: 20, top: 10, bottom: 40 },
      xAxis: { type: "category", data: cropPerf.slice(0, 10).map((c) => c.cropName) },
      yAxis: [
        { type: "value", name: "kg/ha", axisLabel: { formatter: (v: number) => `${v.toLocaleString()}` } },
        { type: "value", name: "%", min: 0, max: 100, axisLabel: { formatter: (v: number) => `${v}%` } },
      ],
      series: [
        { name: "Yield (kg/ha)", type: "bar", yAxisIndex: 0, data: cropPerf.slice(0, 10).map((c) => c.avgYieldKgPerHa), itemStyle: { color: "#84cc16" } },
        { name: "Margin %", type: "line", yAxisIndex: 1, data: cropPerf.slice(0, 10).map((c) => c.marginPct), itemStyle: { color: "#3b82f6" } },
      ],
    });

    // Season comparison
    renderChart("season-comparison", {
      tooltip: { trigger: "axis" },
      legend: { data: ["Revenue", "Cost", "Profit"], bottom: 0 },
      grid: { left: 40, right: 20, top: 10, bottom: 40 },
      xAxis: { type: "category", data: seasonComp.map((s) => s.seasonName) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => `TSh ${(v / 1e6).toFixed(1)}M` } },
      series: [
        { name: "Revenue", type: "bar", data: seasonComp.map((s) => s.totalRevenue), itemStyle: { color: "#22c55e" } },
        { name: "Cost", type: "bar", data: seasonComp.map((s) => s.totalCost), itemStyle: { color: "#ef4444" } },
        { name: "Profit", type: "line", data: seasonComp.map((s) => s.netProfit), itemStyle: { color: "#3b82f6" } },
      ],
    });

    // Cash flow
    renderChart("cashflow", {
      tooltip: { trigger: "axis" },
      legend: { data: ["Revenue", "Expenses", "Net", "Cumulative"], bottom: 0 },
      grid: { left: 40, right: 20, top: 10, bottom: 40 },
      xAxis: { type: "category", data: cashFlow.map((c) => c.month) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => `TSh ${(v / 1e6).toFixed(1)}M` } },
      series: [
        { name: "Revenue", type: "bar", data: cashFlow.map((c) => c.revenue), itemStyle: { color: "#22c55e" } },
        { name: "Expenses", type: "bar", data: cashFlow.map((c) => c.expenses), itemStyle: { color: "#ef4444" } },
        { name: "Net", type: "line", data: cashFlow.map((c) => c.net), itemStyle: { color: "#3b82f6" } },
        { name: "Cumulative", type: "line", data: cashFlow.map((c) => c.cumulative), itemStyle: { color: "#f59e0b" } },
      ],
    });
  }, [cashFlow, plotPerf, cropPerf, seasonComp]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <BarChart className="h-6 w-6 text-primary-600" /> Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Farm performance metrics and comparisons
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-black/10 px-3 py-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={period.from}
              onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
              className="bg-transparent border-none outline-none text-sm w-32"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="date"
              value={period.to}
              onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
              className="bg-transparent border-none outline-none text-sm w-32"
            />
          </div>
          <button className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium hover:bg-muted" disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {loadError && <p role="status" className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">{loadError}</p>}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-success">{formatCurrency(kpis.totalRevenue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Total Expenses</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-destructive">{formatCurrency(kpis.totalExpenses)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Net Profit</p>
          <p className="mt-1 font-mono text-2xl font-semibold {kpis.netProfit >= 0 ? 'text-success' : 'text-destructive'}">{formatCurrency(kpis.netProfit)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Crop Margin</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-success">{kpis.cropMarginPct.toFixed(1)}%</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Livestock Margin</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-warning">{kpis.livestockMarginPct.toFixed(1)}%</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Inventory Value</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{formatCurrency(kpis.inventoryValue)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-black/5">
          <nav className="flex gap-1 p-1" aria-label="Analytics sections">
            {[
              { id: "overview", label: "Overview", icon: BarChart },
              { id: "plots", label: "Plots", icon: TrendingUp },
              { id: "crops", label: "Crops", icon: TrendingUp },
              { id: "livestock", label: "Livestock", icon: TrendingUp },
              { id: "seasons", label: "Seasons", icon: TrendingUp },
              { id: "cashflow", label: "Cash Flow", icon: TrendingUp },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4">
          {activeTab === "overview" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="card p-4" style={{ height: 350 }}>
                <h3 className="font-medium mb-2">Revenue vs Expenses (Monthly)</h3>
                <div id="revenue-expenses" style={{ width: "100%", height: "100%" }} />
              </div>
              <div className="card p-4" style={{ height: 350 }}>
                <h3 className="font-medium mb-2">Cash Flow</h3>
                <div id="cashflow" style={{ width: "100%", height: "100%" }} />
              </div>
            </div>
          )}

          {activeTab === "plots" && (
            <div className="card p-4" style={{ height: 400 }}>
              <h3 className="font-medium mb-2">Top 10 Plots by Revenue</h3>
              <div id="plot-performance" style={{ width: "100%", height: "100%" }} />
            </div>
          )}

          {activeTab === "crops" && (
            <div className="card p-4" style={{ height: 400 }}>
              <h3 className="font-medium mb-2">Crop Performance</h3>
              <div id="crop-performance" style={{ width: "100%", height: "100%" }} />
            </div>
          )}

          {activeTab === "livestock" && (
            <div className="space-y-4">
              <h3 className="font-medium">Livestock Batch Performance</h3>
              {livestockPerf.length === 0 ? (
                <p className="text-sm text-muted-foreground">No livestock batches found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-black/5">
                        <th className="text-left p-2 font-medium text-muted-foreground">Batch</th>
                        <th className="text-left p-2 font-medium text-muted-foreground">Species</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Initial</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Current</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Mortality %</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Feed (kg)</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">FCR</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Revenue</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Cost</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Margin %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {livestockPerf.map((b) => (
                        <tr key={b.batchId} className="border-b border-black/5">
                          <td className="p-2">{b.batchName}</td>
                          <td className="p-2 text-muted-foreground">{b.species}</td>
                          <td className="p-2 text-right font-mono">{b.initialCount}</td>
                          <td className="p-2 text-right font-mono">{b.currentCount}</td>
                          <td className="p-2 text-right font-mono">{b.mortalityRate.toFixed(1)}%</td>
                          <td className="p-2 text-right font-mono">{b.feedConsumedKg.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono">{b.fcr ? b.fcr.toFixed(2) : "—"}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(b.totalRevenue)}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(b.totalCost)}</td>
                          <td className="p-2 text-right font-mono {b.marginPct >= 0 ? 'text-success' : 'text-destructive'}">{b.marginPct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "seasons" && (
            <div className="card p-4" style={{ height: 400 }}>
              <h3 className="font-medium mb-2">Season Comparison</h3>
              <div id="season-comparison" style={{ width: "100%", height: "100%" }} />
            </div>
          )}

          {activeTab === "cashflow" && (
            <div className="card p-4" style={{ height: 400 }}>
              <h3 className="font-medium mb-2">Monthly Cash Flow</h3>
              <div id="cashflow" style={{ width: "100%", height: "100%" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
