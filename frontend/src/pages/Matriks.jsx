import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Users, CalendarClock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const STATUS_DOT = {
  disetujui: "bg-emerald-500",
  menunggu: "bg-blue-500",
  ditolak: "bg-rose-500",
};
const STATUS_BAR = {
  disetujui: "bg-emerald-400 border-emerald-500",
  menunggu: "bg-blue-400 border-blue-500",
  ditolak: "bg-rose-400 border-rose-500",
};

export default function Matriks() {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/jadwal/matrix?year=${cursor.getFullYear()}&month=${cursor.getMonth() + 1}`);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => { load(); }, [load]);

  const dates = data?.dates || [];
  const conflictDatesByPegawai = new Set((data?.conflicts || []).map((c) => `${c.pegawai_id}|${c.tanggal}`));

  const inRange = (iso, k) => k.tanggal_mulai <= iso && iso <= k.tanggal_selesai;

  return (
    <div className="space-y-6" data-testid="matriks-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Matriks &amp; Sinkronisasi Jadwal</h1>
          <p className="text-sm text-slate-500 mt-1">Tampilan matriks per-tanggal untuk mendeteksi bentrok antar kegiatan</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-2 rounded-lg border border-border bg-white hover:bg-slate-50 transition-colors" data-testid="matriks-prev">
            <ChevronLeft size={16} />
          </button>
          <p className="font-heading font-bold text-slate-900 w-40 text-center" data-testid="matriks-month-label">
            {BULAN[cursor.getMonth()]} {cursor.getFullYear()}
          </p>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-2 rounded-lg border border-border bg-white hover:bg-slate-50 transition-colors" data-testid="matriks-next">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Sinkronisasi summary */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><CalendarClock size={20} /></div>
            <div><p className="text-2xl font-bold text-slate-900">{data.total_kegiatan}</p><p className="text-xs text-slate-500">Kegiatan bulan ini</p></div>
          </div>
          <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><Users size={20} /></div>
            <div><p className="text-2xl font-bold text-slate-900">{data.total_pegawai_terjadwal}</p><p className="text-xs text-slate-500">Pegawai terjadwal</p></div>
          </div>
          <div className={`border rounded-xl p-4 flex items-center gap-3 ${data.conflicts.length ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${data.conflicts.length ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}>
              {data.conflicts.length ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            </div>
            <div>
              <p className={`text-2xl font-bold ${data.conflicts.length ? "text-rose-700" : "text-emerald-700"}`}>{data.conflicts.length}</p>
              <p className="text-xs text-slate-500">Bentrok terdeteksi</p>
            </div>
          </div>
        </div>
      )}

      {/* Conflict list */}
      {data && data.conflicts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2" data-testid="matriks-conflicts">
          <p className="text-sm font-semibold text-rose-800 flex items-center gap-2"><AlertTriangle size={16} /> Petugas terjadwal di lebih dari satu kegiatan</p>
          <div className="grid gap-2 md:grid-cols-2">
            {data.conflicts.map((c, i) => (
              <div key={i} className="bg-white border border-rose-200 rounded-lg px-3 py-2 text-xs">
                <span className="font-semibold text-slate-800">{c.pegawai_nama}</span>
                <span className="text-slate-400"> — {c.tanggal}</span>
                <div className="mt-1 text-rose-700">{c.kegiatan.join("  ×  ")}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="pegawai" className="w-full">
        <TabsList data-testid="matriks-tabs">
          <TabsTrigger value="pegawai" data-testid="tab-pegawai">Matriks Pegawai</TabsTrigger>
          <TabsTrigger value="kegiatan" data-testid="tab-kegiatan">Matriks Kegiatan</TabsTrigger>
        </TabsList>

        {/* Pegawai x Tanggal */}
        <TabsContent value="pegawai">
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600 border-r border-slate-200 min-w-[200px]">Pegawai</th>
                    {dates.map((d) => (
                      <th key={d.iso} className={`px-1 py-2 font-semibold border-r border-slate-100 w-8 text-center ${d.is_weekend ? "bg-slate-100 text-slate-400" : "text-slate-500"}`}>
                        <div className="leading-tight">{d.day}</div>
                        <div className="text-[9px] font-normal">{d.weekday}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.rows || []).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60" data-testid={`matriks-row-${r.id}`}>
                      <td className="sticky left-0 z-10 bg-white px-3 py-2 border-r border-slate-200 min-w-[200px]">
                        <div className="font-medium text-slate-800 truncate max-w-[190px]">{r.nama}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[190px]">{r.jabatan}</div>
                      </td>
                      {dates.map((d) => {
                        const acts = r.cells[d.iso];
                        const isConflict = conflictDatesByPegawai.has(`${r.id}|${d.iso}`);
                        return (
                          <td key={d.iso} className={`px-1 py-2 border-r border-slate-100 text-center ${d.is_weekend ? "bg-slate-50/60" : ""}`}>
                            {acts && (
                              <span
                                title={acts.map((a) => `${a.nama_kegiatan}${a.lokasi ? " @ " + a.lokasi : ""}`).join("\n")}
                                className={`inline-block w-3.5 h-3.5 rounded-full ${isConflict ? "bg-rose-500 ring-2 ring-rose-200" : STATUS_DOT[acts[0].status] || "bg-slate-400"}`}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {(!data || data.rows.length === 0) && !loading && (
                    <tr><td colSpan={dates.length + 1} className="px-4 py-10 text-center text-slate-400">Tidak ada pegawai terjadwal pada bulan ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Legend />
        </TabsContent>

        {/* Kegiatan x Tanggal */}
        <TabsContent value="kegiatan">
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600 border-r border-slate-200 min-w-[240px]">Kegiatan</th>
                    {dates.map((d) => (
                      <th key={d.iso} className={`px-1 py-2 font-semibold border-r border-slate-100 w-8 text-center ${d.is_weekend ? "bg-slate-100 text-slate-400" : "text-slate-500"}`}>
                        <div className="leading-tight">{d.day}</div>
                        <div className="text-[9px] font-normal">{d.weekday}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.kegiatan || []).map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/60" data-testid={`matriks-kegiatan-${k.id}`}>
                      <td className="sticky left-0 z-10 bg-white px-3 py-2 border-r border-slate-200 min-w-[240px]">
                        <div className="font-medium text-slate-800 truncate max-w-[230px]">{k.nama_kegiatan}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[230px]">{k.lokasi} • {k.pegawai.length} petugas</div>
                      </td>
                      {dates.map((d) => {
                        const active = inRange(d.iso, k);
                        return (
                          <td key={d.iso} className={`px-0.5 py-2 border-r border-slate-100 ${d.is_weekend ? "bg-slate-50/60" : ""}`}>
                            {active && <div className={`h-4 rounded border ${STATUS_BAR[k.status] || "bg-slate-300 border-slate-400"}`} />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {(!data || data.kegiatan.length === 0) && !loading && (
                    <tr><td colSpan={dates.length + 1} className="px-4 py-10 text-center text-slate-400">Tidak ada kegiatan pada bulan ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Legend />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-3">
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Disetujui</span>
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" /> Menunggu</span>
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-200" /> Bentrok (petugas dobel)</span>
    </div>
  );
}
