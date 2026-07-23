import React from "react";

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
                <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-950 p-8 text-white">
                    <div className="absolute right-8 top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl"></div>
                    <div className="absolute bottom-0 right-24 h-20 w-20 rounded-full bg-cyan-400/20 blur-xl"></div>

                    <div className="relative z-10">
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-100">
                            Dashboard
                        </p>

                        <h3 className="mt-4 text-3xl font-black sm:text-4xl">
                            Sistem Master Data Barang
                        </h3>

                        <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-blue-100">
                            Halaman dashboard untuk memantau ringkasan data barang,
                            stok tersedia, barang masuk, dan barang keluar.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Total Barang" value="128" icon="📦" color="blue" />
                <StatCard title="Stok Tersedia" value="1.240" icon="🏷️" color="green" />
                <StatCard title="Barang Masuk" value="45" icon="⬇️" color="amber" />
                <StatCard title="Barang Keluar" value="32" icon="⬆️" color="violet" />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
                <div className="rounded-[2rem] bg-white p-6 shadow-sm xl:col-span-2">
                    <SectionTitle
                        title="Ringkasan Data Barang"
                        subtitle="Data contoh untuk tampilan awal dashboard."
                    />

                    <SimpleTable
                        withAction={false}
                        headers={["Kode", "Nama Barang", "Stok", "Satuan", "Status"]}
                        rows={[
                            ["BRG001", "Semen 50kg", "120", "Sak", "Tersedia"],
                            ["BRG002", "Pasir", "30", "M³", "Tersedia"],
                            ["BRG003", "Besi 10mm", "80", "Batang", "Tersedia"],
                            ["BRG004", "Cat Tembok", "15", "Kaleng", "Stok Menipis"],
                        ]}
                    />
                </div>

                <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                    <SectionTitle
                        title="Status Stok"
                        subtitle="Monitoring stok barang."
                    />

                    <div className="mt-6 space-y-5">
                        <Progress label="Semen 50kg" value="90%" width="w-[90%]" />
                        <Progress label="Pasir" value="65%" width="w-[65%]" />
                        <Progress label="Besi 10mm" value="75%" width="w-[75%]" />
                        <Progress label="Cat Tembok" value="35%" width="w-[35%]" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function SectionTitle({ title, subtitle }) {
    return (
        <div className="mb-6">
            <h3 className="text-2xl font-black text-slate-950">{title}</h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {subtitle}
            </p>
        </div>
    );
}

function StatCard({ title, value, icon, color }) {
    const colors = {
        blue: "bg-blue-50 text-blue-700",
        violet: "bg-violet-50 text-violet-700",
        amber: "bg-amber-50 text-amber-700",
        green: "bg-green-50 text-green-700",
    };

    return (
        <div className="rounded-[2rem] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-black text-slate-400">{title}</p>
                    <h3 className="mt-2 text-3xl font-black text-slate-950">
                        {value}
                    </h3>
                    <p className="mt-3 text-xs font-bold text-green-600">
                        Data terbaru
                    </p>
                </div>

                <div
                    className={`flex h-16 w-16 items-center justify-center rounded-3xl text-3xl ${
                        colors[color] || colors.blue
                    }`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

function Progress({ label, value, width }) {
    return (
        <div>
            <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-black text-slate-700">{label}</span>
                <span className="font-black text-blue-600">{value}</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-3 rounded-full bg-blue-600 ${width}`}></div>
            </div>
        </div>
    );
}

function SimpleTable({ headers, rows, withAction = false }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-950 text-white">
                            {headers.map((header) => (
                                <th
                                    key={header}
                                    className="whitespace-nowrap px-5 py-4 font-black"
                                >
                                    {header}
                                </th>
                            ))}

                            {withAction && (
                                <th className="whitespace-nowrap px-5 py-4 font-black">
                                    Aksi
                                </th>
                            )}
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className="border-t border-slate-100 text-slate-700 hover:bg-blue-50/40"
                            >
                                {row.map((cell, cellIndex) => (
                                    <td
                                        key={cellIndex}
                                        className="whitespace-nowrap px-5 py-4 font-semibold"
                                    >
                                        {renderCell(cell)}
                                    </td>
                                ))}

                                {withAction && (
                                    <td className="whitespace-nowrap px-5 py-4">
                                        <button className="mr-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200">
                                            Edit
                                        </button>

                                        <button className="rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200">
                                            Hapus
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function renderCell(value) {
    const badgeValues = ["Aktif", "Tersedia", "Stok Menipis"];

    if (badgeValues.includes(value)) {
        const badgeClass =
            value === "Stok Menipis"
                ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700";

        return (
            <span className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass}`}>
                {value}
            </span>
        );
    }

    return value;
}
