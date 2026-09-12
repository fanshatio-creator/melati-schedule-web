import { useEffect, useRef, useState } from "react";
import { api, API, formatTanggal, STATUS_LABEL, STATUS_STYLE } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Upload, Pencil, Trash2, AlertTriangle, FileSpreadsheet, X, Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

const EMPTY = { nama_kegiatan: "", tanggal_mulai: "", tanggal_selesai: "", lokasi: "", koordinator: "", keterangan: "", pegawai_ids: [] };

function ConflictBanner({ conflicts }) {
  if (!conflicts || conflicts.length === 0) return null;
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-2" data-testid="jadwal-conflict-banner">
      <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
        <AlertTriangle size={14} /> Jadwal bentrok — penyimpanan diblokir
      </p>
      <div className="space-y-2">
        {conflicts.map((c, i) => (
          <div key={i} className="bg-white border border-rose-200 rounded-md p-2.5" data-testid={`jadwal-conflict-item-${i}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-slate-800">{c.nama_kegiatan}</p>
              {c.status && (
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[c.status]}`} data-testid={`jadwal-conflict-status-${i}`}>
                  {STATUS_LABEL[c.status]}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-mono-code">
              {formatTanggal(c.tanggal_mulai)}{c.tanggal_selesai !== c.tanggal_mulai ? ` – ${formatTanggal(c.tanggal_selesai)}` : ""}
              {c.lokasi && <span className="font-body"> • {c.lokasi}</span>}
            </p>
            <p className="text-[11px] text-rose-600 mt-1">
              Bentrok untuk: <span className="font-medium">{c.pegawai.join(", ")}</span>
            </p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-rose-500">Ubah tanggal atau lepaskan pegawai di atas untuk melanjutkan.</p>
    </div>
  );
}

export default function Jadwal() {
  const [jadwal, setJadwal] = useState([]);
  const [pegawai, setPegawai] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [conflicts, setConflicts] = useState([]);
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [skipped, setSkipped] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    const [j, p] = await Promise.all([api.get("/jadwal"), api.get("/pegawai")]);
    setJadwal(j.data);
    setPegawai(p.data);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!formOpen || form.pegawai_ids.length === 0 || !form.tanggal_mulai || !form.tanggal_selesai) {
      setConflicts([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/jadwal/conflicts/check", {
          params: {
            pegawai_ids: form.pegawai_ids.join(","),
            tanggal_mulai: form.tanggal_mulai,
            tanggal_selesai: form.tanggal_selesai,
            exclude_id: editing?.id || "",
          },
        });
        setConflicts(res.data.conflicts);
      } catch { /* abaikan */ }
    }, 350);
    return () => clearTimeout(t);
  }, [form.pegawai_ids, form.tanggal_mulai, form.tanggal_selesai, formOpen, editing]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setConflicts([]); setFormOpen(true); };
  const openEdit = (j) => {
    setEditing(j);
    setForm({ nama_kegiatan: j.nama_kegiatan, tanggal_mulai: j.tanggal_mulai, tanggal_selesai: j.tanggal_selesai, lokasi: j.lokasi, koordinator: j.koordinator || "", keterangan: j.keterangan, pegawai_ids: j.pegawai_ids });
    setConflicts([]);
    setFormOpen(true);
  };

  const togglePegawai = (id) => {
    setForm((f) => ({
      ...f,
      pegawai_ids: f.pegawai_ids.includes(id) ? f.pegawai_ids.filter((x) => x !== id) : [...f.pegawai_ids, id],
    }));
  };

  const submit = async () => {
    if (!form.nama_kegiatan.trim() || !form.tanggal_mulai || !form.tanggal_selesai) {
      toast.error("Nama kegiatan dan tanggal wajib diisi");
      return;
    }
    try {
      if (editing) {
        await api.put(`/jadwal/${editing.id}`, form);
        toast.success("Jadwal diperbarui, status kembali Menunggu Persetujuan");
      } else {
        await api.post("/jadwal", form);
        toast.success("Jadwal dibuat, menunggu persetujuan");
      }
      setFormOpen(false);
      load();
    } catch (e) {
      const detail = e.response?.data?.detail;
      if (detail?.conflicts) {
        setConflicts(detail.conflicts);
        toast.error("Jadwal bentrok — penyimpanan diblokir");
      } else {
        toast.error(typeof detail === "string" ? detail : "Gagal menyimpan jadwal");
      }
    }
  };

  const hapus = async (j) => {
    if (!window.confirm(`Hapus jadwal "${j.nama_kegiatan}"?`)) return;
    await api.delete(`/jadwal/${j.id}`);
    toast.success("Jadwal dihapus");
    load();
  };

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post("/jadwal/import/parse", fd);
      if (res.data.count === 0) { toast.error("Tidak ada data terbaca dari file"); return; }
      setPreview(res.data.rows);
      setSkipped([]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal membaca file");
    }
  };

  const confirmImport = async () => {
    setImporting(true);
    try {
      const rows = preview.map((r) => ({
        nama_kegiatan: r.nama_kegiatan,
        tanggal_mulai: r.tanggal_mulai,
        tanggal_selesai: r.tanggal_selesai,
        lokasi: r.lokasi,
        koordinator: r.koordinator || "",
        keterangan: r.keterangan || "",
        pegawai: r.pegawai || "",
        pegawai_ids: r.pegawai_ids || [],
      }));
      const res = await api.post("/jadwal/bulk", { rows });
      setSkipped(res.data.skipped);
      toast.success(`${res.data.added} jadwal berhasil diimpor`);
      if (res.data.skipped.length > 0) toast.warning(`${res.data.skipped.length} baris dilewati (bentrok/tidak valid)`);
      if (res.data.skipped.length === 0) { setImportOpen(false); setPreview(null); }
      load();
    } catch (e) {
      toast.error("Gagal mengimpor jadwal");
    } finally {
      setImporting(false);
    }
  };

  const togglePreviewPegawai = (rowIdx, pid) => {
    setPreview((rows) => rows.map((r, i) => i === rowIdx ? {
      ...r,
      pegawai_ids: (r.pegawai_ids || []).includes(pid)
        ? r.pegawai_ids.filter((x) => x !== pid)
        : [...(r.pegawai_ids || []), pid],
    } : r));
  };

  const pMap = Object.fromEntries(pegawai.map((p) => [p.id, p.nama]));

  return (
    <div className="space-y-6" data-testid="jadwal-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Jadwal Kegiatan Luar</h1>
          <p className="text-sm text-slate-500 mt-1">Satu pegawai tidak boleh memiliki dua kegiatan pada tanggal yang sama — sistem memblokir otomatis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setImportOpen(true); setPreview(null); setSkipped([]); }} data-testid="btn-import-jadwal">
            <Upload size={16} className="mr-2" /> Import Excel/PDF/Word
          </Button>
          <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700" data-testid="btn-tambah-jadwal">
            <Plus size={16} className="mr-2" /> Tambah Jadwal
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {jadwal.map((j) => (
          <div key={j.id} className="bg-white border border-border rounded-xl p-5 flex flex-wrap items-start justify-between gap-4 animate-fade-slide" data-testid={`jadwal-card-${j.id}`}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading font-bold text-slate-900">{j.nama_kegiatan}</h3>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[j.status]}`} data-testid={`jadwal-status-${j.id}`}>
                  {STATUS_LABEL[j.status]}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 font-mono-code">
                {formatTanggal(j.tanggal_mulai)}{j.tanggal_selesai !== j.tanggal_mulai ? ` – ${formatTanggal(j.tanggal_selesai)}` : ""}
                {j.lokasi && <span className="font-body"> • {j.lokasi}</span>}
              </p>
              {j.keterangan && <p className="text-xs text-slate-400 mt-1">{j.keterangan}</p>}
              {j.koordinator && <p className="text-xs text-slate-500 mt-1" data-testid={`jadwal-koordinator-${j.id}`}>Koordinator: <span className="font-medium text-slate-700">{j.koordinator}</span></p>}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {j.pegawai?.map((p) => (
                  <span key={p.id} className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-700">{p.nama}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(j)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors" data-testid={`edit-jadwal-${j.id}`}>
                <Pencil size={16} />
              </button>
              <button onClick={() => hapus(j)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors" data-testid={`delete-jadwal-${j.id}`}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {jadwal.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10 bg-white border border-border rounded-xl" data-testid="jadwal-empty">
            Belum ada jadwal kegiatan luar
          </p>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl" data-testid="jadwal-form-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Edit Jadwal Kegiatan" : "Tambah Jadwal Kegiatan Luar"}</DialogTitle>
            <DialogDescription className="sr-only">Formulir jadwal kegiatan luar dengan deteksi bentrok tanggal</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nama Kegiatan * (mis: Posyandu, Pusling, BIAS)" value={form.nama_kegiatan} onChange={(e) => setForm({ ...form, nama_kegiatan: e.target.value })} data-testid="jadwal-input-nama" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Tanggal Mulai *</label>
                <Input type="date" value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} data-testid="jadwal-input-mulai" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Tanggal Selesai *</label>
                <Input type="date" value={form.tanggal_selesai} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })} data-testid="jadwal-input-selesai" />
              </div>
            </div>
            <Input placeholder="Lokasi / Faskes Tujuan" value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} data-testid="jadwal-input-lokasi" />
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Koordinator Program (Pengisi)</label>
              <Input placeholder="Nama koordinator / pengisi formulir" value={form.koordinator} onChange={(e) => setForm({ ...form, koordinator: e.target.value })} data-testid="jadwal-input-koordinator" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Pegawai yang Ditugaskan</label>
              <div className="border border-border rounded-lg max-h-40 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-1" data-testid="jadwal-pegawai-select">
                {pegawai.map((p) => (
                  <label key={p.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${form.pegawai_ids.includes(p.id) ? "bg-emerald-50 text-emerald-800" : "hover:bg-slate-50 text-slate-700"}`}>
                    <input
                      type="checkbox"
                      checked={form.pegawai_ids.includes(p.id)}
                      onChange={() => togglePegawai(p.id)}
                      className="accent-emerald-600"
                      data-testid={`jadwal-pegawai-check-${p.nip || p.id}`}
                    />
                    <span className="truncate">{p.nama}</span>
                  </label>
                ))}
              </div>
            </div>
            <Textarea placeholder="Keterangan / Output Kegiatan" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} data-testid="jadwal-input-keterangan" />
            <ConflictBanner conflicts={conflicts} />
            <Button
              onClick={submit}
              disabled={conflicts.length > 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40"
              data-testid="jadwal-form-submit"
            >
              {conflicts.length > 0 ? "Diblokir — Jadwal Bentrok" : editing ? "Simpan Perubahan" : "Simpan Jadwal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-3xl" data-testid="jadwal-import-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading">Import Jadwal dari File</DialogTitle>
            <DialogDescription className="sr-only">Unggah dan pratinjau jadwal kegiatan dari file</DialogDescription>
          </DialogHeader>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.pdf,.docx" className="hidden" onChange={pickFile} data-testid="jadwal-import-file-input" />
          {!preview ? (
            <div className="space-y-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 w-full text-center hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors"
                data-testid="jadwal-import-dropzone"
              >
                <FileSpreadsheet size={32} className="mx-auto text-slate-400 mb-3" />
                <p className="text-sm font-medium text-slate-700">Klik untuk memilih file</p>
                <p className="text-xs text-slate-400 mt-1">Format: .xlsx, .xls, .csv, .pdf, .docx — kolom: Kegiatan, Tanggal Mulai, Tanggal Selesai, Lokasi, Pegawai (boleh lebih dari satu, pisahkan dengan titik koma ;), Koordinator, Keterangan</p>
              </button>
              <a
                href={`${API}/jadwal/template`}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors"
                data-testid="jadwal-download-template"
              >
                <Download size={15} /> Unduh Template Excel Jadwal
              </a>
              <p className="text-[11px] text-slate-400 text-center">Template berisi contoh pengisian, daftar nama pegawai yang valid, dan mendukung banyak petugas per kegiatan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600" data-testid="jadwal-import-count">{preview.length} baris terbaca — baris bentrok akan ditolak otomatis</p>
                <button onClick={() => { setPreview(null); setSkipped([]); }} className="text-slate-400 hover:text-slate-600" data-testid="jadwal-import-reset"><X size={16} /></button>
              </div>
              <div className="max-h-80 overflow-auto border border-border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-2">Kegiatan</th><th className="px-3 py-2">Mulai</th><th className="px-3 py-2">Selesai</th><th className="px-3 py-2">Lokasi</th><th className="px-3 py-2 min-w-[220px]">Petugas</th><th className="px-3 py-2">Koordinator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map((r, i) => (
                      <tr key={i} data-testid={`jadwal-preview-row-${i}`} className="align-top">
                        <td className="px-3 py-2 font-medium">{r.nama_kegiatan}</td>
                        <td className="px-3 py-2 font-mono-code">{r.tanggal_mulai}</td>
                        <td className="px-3 py-2 font-mono-code">{r.tanggal_selesai}</td>
                        <td className="px-3 py-2">{r.lokasi}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-1">
                            {(r.pegawai_ids || []).map((pid) => (
                              <span key={pid} className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {pMap[pid] || pid}
                                <button onClick={() => togglePreviewPegawai(i, pid)} className="hover:text-emerald-900" data-testid={`preview-remove-pegawai-${i}-${pid}`}><X size={11} /></button>
                              </span>
                            ))}
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50" data-testid={`preview-add-pegawai-${i}`}>
                                  <Users size={11} /> Pilih Petugas
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-2" align="start">
                                <p className="text-[11px] text-slate-500 px-1 pb-1">Pilih satu atau beberapa petugas</p>
                                <div className="max-h-56 overflow-y-auto space-y-0.5">
                                  {pegawai.map((p) => (
                                    <label key={p.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${(r.pegawai_ids || []).includes(p.id) ? "bg-emerald-50 text-emerald-800" : "hover:bg-slate-50 text-slate-700"}`}>
                                      <input
                                        type="checkbox"
                                        checked={(r.pegawai_ids || []).includes(p.id)}
                                        onChange={() => togglePreviewPegawai(i, p.id)}
                                        className="accent-emerald-600"
                                        data-testid={`preview-pegawai-check-${i}-${p.nip || p.id}`}
                                      />
                                      <span className="truncate">{p.nama}</span>
                                    </label>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          {(r.pegawai_unmatched?.length > 0) && (
                            <p className="text-[10px] text-amber-600 mt-1" data-testid={`preview-unmatched-${i}`}>
                              Tidak cocok otomatis: {r.pegawai_unmatched.join(", ")} — pilih manual di atas
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2">{r.koordinator || <span className="text-slate-300">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {skipped.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 max-h-32 overflow-auto" data-testid="jadwal-import-skipped">
                  {skipped.map((s, i) => <p key={i} className="text-xs text-rose-700">• {s.nama_kegiatan}: {s.reason}</p>)}
                </div>
              )}
              <Button onClick={confirmImport} disabled={importing} className="w-full bg-emerald-600 hover:bg-emerald-700" data-testid="jadwal-import-confirm">
                {importing ? "Mengimpor..." : `Simpan ${preview.length} Jadwal`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
