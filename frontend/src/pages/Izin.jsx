import { useContext, useEffect, useState } from "react";
import { api, formatTanggal } from "@/lib/api";
import { RoleContext, PIN_ROLES } from "@/App";
import { toast } from "sonner";
import { Plus, Check, X, Trash2, ShieldCheck, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
