import { useContext, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, CalendarClock, ClipboardCheck, CalendarDays, HeartPulse, Grid3x3, Lock, KeyRound, ShieldCheck, UserMinus } from "lucide-react";
import { RoleContext, ROLES, PIN_ROLES } from "@/App";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dashboard Ruangan", icon: LayoutDashboard, testid: "nav-dashboard", end: true },
  { to: "/pegawai", label: "Data Pegawai", icon: Users, testid: "nav-pegawai" },
  { to: "/jadwal", label: "Jadwal Kegiatan Luar", icon: CalendarClock, testid: "nav-jadwal" },
  { to: "/izin", label: "Pengajuan Izin", icon: UserMinus, testid: "nav-izin" },
  { to: "/matriks", label: "Matriks & Sinkronisasi", icon: Grid3x3, testid: "nav-matriks" },
  { to: "/approval", label: "Persetujuan", icon: ClipboardCheck, testid: "nav-approval" },
  { to: "/kalender", label: "Kalender", icon: CalendarDays, testid: "nav-kalender" },
];

export default function Layout() {
  const { role, setRole } = useContext(RoleContext);

  // PIN login dialog
  const [pinOpen, setPinOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Change PIN dialog
  const [changeOpen, setChangeOpen] = useState(false);
  const [pinLama, setPinLama] = useState("");
  const [pinBaru, setPinBaru] = useState("");
  const [pinKonfirmasi, setPinKonfirmasi] = useState("");
  const [saving, setSaving] = useState(false);

  const handleRoleClick = (r) => {
    if (r === role) return;
    if (PIN_ROLES.includes(r)) {
      setPendingRole(r);
      setPin("");
      setPinOpen(true);
    } else {
      setRole(r);
    }
  };

  const submitPin = async () => {
    if (!pin.trim()) { toast.error("Masukkan PIN"); return; }
    setVerifying(true);
    try {
      await api.post("/auth/verify-pin", { role: pendingRole, pin });
      setRole(pendingRole);
      setPinOpen(false);
      toast.success(`Masuk sebagai ${pendingRole}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "PIN salah");
    } finally {
      setVerifying(false);
    }
  };

  const submitChangePin = async () => {
    if (pinBaru !== pinKonfirmasi) { toast.error("Konfirmasi PIN baru tidak cocok"); return; }
    setSaving(true);
    try {
      const res = await api.post("/auth/change-pin", { role, pin_lama: pinLama, pin_baru: pinBaru });
      toast.success(res.data.message || "PIN diperbarui");
      setChangeOpen(false);
      setPinLama(""); setPinBaru(""); setPinKonfirmasi("");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal mengganti PIN");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 shrink-0 border-r border-border bg-white flex flex-col fixed inset-y-0 z-30 hidden lg:flex" data-testid="sidebar">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <HeartPulse size={22} />
            </div>
            <div>
              <h1 className="font-heading font-bold text-sm leading-tight text-slate-900">SI-JADWAL LUAR</h1>
              <p className="text-xs text-slate-500">Puskesmas • Kemenkes RI</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={n.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <n.icon size={18} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Peran Aktif</p>
          <div className="space-y-1">
            {ROLES.map((r) => {
              const locked = PIN_ROLES.includes(r);
              return (
                <button
                  key={r}
                  data-testid={`role-btn-${r.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  onClick={() => handleRoleClick(r)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${
                    role === r
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{r}</span>
                  {locked && role !== r && <Lock size={12} className="opacity-60" />}
                  {locked && role === r && <ShieldCheck size={13} />}
                </button>
              );
            })}
          </div>
          {PIN_ROLES.includes(role) && (
            <button
              onClick={() => { setPinLama(""); setPinBaru(""); setPinKonfirmasi(""); setChangeOpen(true); }}
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              data-testid="btn-ganti-pin"
            >
              <KeyRound size={13} /> Ganti PIN
            </button>
          )}
        </div>
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-border px-6 py-4 lg:hidden" data-testid="mobile-header">
          <div className="flex items-center gap-2 overflow-x-auto">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                data-testid={`mobile-${n.testid}`}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                    isActive ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                  }`
                }
              >
                <n.icon size={14} />
                {n.label}
              </NavLink>
            ))}
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full">
          <Outlet />
        </main>
      </div>

      {/* PIN login dialog */}
      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="max-w-sm" data-testid="pin-login-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Lock size={18} className="text-emerald-600" /> Masuk sebagai {pendingRole}
            </DialogTitle>
            <DialogDescription>Masukkan PIN untuk mengakses peran ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              inputMode="numeric"
              autoFocus
              placeholder="Masukkan PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPin()}
              data-testid="pin-input"
            />
            <Button onClick={submitPin} disabled={verifying} className="w-full bg-emerald-600 hover:bg-emerald-700" data-testid="pin-submit">
              {verifying ? "Memverifikasi..." : "Masuk"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change PIN dialog */}
      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent className="max-w-sm" data-testid="change-pin-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <KeyRound size={18} className="text-emerald-600" /> Ganti PIN — {role}
            </DialogTitle>
            <DialogDescription>Minimal 4 digit angka. PIN tersimpan di server.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input type="password" inputMode="numeric" placeholder="PIN Lama" value={pinLama} onChange={(e) => setPinLama(e.target.value)} data-testid="pin-lama-input" />
            <Input type="password" inputMode="numeric" placeholder="PIN Baru" value={pinBaru} onChange={(e) => setPinBaru(e.target.value)} data-testid="pin-baru-input" />
            <Input type="password" inputMode="numeric" placeholder="Konfirmasi PIN Baru" value={pinKonfirmasi} onChange={(e) => setPinKonfirmasi(e.target.value)} data-testid="pin-konfirmasi-input" />
            <Button onClick={submitChangePin} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700" data-testid="change-pin-submit">
              {saving ? "Menyimpan..." : "Simpan PIN Baru"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
