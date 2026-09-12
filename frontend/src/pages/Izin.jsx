import { useContext, useEffect, useState } from "react";
import { api, API, formatTanggal } from "@/lib/api";
import { RoleContext, PIN_ROLES } from "@/App";
import { toast } from "sonner";
import { Plus, Check, X, Trash2, ShieldCheck, UserMinus, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const STATUS_STYLE = {
  menunggu: "bg-blue-50 text-blue-700 border-blue-200",
  disetujui: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ditolak: "bg-rose-50 text-rose-700 border-rose-200",
};
const STATUS_LABEL = { menunggu: "Menunggu", disetujui: "Disetujui", ditolak: "Ditolak" };

const JENIS_STYLE = {
  Sakit: "bg-rose-100 text-rose-700",
  Izin: "bg-amber-100 text-amber-700",
  Cuti: "bg-violet-100 text-violet-700",
  "Dinas Luar": "bg-sky-100 text-sky-700",
  Lainnya: "bg-slate-100 text-slate-700",
};

const TABS = [
  { key: "semua", label: "Semua" },
  { key: "menunggu", label: "Menunggu" },
  { key: "disetujui", label: "Disetujui" },
  { key: "ditolak", label: "Ditolak" },
];

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = { pegawai_id: "", jenis: "Izin", tanggal_mulai: today(), tanggal_selesai: today(), alasan: "" };

export default function Izin() {
  const { role } = useContext(RoleContext);
  const isApprover = PIN_ROLES.includes(role);

  const [izin, setIzin] = useState([]);
  const [pegawai, setPegawai] = useState([]);
  const [jenisList, setJenisList] = useState([]);
  const [tab, setTab] = useState("semua");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const [alasanTolak, setAlasanTolak] = useState("");

  // Rekap bulanan
  const [view, setView] = useState("pengajuan");
  const [rekapCursor, setRekapCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [rekapStatus, setRekapStatus] = useState("disetujui");
  const [rekap, setRekap] = useState(null);

  useEffect(() => {
    if (view !== "rekap") return;
    api.get(`/izin/rekap?year=${rekapCursor.getFullYear()}&month=${rekapCursor.getMonth() + 1}&status=${rekapStatus}`)
      .then((r) => setRekap(r.data));
  }, [view, rekapCursor, rekapStatus]);

  const rekapExcelUrl = `${API}/izin/rekap/excel?year=${rekapCursor.getFullYear()}&month=${rekapCursor.getMonth() + 1}&status=${rekapStatus}`;

  const load = async () => {
    const [i, p, j] = await Promise.all([api.get("/izin"), api.get("/pegawai"), api.get("/izin/jenis")]);
    setIzin(i.data);
    setPegawai(p.data);
    setJenisList(j.data);
  };
  useEffect(() => { load(); }, []);

  const filtered = tab === "semua" ? izin : izin.filter((i) => i.status === tab);

  const submit = async () => {
    if (!form.pegawai_id) { toast.error("Pilih pegawai"); return; }
    setSaving(true);
    try {
      await api.post("/izin", { ...form, diajukan_oleh: role });
      toast.success("Pengajuan izin terkirim — menunggu persetujuan");
      setFormOpen(false);
      setForm(EMPTY);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal mengajukan izin");
    } finally {
      setSaving(false);
    }
  };

  const approve = async (i) => {
    try {
      await api.post(`/izin/${i.id}/approval`, { aksi: "setujui", approver: role, catatan: "" });
      toast.success(`Izin ${i.pegawai_nama} disetujui`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menyetujui");
    }
  };

  const reject = async () => {
    try {
      await api.post(`/izin/${rejecting.id}/approval`, { aksi: "tolak", approver: role, catatan: alasanTolak });
      toast.success(`Izin ${rejecting.pegawai_nama} ditolak`);
      setRejecting(null);
      setAlasanTolak("");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menolak");
    }
  };

  const hapus = async (i) => {
    if (!window.confirm(`Hapus pengajuan izin ${i.pegawai_nama}?`)) return;
    await api.delete(`/izin/${i.id}`);
    toast.success("Pengajuan izin dihapus");
    load();
  };

  return (
    <div className="space-y-6" data-testid="izin-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Pengajuan Izin Tidak Hadir</h1>
          <p className="text-sm text-slate-500 mt-1">Ajukan izin/sakit/cuti — muncul di Dashboard setelah diajukan</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setFormOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700" data-testid="btn-ajukan-izin">
          <Plus size={16} className="mr-2" /> Ajukan Izin
        </Button>
      </div>

      <div className="flex gap-2" data-testid="izin-view-toggle">
        <button
          onClick={() => setView("pengajuan")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === "pengajuan" ? "bg-slate-900 text-white" : "bg-white border border-border text-slate-600 hover:bg-slate-50"}`}
          data-testid="izin-view-pengajuan"
        >
          Daftar Pengajuan
        </button>
        <button
          onClick={() => setView("rekap")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === "rekap" ? "bg-slate-900 text-white" : "bg-white border border-border text-slate-600 hover:bg-slate-50"}`}
          data-testid="izin-view-rekap"
        >
          Rekap Bulanan (Laporan)
        </button>
      </div>

      {view === "pengajuan" && (<>
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium w-fit ${isApprover ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
        <ShieldCheck size={16} />
        {isApprover ? `Anda (${role}) dapat menyetujui/menolak izin` : `Peran "${role}" hanya dapat mengajukan izin`}
      </div>

      <div className="flex gap-2 flex-wrap" data-testid="izin-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`izin-tab-${t.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? "bg-emerald-600 text-white" : "bg-white border border-border text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
            <span className="ml-2 text-xs opacity-70">{t.key === "semua" ? izin.length : izin.filter((i) => i.status === t.key).length}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((i) => (
          <div key={i.id} className="bg-white border border-border rounded-xl p-5 animate-fade-slide" data-testid={`izin-card-${i.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading font-bold text-slate-900">{i.pegawai_nama}</h3>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${JENIS_STYLE[i.jenis] || JENIS_STYLE.Lainnya}`}>{i.jenis}</span>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[i.status]}`}>{STATUS_LABEL[i.status]}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1 font-mono-code">
                  {formatTanggal(i.tanggal_mulai)}{i.tanggal_selesai !== i.tanggal_mulai ? ` – ${formatTanggal(i.tanggal_selesai)}` : ""}
                  {i.pegawai_jabatan && <span className="font-body"> • {i.pegawai_jabatan}</span>}
                </p>
                {i.alasan && <p className="text-sm text-slate-600 mt-2">"{i.alasan}"</p>}
                {i.disetujui_oleh && (
                  <p className="text-xs text-slate-400 mt-2">
                    {i.status === "disetujui" ? "Disetujui" : "Ditolak"} oleh {i.disetujui_oleh}
                    {i.catatan_approval ? ` — "${i.catatan_approval}"` : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {i.status === "menunggu" && isApprover && (
                  <>
                    <Button size="sm" onClick={() => approve(i)} className="bg-emerald-600 hover:bg-emerald-700" data-testid={`izin-approve-${i.id}`}>
                      <Check size={15} className="mr-1" /> Setujui
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setRejecting(i); setAlasanTolak(""); }} className="border-rose-200 text-rose-600 hover:bg-rose-50" data-testid={`izin-reject-${i.id}`}>
                      <X size={15} className="mr-1" /> Tolak
                    </Button>
                  </>
                )}
                <button onClick={() => hapus(i)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors" data-testid={`izin-delete-${i.id}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white border border-border rounded-xl" data-testid="izin-empty">
            <UserMinus size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">Belum ada pengajuan izin pada kategori ini</p>
          </div>
        )}
      </div>
      </>)}

      {view === "rekap" && (
        <div className="space-y-4" data-testid="izin-rekap-view">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setRekapCursor(new Date(rekapCursor.getFullYear(), rekapCursor.getMonth() - 1, 1))} className="p-2 rounded-lg border border-border bg-white hover:bg-slate-50 transition-colors" data-testid="rekap-prev">
                <ChevronLeft size={16} />
              </button>
              <p className="font-heading font-bold text-slate-900 w-40 text-center" data-testid="rekap-month-label">
                {BULAN[rekapCursor.getMonth()]} {rekapCursor.getFullYear()}
              </p>
              <button onClick={() => setRekapCursor(new Date(rekapCursor.getFullYear(), rekapCursor.getMonth() + 1, 1))} className="p-2 rounded-lg border border-border bg-white hover:bg-slate-50 transition-colors" data-testid="rekap-next">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border overflow-hidden" data-testid="rekap-status-toggle">
                <button onClick={() => setRekapStatus("disetujui")} className={`px-3 py-2 text-xs font-medium transition-colors ${rekapStatus === "disetujui" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>Disetujui</button>
                <button onClick={() => setRekapStatus("semua")} className={`px-3 py-2 text-xs font-medium transition-colors ${rekapStatus === "semua" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>Semua (kecuali ditolak)</button>
              </div>
              <a href={rekapExcelUrl} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors" data-testid="rekap-export-excel">
                <FileSpreadsheet size={15} /> Ekspor Excel
              </a>
            </div>
          </div>

          <p className="text-xs text-slate-500">Jumlah <span className="font-medium">hari</span> ketidakhadiran per pegawai pada bulan terpilih — untuk laporan kepegawaian.</p>

          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 font-semibold">Pegawai</th>
                    {(rekap?.jenis || []).map((j) => <th key={j} className="px-3 py-3 font-semibold text-center">{j}</th>)}
                    <th className="px-3 py-3 font-semibold text-center">Total Hari</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(rekap?.rows || []).map((r) => (
                    <tr key={r.pegawai_id} className="hover:bg-slate-50/60" data-testid={`rekap-row-${r.pegawai_id}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{r.nama}</div>
                        <div className="text-[11px] text-slate-400 font-mono-code">{r.nip || "-"} • {r.jabatan || "-"}</div>
                      </td>
                      {rekap.jenis.map((j) => (
                        <td key={j} className="px-3 py-3 text-center">
                          {r.per_jenis[j] > 0 ? <span className="font-semibold text-slate-800">{r.per_jenis[j]}</span> : <span className="text-slate-300">–</span>}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-bold text-emerald-700">{r.total}</td>
                    </tr>
                  ))}
                  {rekap && rekap.rows.length === 0 && (
                    <tr><td colSpan={(rekap.jenis?.length || 5) + 2} className="px-4 py-10 text-center text-slate-400" data-testid="rekap-empty">Tidak ada data izin pada bulan ini</td></tr>
                  )}
                </tbody>
                {rekap && rekap.rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 font-bold text-slate-800">
                      <td className="px-4 py-3">TOTAL</td>
                      {rekap.jenis.map((j) => <td key={j} className="px-3 py-3 text-center">{rekap.totals[j]}</td>)}
                      <td className="px-3 py-3 text-center text-emerald-700">{rekap.totals.total}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Ajukan Izin dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent data-testid="izin-form-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading">Ajukan Izin Tidak Hadir</DialogTitle>
            <DialogDescription className="sr-only">Formulir pengajuan izin</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={form.pegawai_id} onValueChange={(v) => setForm({ ...form, pegawai_id: v })}>
              <SelectTrigger data-testid="izin-input-pegawai"><SelectValue placeholder="Pilih Pegawai *" /></SelectTrigger>
              <SelectContent>
                {pegawai.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.jenis} onValueChange={(v) => setForm({ ...form, jenis: v })}>
              <SelectTrigger data-testid="izin-input-jenis"><SelectValue placeholder="Jenis Izin" /></SelectTrigger>
              <SelectContent>
                {jenisList.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Tanggal Mulai</label>
                <Input type="date" value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} data-testid="izin-input-mulai" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Tanggal Selesai</label>
                <Input type="date" value={form.tanggal_selesai} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })} data-testid="izin-input-selesai" />
              </div>
            </div>
            <Textarea placeholder="Alasan / keterangan" value={form.alasan} onChange={(e) => setForm({ ...form, alasan: e.target.value })} data-testid="izin-input-alasan" />
            <Button onClick={submit} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700" data-testid="izin-form-submit">
              {saving ? "Mengirim..." : "Kirim Pengajuan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tolak dialog */}
      <Dialog open={!!rejecting} onOpenChange={() => setRejecting(null)}>
        <DialogContent data-testid="izin-reject-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading">Tolak Pengajuan Izin</DialogTitle>
            <DialogDescription className="sr-only">Formulir penolakan izin</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-600">{rejecting?.pegawai_nama} — {rejecting?.jenis}</p>
          <Textarea placeholder="Alasan penolakan (opsional)" value={alasanTolak} onChange={(e) => setAlasanTolak(e.target.value)} data-testid="izin-reject-reason" />
          <Button onClick={reject} className="w-full bg-rose-600 hover:bg-rose-700" data-testid="izin-reject-confirm">Tolak Izin</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
