import React, { useEffect, useMemo, useState } from "react";

const endpoint = "/rekap-penggajian";

const jenisOptions = [
    {
        value: "harian",
        label: "Harian",
        title: "Pengambilan Gaji Harian",
        desc: "Hanya menghitung gaji pokok pada tanggal yang dipilih.",
    },
    {
        value: "mingguan",
        label: "Mingguan",
        title: "Pengambilan Gaji Mingguan",
        desc: "Hanya menghitung gaji pokok dari total hari hadir dalam periode minggu.",
    },
    {
        value: "bulanan",
        label: "Bulanan",
        title: "Pengambilan Bonus Bulanan",
        desc: "Hanya menghitung bonus fee dari Power Box Group pada pembelian dan penjualan. Gaji pokok tidak ikut dihitung.",
    },
];

export default function RekapPenggajianIndexPage() {
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);

    const [jenis, setJenis] = useState("harian");
    const [tanggal, setTanggal] = useState(todayDate());
    const [tanggalMulai, setTanggalMulai] = useState(getStartOfWeek());
    const [tanggalSelesai, setTanggalSelesai] = useState(getEndOfWeek());
    const [bulanMulai, setBulanMulai] = useState(getStartOfMonth());
    const [bulanSelesai, setBulanSelesai] = useState(getEndOfMonth());
    const [search, setSearch] = useState("");

    const jenisData = useMemo(() => {
        return jenisOptions.find((item) => item.value === jenis) || jenisOptions[2];
    }, [jenis]);

    const periodeLabel = useMemo(() => {
        if (summary?.periode_label) return summary.periode_label;

        if (jenis === "harian") return formatDateIndonesia(tanggal);

        if (jenis === "mingguan") {
            return `${formatDateIndonesia(tanggalMulai)} - ${formatDateIndonesia(tanggalSelesai)}`;
        }

        return `${formatDateIndonesia(bulanMulai)} - ${formatDateIndonesia(bulanSelesai)}`;
    }, [summary, jenis, tanggal, tanggalMulai, tanggalSelesai, bulanMulai, bulanSelesai]);

    const fetchData = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams({
                tipe_pengambilan: jenis,
            });

            if (jenis === "harian") params.append("tanggal", tanggal);
            if (jenis === "mingguan") {
                params.append("tanggal_mulai", tanggalMulai);
                params.append("tanggal_selesai", tanggalSelesai);
            }
            if (jenis === "bulanan") {
                params.append("tanggal_mulai", bulanMulai);
                params.append("tanggal_selesai", bulanSelesai);
                params.append("bulan", bulanMulai.slice(0, 7));
            }
            if (search.trim()) params.append("search", search.trim());

            const response = await fetch(`${endpoint}?${params.toString()}`, {
                headers: {
                    Accept: "application/json",
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal mengambil rekap penggajian.");
            }

            setRows(Array.isArray(result.data) ? result.data : []);
            setSummary(result.summary || null);
        } catch (error) {
            console.error(error);
            alert(error.message || "Gagal mengambil rekap penggajian.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submitFilter = (event) => {
        event.preventDefault();
        fetchData();
    };

    const printSlip = (item) => {
        const popup = window.open("", "_blank", "width=900,height=1100");

        if (!popup) {
            alert("Popup diblokir browser.");
            return;
        }

        popup.document.open();
        popup.document.write(
            generateSlipHtml(item, jenis, periodeLabel, {
                tanggal,
                tanggalMulai: jenis === "bulanan" ? bulanMulai : tanggalMulai,
                tanggalSelesai: jenis === "bulanan" ? bulanSelesai : tanggalSelesai,
            })
        );
        popup.document.close();

        popup.onload = () => {
            popup.focus();
            popup.print();
        };
    };

    const printReport = () => {
        const popup = window.open("", "_blank", "width=1200,height=900");

        if (!popup) {
            alert("Popup diblokir browser.");
            return;
        }

        popup.document.open();
        popup.document.write(generateReportHtml(rows, summary, jenis, periodeLabel));
        popup.document.close();

        popup.onload = () => {
            popup.focus();
            popup.print();
        };
    };

    return (
        <>
            <div className="space-y-6">
                <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
                    <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 p-6 text-white">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                                    Payroll Report
                                </p>

                                <h3 className="mt-2 text-2xl font-black sm:text-3xl">
                                    Rekap Penggajian Karyawan
                                </h3>

                                <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-300">
                                    {jenisData.desc}
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={printReport}
                                    className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300"
                                >
                                    Cetak Laporan
                                </button>

                                <button
                                    type="button"
                                    onClick={fetchData}
                                    disabled={loading}
                                    className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-blue-50 disabled:opacity-60"
                                >
                                    {loading ? "Memuat..." : "Refresh"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <form
                            onSubmit={submitFilter}
                            className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                        >
                            <div className="grid gap-4 xl:grid-cols-4">
                                <label>
                                    <span className="mb-2 block text-sm font-black text-slate-700">
                                        Jenis Pengambilan
                                    </span>

                                    <select
                                        value={jenis}
                                        onChange={(e) => setJenis(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    >
                                        {jenisOptions.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                {jenis === "harian" && (
                                    <label>
                                        <span className="mb-2 block text-sm font-black text-slate-700">
                                            Tanggal
                                        </span>

                                        <input
                                            type="date"
                                            value={tanggal}
                                            onChange={(e) => setTanggal(e.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        />
                                    </label>
                                )}

                                {jenis === "mingguan" && (
                                    <>
                                        <label>
                                            <span className="mb-2 block text-sm font-black text-slate-700">
                                                Tanggal Mulai
                                            </span>

                                            <input
                                                type="date"
                                                value={tanggalMulai}
                                                onChange={(e) => setTanggalMulai(e.target.value)}
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                            />
                                        </label>

                                        <label>
                                            <span className="mb-2 block text-sm font-black text-slate-700">
                                                Tanggal Selesai
                                            </span>

                                            <input
                                                type="date"
                                                value={tanggalSelesai}
                                                onChange={(e) => setTanggalSelesai(e.target.value)}
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                            />
                                        </label>
                                    </>
                                )}

                                {jenis === "bulanan" && (
                                    <>
                                        <label>
                                            <span className="mb-2 block text-sm font-black text-slate-700">
                                                Tanggal Awal Bonus
                                            </span>

                                            <input
                                                type="date"
                                                value={bulanMulai}
                                                onChange={(e) => setBulanMulai(e.target.value)}
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                            />

                                            <p className="mt-2 text-xs font-semibold text-slate-500">
                                                Awal periode bonus yang akan ditarik.
                                            </p>
                                        </label>

                                        <label>
                                            <span className="mb-2 block text-sm font-black text-slate-700">
                                                Tanggal Akhir Bonus
                                            </span>

                                            <input
                                                type="date"
                                                value={bulanSelesai}
                                                onChange={(e) => setBulanSelesai(e.target.value)}
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                            />

                                            <p className="mt-2 text-xs font-semibold text-slate-500">
                                                Akhir periode bonus yang akan ditarik.
                                            </p>
                                        </label>
                                    </>
                                )}

                                <label>
                                    <span className="mb-2 block text-sm font-black text-slate-700">
                                        Cari Karyawan
                                    </span>

                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Nama / No WA"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </label>
                            </div>

                            <div className="mt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
                                >
                                    {loading ? "Memuat..." : "Tampilkan Rekap"}
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            <SummaryCard title="Jenis" value={jenisData.label} desc={jenisData.title} />
                            <SummaryCard title="Periode" value={periodeLabel} desc="Periode pengambilan" />
                            <SummaryCard title="Karyawan" value={summary?.total_karyawan || rows.length || 0} desc="Total data tampil" />
                            <SummaryCard
                                title={jenis === "bulanan" ? "Total Bonus" : "Total Gaji Pokok"}
                                value={
                                    jenis === "bulanan"
                                        ? summary?.total_bonus_bulanan_format || "Rp 0"
                                        : summary?.total_gaji_absensi_format ||
                                          summary?.total_nominal_gaji_format ||
                                          "Rp 0"
                                }
                                desc={jenis === "bulanan" ? "Bonus fee Power Box Group" : "Gaji pokok absensi"}
                            />
                            <SummaryCard
                                title="Total Diambil"
                                value={
                                    jenis === "bulanan"
                                        ? summary?.total_bonus_bulanan_format || "Rp 0"
                                        : summary?.total_gaji_bersih_format || "Rp 0"
                                }
                                desc={jenis === "bulanan" ? "Total bonus fee yang diambil" : "Total gaji pokok yang diambil"}
                            />
                        </div>

                        <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5">
                            <h4 className="text-lg font-black text-blue-950">
                                Informasi Perhitungan
                            </h4>

                            <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
                                {getRuleText(jenis)}
                            </p>
                        </div>

                        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                            <div className="border-b border-slate-200 p-5">
                                <h4 className="text-xl font-black text-slate-950">
                                    Daftar Rekap
                                </h4>

                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    {jenisData.title} periode {periodeLabel}
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-slate-950 text-white">
                                            <th className="px-4 py-3 font-black">Karyawan</th>
                                            <th className="px-4 py-3 font-black">Dasar Hitung</th>
                                            <th className="px-4 py-3 font-black">Absensi</th>
                                            <th className="px-4 py-3 font-black">Komponen</th>
                                            <th className="px-4 py-3 font-black">Total Diambil</th>
                                            <th className="px-4 py-3 font-black">Aksi</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {rows.map((item) => (
                                            <tr
                                                key={item.karyawan_id}
                                                className="border-t border-slate-100 hover:bg-blue-50/40"
                                            >
                                                <td className="px-4 py-4">
                                                    <p className="font-black text-slate-950">
                                                        {item.nama_karyawan || "-"}
                                                    </p>
                                                    <p className="mt-1 text-xs font-semibold text-slate-400">
                                                        {item.no_wa || "-"}
                                                    </p>
                                                </td>

                                                <td className="px-4 py-4">
                                                    {jenis === "bulanan" ? (
                                                        <>
                                                            <p className="font-black text-emerald-700">
                                                                {countBonus(item)} transaksi bonus
                                                            </p>
                                                            <p className="mt-1 text-xs font-semibold text-slate-400">
                                                                Dari Power Box Group
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="font-black text-blue-700">
                                                                {item.tarif_harian_format || formatRupiah(item.tarif_harian)}
                                                            </p>
                                                            <p className="mt-1 text-xs font-semibold text-slate-400">
                                                                Tarif harian × {item.total_hari_absen || 0} hari
                                                            </p>
                                                        </>
                                                    )}
                                                </td>

                                                <td className="px-4 py-4">
                                                    {jenis === "bulanan" ? (
                                                        <div>
                                                            <p className="font-black text-slate-500">
                                                                Tidak dihitung
                                                            </p>
                                                            <p className="mt-1 text-xs font-semibold text-slate-400">
                                                                Slip bulanan hanya menampilkan bonus fee Power Box Group dari pembelian dan penjualan.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <p className="font-black text-slate-700">
                                                                {item.total_hari_absen || 0} hari hadir
                                                            </p>
                                                            <p className="mt-1 text-xs font-semibold text-red-500">
                                                                Telat: {item.total_hari_telat || 0} hari / {item.label_total_telat || "-"}
                                                            </p>
                                                            <p className="mt-1 text-xs font-semibold text-green-600">
                                                                Lembur: {item.total_hari_lembur || 0} hari / {item.label_total_lembur || "-"}
                                                            </p>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="px-4 py-4">
                                                    <p className={`font-black ${jenis === "bulanan" ? "text-emerald-700" : "text-blue-700"}`}>
                                                        {jenis === "bulanan"
                                                            ? item.total_bonus_bulanan_format || formatRupiah(item.total_bonus_bulanan)
                                                            : item.total_gaji_absensi_format ||
                                                              item.total_nominal_gaji_format ||
                                                              formatRupiah(item.total_gaji_absensi)}
                                                    </p>
                                                    <p className="mt-1 text-xs font-semibold text-slate-400">
                                                        {jenis === "bulanan" ? "Bonus saja" : "Gaji pokok saja"}
                                                    </p>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <p className="text-lg font-black text-slate-950">
                                                        {jenis === "bulanan"
                                                            ? item.total_bonus_bulanan_format || formatRupiah(item.total_bonus_bulanan)
                                                            : item.total_gaji_bersih_format || formatRupiah(item.total_gaji_bersih)}
                                                    </p>
                                                    <p className="mt-1 text-xs font-semibold text-slate-400">
                                                        {jenis === "bulanan" ? "Bonus fee siap diambil" : "Gaji pokok siap diambil"}
                                                    </p>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelected(item)}
                                                            className="rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                                                        >
                                                            Detail
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => printSlip(item)}
                                                            className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-200"
                                                        >
                                                            Cetak Slip
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}

                                        {rows.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="px-4 py-10 text-center">
                                                    <p className="font-black text-slate-500">
                                                        Data rekap belum ada.
                                                    </p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {selected && (
                <DetailModal
                    item={selected}
                    jenis={jenis}
                    periodeLabel={periodeLabel}
                    onClose={() => setSelected(null)}
                    onPrint={() => printSlip(selected)}
                />
            )}
        </>
    );
}

function SummaryCard({ title, value, desc }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                {title}
            </p>
            <p className="mt-3 text-lg font-black text-slate-950">{value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{desc}</p>
        </div>
    );
}

function DetailModal({ item, jenis, periodeLabel, onClose, onPrint }) {
    const bonusItems = getBonusItems(item);
    const { pembelianItems, penjualanItems } = splitBonusItems(bonusItems);

    const totalFeePembelian = Number(
        item.total_bonus_pembelian ?? item.total_fee_pembelian ?? sumBonusBagian(pembelianItems)
    );
    const totalFeePenjualan = Number(
        item.total_bonus_penjualan ?? item.total_fee_penjualan ?? sumBonusBagian(penjualanItems)
    );
    const totalAkhirBonus = Number(
        item.total_bonus_bulanan ?? item.total_fee_bonus ?? totalFeePembelian + totalFeePenjualan
    );

    const jumlahPembelian = Number(item.total_bonus_pembelian_transaksi ?? pembelianItems.length);
    const jumlahPenjualan = Number(item.total_bonus_penjualan_transaksi ?? penjualanItems.length);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-7xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-slate-100 p-6">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                            Detail Rekap Penggajian
                        </p>
                        <h3 className="mt-1 text-2xl font-black text-slate-950">
                            {item.nama_karyawan}
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            {periodeLabel} • {getJenisLabel(jenis)}
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

                <div className="max-h-[78vh] overflow-y-auto p-6">
                    {jenis === "bulanan" ? (
                        <>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <SummaryCard
                                    title="Fee Pembelian"
                                    value={formatRupiah(totalFeePembelian)}
                                    desc={`${jumlahPembelian} catatan Power Box pembelian`}
                                />
                                <SummaryCard
                                    title="Fee Penjualan"
                                    value={formatRupiah(totalFeePenjualan)}
                                    desc={`${jumlahPenjualan} catatan Power Box penjualan`}
                                />
                                <SummaryCard
                                    title="Total Catatan"
                                    value={`${bonusItems.length} catatan`}
                                    desc="Gabungan pembelian dan penjualan"
                                />
                                <SummaryCard
                                    title="Total Akhir Fee Bonus"
                                    value={formatRupiah(totalAkhirBonus)}
                                    desc="Fee pembelian + fee penjualan"
                                />
                            </div>

                            <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5">
                                <h4 className="text-lg font-black text-blue-950">
                                    Ringkasan Bonus Power Box Group
                                </h4>
                                <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
                                    Bonus bulanan diambil dari Catatan Transaksi Power Box Group pada pembelian dan penjualan. Total akhir fee bonus adalah hasil penjumlahan bagian karyawan dari fee pembelian dan fee penjualan.
                                </p>

                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                            Total Fee Pembelian
                                        </p>
                                        <p className="mt-2 text-xl font-black text-blue-700">
                                            {formatRupiah(totalFeePembelian)}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                            Total Fee Penjualan
                                        </p>
                                        <p className="mt-2 text-xl font-black text-emerald-700">
                                            {formatRupiah(totalFeePenjualan)}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-slate-950 p-4 text-white">
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-300">
                                            Total Akhir Fee Bonus
                                        </p>
                                        <p className="mt-2 text-2xl font-black">
                                            {formatRupiah(totalAkhirBonus)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <BonusSourceTable
                                title="Detail Fee Pembelian"
                                subtitle="Daftar bonus dari catatan Power Box Group pada transaksi pembelian."
                                items={pembelianItems}
                                emptyText="Belum ada fee pembelian pada periode ini."
                                accentClass="text-blue-700"
                            />

                            <BonusSourceTable
                                title="Detail Fee Penjualan"
                                subtitle="Daftar bonus dari catatan Power Box Group pada transaksi penjualan."
                                items={penjualanItems}
                                emptyText="Belum ada fee penjualan pada periode ini."
                                accentClass="text-emerald-700"
                            />

                            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                                <div className="bg-slate-950 px-5 py-4 text-white">
                                    <h4 className="text-lg font-black">Total Akhir Fee Bonus</h4>
                                    <p className="mt-1 text-xs font-semibold text-slate-300">
                                        Ringkasan final bonus yang siap diambil.
                                    </p>
                                </div>

                                <div className="grid gap-0 md:grid-cols-3">
                                    <div className="border-b border-slate-100 p-5 md:border-b-0 md:border-r">
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                            Fee Pembelian
                                        </p>
                                        <p className="mt-2 text-xl font-black text-blue-700">
                                            {formatRupiah(totalFeePembelian)}
                                        </p>
                                    </div>

                                    <div className="border-b border-slate-100 p-5 md:border-b-0 md:border-r">
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                            Fee Penjualan
                                        </p>
                                        <p className="mt-2 text-xl font-black text-emerald-700">
                                            {formatRupiah(totalFeePenjualan)}
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 p-5">
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                            Total Akhir
                                        </p>
                                        <p className="mt-2 text-2xl font-black text-slate-950">
                                            {formatRupiah(totalAkhirBonus)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                <SummaryCard title="Tarif Harian" value={item.tarif_harian_format || formatRupiah(item.tarif_harian)} desc="Dasar gaji pokok" />
                                <SummaryCard title="Hari Hadir" value={`${item.total_hari_absen || 0} hari`} desc="Absensi periode ini" />
                                <SummaryCard title="Potongan Telat" value={item.total_potongan_format || formatRupiah(item.total_potongan)} desc="Total potongan keterlambatan" />
                                <SummaryCard title="Gaji Pokok" value={item.total_gaji_absensi_format || item.total_nominal_gaji_format || "Rp 0"} desc="Harian/mingguan saja" />
                                <SummaryCard title="Total Diambil" value={item.total_gaji_bersih_format || "Rp 0"} desc="Nominal siap diambil" />
                            </div>

                            <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5">
                                <h4 className="text-lg font-black text-blue-950">
                                    Penjelasan
                                </h4>
                                <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
                                    {getRuleText(jenis)}
                                </p>
                            </div>
                        </>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onPrint}
                            className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
                        >
                            Cetak Slip
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BonusSourceTable({ title, subtitle, items, emptyText, accentClass = "text-emerald-700" }) {
    const totalBagian = sumBonusBagian(items);
    const totalNominalCatatan = sumBonusNominalCatatan(items);

    return (
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-950 px-5 py-4 text-white lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h4 className="text-lg font-black">{title}</h4>
                    <p className="mt-1 text-xs font-semibold text-slate-300">{subtitle}</p>
                </div>

                <div className="rounded-2xl bg-white/10 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-300">
                        Total Bagian Karyawan
                    </p>
                    <p className="mt-1 text-lg font-black">{formatRupiah(totalBagian)}</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-100 text-slate-700">
                            <th className="px-4 py-3 font-black">Tanggal</th>
                            <th className="px-4 py-3 font-black">No Nota</th>
                            <th className="px-4 py-3 font-black">Relasi</th>
                            <th className="px-4 py-3 font-black">Catatan</th>
                            <th className="px-4 py-3 font-black text-right">Nominal Catatan</th>
                            <th className="px-4 py-3 font-black text-center">Jumlah Karyawan</th>
                            <th className="px-4 py-3 font-black text-right">Fee Karyawan</th>
                        </tr>
                    </thead>

                    <tbody>
                        {items.map((bonus, index) => (
                            <tr
                                key={bonus.source_catatan_id || bonus.pembelian_catatan_id || bonus.penjualan_catatan_id || index}
                                className="border-t border-slate-100"
                            >
                                <td className="whitespace-nowrap px-4 py-3">
                                    {bonus.tanggal_label || formatDateIndonesia(bonus.tanggal)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 font-black text-slate-950">
                                    {bonus.nomor_nota || "-"}
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-600">
                                    {bonus.nama_relasi || bonus.nama_supplier || bonus.nama_pelanggan || "-"}
                                </td>
                                <td className="px-4 py-3">
                                    {bonus.catatan || "-"}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-right font-black text-blue-700">
                                    {bonus.nominal_catatan_format || formatRupiah(bonus.nominal_catatan)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-center">
                                    {bonus.jumlah_karyawan || 1} orang
                                </td>
                                <td className={`whitespace-nowrap px-4 py-3 text-right font-black ${accentClass}`}>
                                    {bonus.nominal_bagian_format || formatRupiah(bonus.nominal_bagian)}
                                </td>
                            </tr>
                        ))}

                        {items.length === 0 && (
                            <tr>
                                <td colSpan="7" className="px-4 py-8 text-center font-semibold text-slate-400">
                                    {emptyText}
                                </td>
                            </tr>
                        )}
                    </tbody>

                    <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50">
                            <td colSpan="4" className="px-4 py-3 text-right font-black">
                                Total
                            </td>
                            <td className="px-4 py-3 text-right font-black text-blue-700">
                                {formatRupiah(totalNominalCatatan)}
                            </td>
                            <td className="px-4 py-3 text-center font-black">
                                {items.length} catatan
                            </td>
                            <td className={`px-4 py-3 text-right font-black ${accentClass}`}>
                                {formatRupiah(totalBagian)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

function generateSlipHtml(item, jenis, periodeLabel, periode = {}) {
    const totalPokok = Number(item.total_gaji_absensi || item.total_nominal_gaji || 0);
    const totalBonus = Number(item.total_bonus_bulanan || item.total_fee_bonus || 0);
    const totalDiambil = Number(item.total_gaji_bersih || item.total_diterima || 0);
    const totalPotongan = Number(item.total_potongan || item.total_potongan_telat || 0);

    const bonusItems = getBonusItems(item);
    const { pembelianItems, penjualanItems } = splitBonusItems(bonusItems);
    const totalFeePembelian = Number(item.total_bonus_pembelian ?? sumBonusBagian(pembelianItems));
    const totalFeePenjualan = Number(item.total_bonus_penjualan ?? sumBonusBagian(penjualanItems));
    const totalAkhirBonus = Number(item.total_bonus_bulanan ?? item.total_fee_bonus ?? totalFeePembelian + totalFeePenjualan);

    const tanggalSlip = periode.tanggal || todayDate();
    const tanggalAwal = periode.tanggalMulai || tanggalSlip;
    const tanggalAkhir = periode.tanggalSelesai || tanggalSlip;

    const periodeRows = getSlipPeriodRows({
        jenis,
        tanggal: tanggalSlip,
        tanggalMulai: tanggalAwal,
        tanggalSelesai: tanggalAkhir,
    });

    return `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8" />
            <title>${escapeHtml(getJenisTitle(jenis))}</title>
            <style>
                @page { size: 80mm auto; margin: 0; }
                * { box-sizing: border-box; }
                html, body {
                    width: 80mm;
                    margin: 0;
                    padding: 0;
                    background: #fff;
                    color: #000;
                    font-family: "Courier New", monospace;
                    font-size: 10.5px;
                    line-height: 1.25;
                }
                .print-button {
                    width: calc(100% - 8mm);
                    margin: 3mm 4mm 2mm;
                    padding: 8px;
                    border: 1px solid #000;
                    background: #fff;
                    font-weight: bold;
                }
                .receipt { width: 80mm; padding: 3mm; }
                .center { text-align: center; }
                .title { font-size: 15px; font-weight: bold; }
                .subtitle { font-size: 10px; }
                .line { border-top: 1px dashed #000; margin: 6px 0; }
                .line-solid { border-top: 1px solid #000; margin: 6px 0; }
                .row { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
                .row span:first-child { flex: 1; word-break: break-word; }
                .row span:last-child { text-align: right; white-space: nowrap; }
                .small { font-size: 10px; }
                .bold { font-weight: bold; }
                .grand { font-size: 13px; font-weight: bold; }
                .note { margin-top: 6px; text-align: center; font-size: 9.5px; }
                @media print { .print-button { display: none; } }
            </style>
        </head>
        <body>
            <button class="print-button" onclick="window.print()">Cetak / Save PDF</button>

            <div class="receipt">
                <div class="center">
                    <div class="title">${escapeHtml(getJenisTitle(jenis).toUpperCase())}</div>
                    <div class="subtitle">${escapeHtml(getJenisLabel(jenis))}</div>
                    <div class="subtitle">${escapeHtml(periodeLabel)}</div>
                </div>

                <div class="line-solid"></div>

                <div class="row"><span>Karyawan</span><span>${escapeHtml(item.nama_karyawan || "-")}</span></div>
                <div class="row"><span>No WA</span><span>${escapeHtml(item.no_wa || "-")}</span></div>
                <div class="row"><span>Jenis</span><span>${escapeHtml(getJenisLabel(jenis))}</span></div>
                ${periodeRows}

                <div class="line"></div>

                ${
                    jenis === "bulanan"
                        ? `
                            <div class="row"><span>Jenis Slip</span><span>Bonus Fee</span></div>
                            <div class="row"><span>Sumber Bonus</span><span>Power Box Group</span></div>
                            <div class="row"><span>Fee Pembelian</span><span>${formatRupiah(totalFeePembelian)}</span></div>
                            <div class="row"><span>Fee Penjualan</span><span>${formatRupiah(totalFeePenjualan)}</span></div>
                            <div class="row"><span>Jumlah Catatan</span><span>${escapeHtml(bonusItems.length)} catatan</span></div>
                            <div class="row"><span>Total Fee Bonus</span><span>${formatRupiah(totalAkhirBonus)}</span></div>
                        `
                        : `
                            <div class="row"><span>Tarif Harian</span><span>${formatRupiah(item.tarif_harian || 0)}</span></div>
                            <div class="row"><span>Hari Hadir</span><span>${escapeHtml(item.total_hari_absen || 0)} hari</span></div>
                            <div class="row"><span>Total Telat</span><span>${escapeHtml(item.total_hari_telat || 0)} hari / ${escapeHtml(item.label_total_telat || "-")}</span></div>
                            <div class="row"><span>Potongan Telat</span><span>${formatRupiah(totalPotongan)}</span></div>
                            <div class="row"><span>Gaji Pokok</span><span>${formatRupiah(totalPokok)}</span></div>
                            <div class="row"><span>Bonus Fee</span><span>Rp 0</span></div>
                        `
                }

                <div class="line-solid"></div>

                <div class="row grand"><span>${jenis === "bulanan" ? "TOTAL AKHIR" : "TOTAL DIAMBIL"}</span><span>${formatRupiah(jenis === "bulanan" ? totalAkhirBonus : totalDiambil)}</span></div>

                <div class="line"></div>
                <div class="note">${escapeHtml(getRuleText(jenis))}</div>
            </div>
        </body>
        </html>
    `;
}

function getBonusItems(item) {
    if (Array.isArray(item.bonus_bulanan_items)) return item.bonus_bulanan_items;
    if (Array.isArray(item.bonus_bulanan)) return item.bonus_bulanan;
    if (Array.isArray(item.fee_bonus_items)) return item.fee_bonus_items;
    return [];
}

function getBonusSource(item) {
    const source = String(item?.source || item?.source_label || "").toLowerCase();

    if (source.includes("pembelian") || item?.pembelian_id || item?.pembelian_catatan_id) {
        return "pembelian";
    }

    if (source.includes("penjualan") || item?.penjualan_id || item?.penjualan_catatan_id) {
        return "penjualan";
    }

    return "-";
}

function splitBonusItems(items) {
    const bonusItems = Array.isArray(items) ? items : [];

    return {
        pembelianItems: bonusItems.filter((item) => getBonusSource(item) === "pembelian"),
        penjualanItems: bonusItems.filter((item) => getBonusSource(item) === "penjualan"),
    };
}

function sumBonusBagian(items) {
    return (Array.isArray(items) ? items : []).reduce(
        (sum, item) => sum + Number(item.nominal_bagian || 0),
        0
    );
}

function sumBonusNominalCatatan(items) {
    return (Array.isArray(items) ? items : []).reduce(
        (sum, item) => sum + Number(item.nominal_catatan || item.nominal || 0),
        0
    );
}

function getSlipPeriodRows({ jenis, tanggal, tanggalMulai, tanggalSelesai }) {
    if (jenis === "harian") {
        return `<div class="row"><span>Tanggal Slip</span><span>${escapeHtml(formatDateIndonesia(tanggal))}</span></div>`;
    }

    return `
        <div class="row"><span>Tanggal Awal</span><span>${escapeHtml(formatDateIndonesia(tanggalMulai))}</span></div>
        <div class="row"><span>Tanggal Akhir</span><span>${escapeHtml(formatDateIndonesia(tanggalSelesai))}</span></div>
    `;
}

function generateReportHtml(rows, summary, jenis, periodeLabel) {
    const trs = rows
        .map((item, index) => {
            const pokok = Number(item.total_gaji_absensi || item.total_nominal_gaji || 0);
            const bonus = Number(item.total_bonus_bulanan || 0);
            const total = jenis === "bulanan"
                ? Number(item.total_bonus_bulanan || item.total_fee_bonus || 0)
                : Number(item.total_gaji_bersih || 0);

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(item.nama_karyawan || "-")}</td>
                    <td>${escapeHtml(item.no_wa || "-")}</td>
                    <td class="right">${formatRupiah(pokok)}</td>
                    <td class="right">${formatRupiah(bonus)}</td>
                    <td class="center">${escapeHtml(item.total_hari_absen || 0)} hari</td>
                    <td class="right bold">${formatRupiah(total)}</td>
                </tr>
            `;
        })
        .join("");

    return `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8" />
            <title>Laporan Rekap Penggajian</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
                h1, p { margin: 0; }
                .header { border-bottom: 3px solid #0f172a; padding-bottom: 16px; margin-bottom: 18px; }
                .title { font-size: 24px; font-weight: 800; }
                .subtitle { margin-top: 6px; font-size: 13px; color: #475569; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { background: #0f172a; color: white; text-align: left; }
                th, td { border: 1px solid #cbd5e1; padding: 8px; }
                .right { text-align: right; }
                .center { text-align: center; }
                .bold { font-weight: 800; }
                .note { margin-top: 16px; padding: 12px; border-radius: 12px; background: #eff6ff; color: #1e3a8a; font-weight: 700; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <button class="no-print" onclick="window.print()" style="margin-bottom: 12px; padding: 10px 14px; font-weight: 800;">
                Cetak / Save PDF
            </button>

            <div class="header">
                <h1 class="title">${escapeHtml(getJenisTitle(jenis))}</h1>
                <p class="subtitle">Periode: ${escapeHtml(periodeLabel)}</p>
                <p class="subtitle">Total karyawan: ${escapeHtml(summary?.total_karyawan || rows.length || 0)}</p>
                <p class="subtitle">Total diambil: ${escapeHtml(jenis === "bulanan" ? summary?.total_bonus_bulanan_format || "Rp 0" : summary?.total_gaji_bersih_format || "Rp 0")}</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Nama</th>
                        <th>No WA</th>
                        <th>Gaji Pokok</th>
                        <th>Bonus</th>
                        <th>Hari Hadir</th>
                        <th>Total Diambil</th>
                    </tr>
                </thead>
                <tbody>
                    ${trs || '<tr><td colspan="7" style="text-align:center;">Tidak ada data</td></tr>'}
                </tbody>
            </table>

            <div class="note">${escapeHtml(getRuleText(jenis))}</div>
        </body>
        </html>
    `;
}

function countBonus(item) {
    return Array.isArray(item.bonus_bulanan_items)
        ? item.bonus_bulanan_items.length
        : 0;
}

function getRuleText(jenis) {
    if (jenis === "harian") {
        return "Pengambilan harian hanya menghitung gaji pokok pada tanggal yang dipilih. Bonus tidak dihitung.";
    }

    if (jenis === "mingguan") {
        return "Pengambilan mingguan hanya menghitung gaji pokok berdasarkan total hari hadir dari tanggal awal sampai tanggal akhir. Bonus tidak dihitung.";
    }

    return "Pengambilan bulanan hanya menghitung bonus fee dari Catatan Transaksi Power Box Group pada pembelian dan penjualan dalam periode tanggal awal sampai tanggal akhir. Gaji pokok tidak dihitung.";
}

function getJenisTitle(jenis) {
    return jenisOptions.find((item) => item.value === jenis)?.title || "Rekap Penggajian";
}

function getJenisLabel(jenis) {
    return jenisOptions.find((item) => item.value === jenis)?.label || "-";
}

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

function getCurrentMonth() {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${date.getFullYear()}-${month}`;
}

function getStartOfWeek() {
    const date = new Date();
    const day = date.getDay() || 7;
    if (day !== 1) date.setDate(date.getDate() - (day - 1));
    return date.toISOString().slice(0, 10);
}

function getEndOfWeek() {
    const date = new Date(getStartOfWeek());
    date.setDate(date.getDate() + 6);
    return date.toISOString().slice(0, 10);
}

function getStartOfMonth() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
}

function getEndOfMonth() {
    const date = new Date();
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const year = end.getFullYear();
    const month = String(end.getMonth() + 1).padStart(2, "0");
    const day = String(end.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatRupiah(value) {
    const number = Number(value || 0);

    if (Number.isNaN(number)) return "Rp 0";

    return number.toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

function formatDateIndonesia(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function formatMonthIndonesia(value) {
    if (!value) return "-";

    const date = new Date(`${value}-01T00:00:00`);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
