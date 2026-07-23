import React, { useEffect, useState } from "react";

const endpoint = "/absensi-karyawan";
const karyawanEndpoint = "/absensi-karyawan/karyawan-options";

export default function AbsensiKaryawanIndexPage() {
    const [search, setSearch] = useState("");
    const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
    const [karyawans, setKaryawans] = useState([]);
    const [loading, setLoading] = useState(false);

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [detailBulan, setDetailBulan] = useState(new Date().toISOString().slice(0, 7));

    const [absenModalOpen, setAbsenModalOpen] = useState(false);
    const [selectedKaryawan, setSelectedKaryawan] = useState(null);
    const [absenType, setAbsenType] = useState("masuk");
    const [jamManual, setJamManual] = useState(getCurrentTimeValue());
    const [keteranganManual, setKeteranganManual] = useState("");
    const [savingAbsensi, setSavingAbsensi] = useState(false);

    const fetchKaryawans = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams();

            if (search) {
                params.set("search", search);
            }

            if (tanggal) {
                params.set("tanggal", tanggal);
            }

            const url = params.toString()
                ? `${karyawanEndpoint}?${params.toString()}`
                : karyawanEndpoint;

            const response = await fetch(url, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil data karyawan.");
            }

            setKaryawans(result.data || []);
        } catch (error) {
            console.error(error);
            alert(error.message || "Gagal mengambil data karyawan.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKaryawans();
    }, []);

    const handleSubmitSearch = (event) => {
        event.preventDefault();
        fetchKaryawans();
    };

    const openMasukModal = (karyawan) => {
        setSelectedKaryawan(karyawan);
        setAbsenType("masuk");
        setJamManual(getCurrentTimeValue());
        setKeteranganManual("");
        setAbsenModalOpen(true);
    };

    const openPulangModal = (karyawan) => {
        const absensi = karyawan.absensi_hari_ini;

        if (!absensi?.jam_masuk) {
            alert("Karyawan belum absen masuk. Jam pulang tidak bisa disimpan.");
            return;
        }

        setSelectedKaryawan(karyawan);
        setAbsenType("pulang");
        setJamManual(getCurrentTimeValue());
        setKeteranganManual("");
        setAbsenModalOpen(true);
    };

    const closeAbsenModal = () => {
        setAbsenModalOpen(false);
        setSelectedKaryawan(null);
        setAbsenType("masuk");
        setJamManual(getCurrentTimeValue());
        setKeteranganManual("");
    };

    const handleSubmitAbsenModal = async (event) => {
        event.preventDefault();

        if (!selectedKaryawan) {
            return;
        }

        const payload = {
            karyawan_id: selectedKaryawan.id,
            tanggal,
            keterangan: keteranganManual || null,
        };

        if (absenType === "masuk") {
            payload.jam_masuk = jamManual;
            await submitAbsensi("/masuk", payload);
        }

        if (absenType === "pulang") {
            payload.jam_pulang = jamManual;
            await submitAbsensi("/pulang", payload);
        }
    };

    const handleTidakHadir = async (karyawan) => {
        if (!window.confirm(`Tandai "${karyawan.nama}" tidak hadir?`)) {
            return;
        }

        await submitAbsensi("/tidak-hadir", {
            karyawan_id: karyawan.id,
            tanggal,
        });
    };

    const submitAbsensi = async (path, payload) => {
        try {
            setSavingAbsensi(true);

            const response = await fetch(`${endpoint}${path}`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal menyimpan absensi.");
            }

            closeAbsenModal();
            fetchKaryawans();
        } catch (error) {
            console.error(error);
            alert(error.message || "Gagal menyimpan absensi.");
        } finally {
            setSavingAbsensi(false);
        }
    };

    const openDetail = async (karyawan, bulan = detailBulan) => {
        try {
            const response = await fetch(
                `${endpoint}/detail/${karyawan.id}?bulan=${encodeURIComponent(bulan)}`,
                {
                    headers: {
                        Accept: "application/json",
                    },
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil detail absensi.");
            }

            setDetailData(result.data);
            setDetailBulan(bulan);
            setDetailOpen(true);
        } catch (error) {
            alert(error.message || "Gagal mengambil detail absensi.");
        }
    };

    return (
        <>
            <div className="space-y-6">
                <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 to-blue-950 p-6 text-white">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">
                                    Absensi
                                </p>

                                <h3 className="mt-2 text-2xl font-black">
                                    Absensi Karyawan
                                </h3>

                                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                                    Cari nama karyawan, lalu tekan Masuk atau Pulang.
                                    Tombol Pulang aktif setelah karyawan absen masuk.
                                    Lembur otomatis muncul jika jam pulang lebih dari
                                    setting jam pulang.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <form
                            onSubmit={handleSubmitSearch}
                            className="mb-6 grid gap-4 md:grid-cols-4"
                        >
                            <label className="block md:col-span-2">
                                <span className="mb-2 block text-sm font-black text-slate-700">
                                    Cari Karyawan
                                </span>

                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Cari nama atau no WA..."
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm font-black text-slate-700">
                                    Tanggal Absensi
                                </span>

                                <input
                                    type="date"
                                    value={tanggal}
                                    onChange={(event) => setTanggal(event.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                />
                            </label>

                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                                >
                                    {loading ? "Memuat..." : "Cari"}
                                </button>
                            </div>
                        </form>

                        <div className="grid gap-4">
                            {karyawans.length === 0 && (
                                <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center font-bold text-slate-400">
                                    Data karyawan tidak ditemukan.
                                </div>
                            )}

                            {karyawans.map((karyawan) => {
                                const absensi = karyawan.absensi_hari_ini;
                                const sudahMasuk = Boolean(absensi?.jam_masuk);
                                const sudahPulang = Boolean(absensi?.jam_pulang);
                                const pulangDisabled = !sudahMasuk || sudahPulang;

                                return (
                                    <div
                                        key={karyawan.id}
                                        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                                    >
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                            <div>
                                                <h4 className="text-lg font-black text-slate-950">
                                                    {karyawan.nama}
                                                </h4>

                                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                                    No WA: {karyawan.no_wa || "-"}
                                                </p>

                                                <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                                                    <Badge label={`Masuk: ${absensi?.jam_masuk || "-"}`} />
                                                    <Badge label={`Pulang: ${absensi?.jam_pulang || "-"}`} />

                                                    <Badge
                                                        label={`Ket. Masuk: ${absensi?.keterangan_masuk || "-"}`}
                                                        tone={toneMasuk(absensi?.keterangan_masuk)}
                                                    />

                                                    {absensi?.menit_telat > 0 && (
                                                        <Badge
                                                            label={`Telat: ${absensi.label_telat}`}
                                                            tone="yellow"
                                                        />
                                                    )}

                                                    <Badge
                                                        label={`Ket. Pulang: ${absensi?.keterangan_pulang || "-"}`}
                                                        tone={tonePulang(absensi?.keterangan_pulang)}
                                                    />

                                                    {absensi?.menit_lembur > 0 && (
                                                        <Badge
                                                            label={`Lembur: ${absensi.label_lembur}`}
                                                            tone="blue"
                                                        />
                                                    )}

                                                    {!sudahMasuk && (
                                                        <Badge
                                                            label="Pulang belum aktif"
                                                            tone="red"
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openMasukModal(karyawan)}
                                                    disabled={sudahMasuk}
                                                    className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Masuk
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => openPulangModal(karyawan)}
                                                    disabled={pulangDisabled}
                                                    title={
                                                        !sudahMasuk
                                                            ? "Karyawan harus absen masuk dulu."
                                                            : sudahPulang
                                                              ? "Karyawan sudah absen pulang."
                                                              : "Input jam pulang."
                                                    }
                                                    className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Pulang
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleTidakHadir(karyawan)}
                                                    className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-200"
                                                >
                                                    Tidak Hadir
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => openDetail(karyawan)}
                                                    className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
                                                >
                                                    Detail Kalender
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <AbsenManualModal
                open={absenModalOpen}
                type={absenType}
                karyawan={selectedKaryawan}
                tanggal={tanggal}
                jam={jamManual}
                keterangan={keteranganManual}
                saving={savingAbsensi}
                onChangeJam={setJamManual}
                onChangeKeterangan={setKeteranganManual}
                onClose={closeAbsenModal}
                onSubmit={handleSubmitAbsenModal}
            />

            <DetailModal
                open={detailOpen}
                data={detailData}
                bulan={detailBulan}
                onChangeBulan={(bulan) => {
                    if (!detailData?.karyawan) return;
                    setDetailBulan(bulan);
                    openDetail(detailData.karyawan, bulan);
                }}
                onClose={() => {
                    setDetailOpen(false);
                    setDetailData(null);
                }}
            />
        </>
    );
}

function AbsenManualModal({
    open,
    type,
    karyawan,
    tanggal,
    jam,
    keterangan,
    saving,
    onChangeJam,
    onChangeKeterangan,
    onClose,
    onSubmit,
}) {
    if (!open || !karyawan) return null;

    const isMasuk = type === "masuk";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                            Form Absensi
                        </p>

                        <h3 className="mt-1 text-2xl font-black text-slate-950">
                            {isMasuk ? "Input Jam Masuk" : "Input Jam Pulang"}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            {karyawan.nama} • {formatDateIndonesia(tanggal)}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 hover:bg-red-100 hover:text-red-600"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-6">
                    <div className="rounded-3xl bg-slate-950 p-5 text-white">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                            Jam sekarang
                        </p>

                        <p className="mt-2 text-4xl font-black">
                            {getCurrentTimeValue()}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-300">
                            Value ini otomatis dimasukkan ke input, tapi bisa diedit manual.
                        </p>
                    </div>

                    <div className="mt-5 grid gap-4">
                        <label className="block">
                            <span className="mb-2 block text-sm font-black text-slate-700">
                                {isMasuk ? "Jam Masuk" : "Jam Pulang"}
                            </span>

                            <input
                                type="time"
                                value={jam}
                                onChange={(event) => onChangeJam(event.target.value)}
                                required
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-black text-slate-700">
                                Catatan / Keterangan Tambahan
                            </span>

                            <textarea
                                rows="3"
                                value={keterangan}
                                onChange={(event) =>
                                    onChangeKeterangan(event.target.value)
                                }
                                placeholder="Opsional, contoh: izin keluar sebentar, lupa absen, dll."
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                            />
                        </label>
                    </div>

                    <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
                        >
                            Batal
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className={`rounded-2xl px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                                isMasuk
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-blue-600 hover:bg-blue-700"
                            }`}
                        >
                            {saving
                                ? "Menyimpan..."
                                : isMasuk
                                  ? "Simpan Jam Masuk"
                                  : "Simpan Jam Pulang"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function DetailModal({ open, data, bulan, onChangeBulan, onClose }) {
    if (!open || !data) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-7xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                            Kalender Absensi
                        </p>

                        <h3 className="mt-1 text-2xl font-black text-slate-950">
                            {data.karyawan.nama}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Detail jam masuk, jam pulang, menit telat, dan menit lembur.
                        </p>

                        {data.setting_jam_kerja && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Badge
                                    label={`Jam Masuk Setting: ${data.setting_jam_kerja.jam_masuk}`}
                                    tone="green"
                                />
                                <Badge
                                    label={`Jam Pulang Setting: ${data.setting_jam_kerja.jam_pulang}`}
                                    tone="blue"
                                />
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 hover:bg-red-100 hover:text-red-600"
                    >
                        ×
                    </button>
                </div>

                <div className="max-h-[80vh] overflow-y-auto p-6">
                    <div className="mb-5 max-w-xs">
                        <label className="block">
                            <span className="mb-2 block text-sm font-black text-slate-700">
                                Bulan
                            </span>

                            <input
                                type="month"
                                value={bulan}
                                onChange={(event) => onChangeBulan(event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                        {data.days.map((day) => (
                            <div
                                key={day.tanggal}
                                className="min-h-52 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <p className="text-xs font-black uppercase text-blue-600">
                                    {day.hari}
                                </p>

                                <h4 className="mt-1 font-black text-slate-950">
                                    {day.tanggal_label}
                                </h4>

                                <div className="mt-4 space-y-2 text-xs font-bold">
                                    <p>Masuk: {day.jam_masuk || "-"}</p>
                                    <p>Pulang: {day.jam_pulang || "-"}</p>

                                    <Badge
                                        label={day.keterangan_masuk || "-"}
                                        tone={toneMasuk(day.keterangan_masuk)}
                                    />

                                    {day.menit_telat > 0 && (
                                        <Badge
                                            label={`Telat ${day.label_telat}`}
                                            tone="yellow"
                                        />
                                    )}

                                    <Badge
                                        label={day.keterangan_pulang || "-"}
                                        tone={tonePulang(day.keterangan_pulang)}
                                    />

                                    {day.menit_lembur > 0 && (
                                        <Badge
                                            label={`Lembur ${day.label_lembur}`}
                                            tone="blue"
                                        />
                                    )}

                                    {day.keterangan && (
                                        <p className="rounded-xl bg-slate-100 p-2 text-slate-600">
                                            {day.keterangan}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Badge({ label, tone = "slate" }) {
    const classes = {
        slate: "bg-slate-100 text-slate-700",
        green: "bg-green-100 text-green-700",
        red: "bg-red-100 text-red-700",
        blue: "bg-blue-100 text-blue-700",
        yellow: "bg-yellow-100 text-yellow-700",
    };

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                classes[tone] || classes.slate
            }`}
        >
            {label}
        </span>
    );
}

function toneMasuk(value) {
    if (value === "Tepat Waktu") return "green";
    if (value === "Telat") return "yellow";
    if (value === "Tidak Hadir") return "red";
    return "slate";
}

function tonePulang(value) {
    if (value === "Lembur") return "blue";
    if (value === "Tepat Waktu") return "green";
    if (value === "Tidak Hadir") return "red";
    return "slate";
}

function getCurrentTimeValue() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
}

function formatDateIndonesia(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
}
