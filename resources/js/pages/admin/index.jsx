import "../../../css/app.css";

import React, {
    Component,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import axios from "axios";

import DashboardPage from "./DashboardPage";

/*
|--------------------------------------------------------------------------
| Master Data
|--------------------------------------------------------------------------
*/
import KategoriBarangIndexPage from "./master-data/kategori-barang/Index";
import DataBarangIndexPage from "./master-data/data-barang/Index";
import VarianProdukIndexPage from "./master-data/varian-produk/Index";
import JenisDokumenIndexPage from "./master-data/jenis-dokumen/Index";
import DataCustomerIndexPage from "./master-data/data-customer/Index";

/*
|--------------------------------------------------------------------------
| Karyawan
|--------------------------------------------------------------------------
*/
import DataKaryawanIndexPage from "./data-karyawan/Index";
import AbsensiKaryawanIndexPage from "./absensi-karyawan/Index";
import SettingJamKerjaIndexPage from "./setting-jam-kerja/Index";

/*
|--------------------------------------------------------------------------
| Penggajian
|--------------------------------------------------------------------------
*/
import KategoriPenggajianIndexPage from "./kategori-penggajian/Index";
import PenggajianKaryawanIndexPage from "./penggajian-karyawan/Index";
import PotonganKehadiranIndexPage from "./potongan-kehadiran/Index";
import RekapPenggajianIndexPage from "./rekap-penggajian/Index";

/*
|--------------------------------------------------------------------------
| Transaksi
|--------------------------------------------------------------------------
*/
import PembelianIndexPage from "./pembelian/Index";
import BoronganIndexPage from "./borongan/Index";
import PenjualanIndexPage from "./penjualan/Index";
import ProdukStokIndexPage from "./produk-stok/Index";
import PengeluaranIndexPage from "./pengeluaran/Index";

/*
|--------------------------------------------------------------------------
| Reminder
|--------------------------------------------------------------------------
*/
import DocumentReminderIndexPage from "./document-reminder/Index";

/*
|--------------------------------------------------------------------------
| Pengaturan
|--------------------------------------------------------------------------
*/
import CompanyProfileIndexPage from "./company-profile/Index";

class PageErrorBoundary extends Component {
    constructor(props) {
        super(props);

        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error, info) {
        console.error("React page error:", error);
        console.error("React error info:", info);
    }

    componentDidUpdate(prevProps) {
        if (
            prevProps.resetKey !== this.props.resetKey &&
            this.state.hasError
        ) {
            this.setState({
                hasError: false,
                error: null,
            });
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
                                Halaman gagal dimuat
                            </p>

                            <h3 className="mt-2 text-2xl font-black text-red-900">
                                Ada error pada komponen halaman ini
                            </h3>

                            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-red-700">
                                Biasanya terjadi karena file halaman belum
                                tersedia, nama export komponen salah, endpoint
                                gagal, atau path import tidak sesuai.
                            </p>

                            <pre className="mt-4 max-h-60 overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs font-semibold text-red-700">
                                {String(
                                    this.state.error?.message ||
                                        this.state.error ||
                                        "Unknown error",
                                )}
                            </pre>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                this.setState({
                                    hasError: false,
                                    error: null,
                                })
                            }
                            className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700"
                        >
                            Muat Ulang Komponen
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default function AdminPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState("dashboard");
    const contentRef = useRef(null);

    /*
    |--------------------------------------------------------------------------
    | Konfigurasi Menu
    |--------------------------------------------------------------------------
    */
    const menuItems = useMemo(
        () => [
            {
                key: "dashboard",
                label: "Dashboard",
                description: "Ringkasan utama sistem",
                icon: "🏠",
                component: DashboardPage,
            },

            {
                key: "master-data",
                label: "Master Data",
                description: "Kelola data utama",
                icon: "📚",
                children: [
                    {
                        key: "kategori-barang",
                        label: "Kategori Barang",
                        description: "Kelola kategori barang",
                        icon: "🏷️",
                        component: KategoriBarangIndexPage,
                    },
                    {
                        key: "data-barang",
                        label: "Data Barang",
                        description: "Kelola data barang",
                        icon: "📦",
                        component: DataBarangIndexPage,
                    },
                    {
                        key: "varian-produk",
                        label: "Varian Produk",
                        description: "Kelola varian per barang",
                        icon: "🎨",
                        component: VarianProdukIndexPage,
                    },
                    {
                        key: "jenis-dokumen",
                        label: "Jenis Dokumen",
                        description: "Kelola jenis dokumen reminder",
                        icon: "📄",
                        component: JenisDokumenIndexPage,
                    },
                    {
                        key: "data-customer",
                        label: "Data Customer",
                        description: "Kelola customer dan nomor WhatsApp",
                        icon: "👥",
                        component: DataCustomerIndexPage,
                    },
                ],
            },

            {
                key: "karyawan",
                label: "Karyawan",
                description: "Kelola karyawan dan absensi",
                icon: "👥",
                children: [
                    {
                        key: "data-karyawan",
                        label: "Data Karyawan",
                        description: "Kelola data karyawan",
                        icon: "👤",
                        component: DataKaryawanIndexPage,
                    },
                    {
                        key: "absensi-karyawan",
                        label: "Absensi Karyawan",
                        description: "Kelola masuk dan pulang",
                        icon: "🕒",
                        component: AbsensiKaryawanIndexPage,
                    },
                    {
                        key: "setting-jam-kerja",
                        label: "Setting Jam Kerja",
                        description: "Atur jam masuk dan pulang",
                        icon: "⏰",
                        component: SettingJamKerjaIndexPage,
                    },
                ],
            },

            {
                key: "penggajian",
                label: "Penggajian",
                description: "Kelola payroll dan komponen gaji",
                icon: "💰",
                children: [
                    {
                        key: "kategori-penggajian",
                        label: "Kategori Penggajian",
                        description: "Kategori dan nominal gaji",
                        icon: "🏷️",
                        component: KategoriPenggajianIndexPage,
                    },
                    {
                        key: "penggajian-karyawan",
                        label: "Penggajian Karyawan",
                        description: "Komponen gaji per karyawan",
                        icon: "👥",
                        component: PenggajianKaryawanIndexPage,
                    },
                    {
                        key: "potongan-kehadiran",
                        label: "Potongan Kehadiran",
                        description: "Atur telat, lembur dan potongan",
                        icon: "⏱️",
                        component: PotonganKehadiranIndexPage,
                    },
                    {
                        key: "rekap-penggajian",
                        label: "Rekap Penggajian",
                        description: "Harian, mingguan dan bulanan",
                        icon: "📑",
                        component: RekapPenggajianIndexPage,
                    },
                ],
            },

            {
                key: "transaksi",
                label: "Transaksi",
                description: "Kelola transaksi operasional",
                icon: "🔄",
                children: [
                    {
                        key: "pengeluaran",
                        label: "Mutasi Transaksi",
                        description: "Kasir dan mutasi harian",
                        icon: "🔁",
                        component: PengeluaranIndexPage,
                    },
                    {
                        key: "pembelian",
                        label: "Pembelian",
                        description: "Kelola nota pembelian",
                        icon: "🛒",
                        component: PembelianIndexPage,
                    },
                    {
                        key: "borongan",
                        label: "Borongan",
                        description: "Produksi mentah menjadi jadi",
                        icon: "📋",
                        component: BoronganIndexPage,
                    },
                    {
                        key: "penjualan",
                        label: "Penjualan",
                        description: "Kelola nota penjualan",
                        icon: "🧾",
                        component: PenjualanIndexPage,
                    },
                    {
                        key: "produk-stok",
                        label: "Produk Stok",
                        description: "Stok akhir dan riwayat stok",
                        icon: "📊",
                        component: ProdukStokIndexPage,
                    },
                ],
            },

            {
                key: "reminder",
                label: "Reminder",
                description: "Pengingat dokumen dan jatuh tempo",
                icon: "🔔",
                children: [
                    {
                        key: "document-reminder",
                        label: "Reminder Dokumen",
                        description: "STNK, kontrak dan dokumen",
                        icon: "📄",
                        component: DocumentReminderIndexPage,
                    },
                ],
            },

            {
                key: "pengaturan",
                label: "Pengaturan",
                description: "Profil dan integrasi sistem",
                icon: "⚙️",
                children: [
                    {
                        key: "company-profile",
                        label: "Profil Perusahaan",
                        description: "Identitas dan koneksi Fonnte",
                        icon: "🏢",
                        component: CompanyProfileIndexPage,
                    },
                ],
            },
        ],
        [],
    );

    /*
    |--------------------------------------------------------------------------
    | Status Buka/Tutup Menu Parent
    |--------------------------------------------------------------------------
    */
    const initialOpenMenus = useMemo(() => {
        return menuItems
            .filter((menu) => Array.isArray(menu.children))
            .reduce((result, menu) => {
                result[menu.key] = false;
                return result;
            }, {});
    }, [menuItems]);

    const [openMenus, setOpenMenus] = useState(initialOpenMenus);

    /*
    |--------------------------------------------------------------------------
    | Daftar Semua Halaman
    |--------------------------------------------------------------------------
    */
    const flattenMenus = useMemo(() => {
        return menuItems.flatMap((menu) => {
            if (Array.isArray(menu.children)) {
                return menu.children.map((child) => ({
                    ...child,
                    parentKey: menu.key,
                    parentLabel: menu.label,
                }));
            }

            return [
                {
                    ...menu,
                    parentKey: null,
                    parentLabel: "Admin Panel",
                },
            ];
        });
    }, [menuItems]);

    const activeMenuData = useMemo(() => {
        return (
            flattenMenus.find(
                (menu) => menu.key === activeMenu,
            ) || flattenMenus[0]
        );
    }, [activeMenu, flattenMenus]);

    const ActiveComponent =
        activeMenuData?.component || DashboardPage;

    /*
    |--------------------------------------------------------------------------
    | Scroll Konten ketika pindah menu
    |--------------------------------------------------------------------------
    */
    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
        });

        if (contentRef.current) {
            contentRef.current.scrollTo({
                top: 0,
                left: 0,
                behavior: "smooth",
            });
        }
    }, [activeMenu]);

    /*
    |--------------------------------------------------------------------------
    | Tutup Sidebar dengan tombol Escape
    |--------------------------------------------------------------------------
    */
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setSidebarOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, []);

    /*
    |--------------------------------------------------------------------------
    | Logout
    |--------------------------------------------------------------------------
    */
    const handleLogout = async () => {
        const confirmed = window.confirm(
            "Yakin ingin keluar dari sistem?",
        );

        if (!confirmed) return;

        try {
            await axios.post("/logout");

            window.location.href = "/login";
        } catch (error) {
            console.error("Logout error:", error);

            alert(
                error?.response?.data?.message ||
                    "Gagal logout.",
            );
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Tutup Semua Menu Parent
    |--------------------------------------------------------------------------
    */
    const closeAllParentMenus = () => {
        setOpenMenus(initialOpenMenus);
    };

    /*
    |--------------------------------------------------------------------------
    | Klik Menu Utama
    |--------------------------------------------------------------------------
    */
    const handleMenuClick = (menu) => {
        const hasChildren = Array.isArray(menu.children);

        if (hasChildren) {
            setOpenMenus((previous) => {
                const nextState = {
                    ...initialOpenMenus,
                };

                /*
                 * Hanya satu menu parent yang terbuka.
                 */
                nextState[menu.key] =
                    !previous[menu.key];

                return nextState;
            });

            return;
        }

        setActiveMenu(menu.key);
        closeAllParentMenus();
        setSidebarOpen(false);
    };

    /*
    |--------------------------------------------------------------------------
    | Klik Submenu
    |--------------------------------------------------------------------------
    */
    const handleSubMenuClick = (
        parentKey,
        childKey,
    ) => {
        setActiveMenu(childKey);

        setOpenMenus({
            ...initialOpenMenus,
            [parentKey]: true,
        });

        setSidebarOpen(false);
    };

    /*
    |--------------------------------------------------------------------------
    | Informasi Logo / Nama Perusahaan Sidebar
    |--------------------------------------------------------------------------
    */
    const appName = "Store Isma";
    const appInitial = getInitials(appName);

    return (
        <main className="h-screen overflow-hidden bg-slate-100 text-slate-900">
            <div className="flex h-screen overflow-hidden">
                {sidebarOpen && (
                    <button
                        type="button"
                        onClick={() =>
                            setSidebarOpen(false)
                        }
                        className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
                        aria-label="Tutup sidebar"
                    />
                )}

                <aside
                    className={`fixed inset-y-0 left-0 z-40 h-screen w-80 shrink-0 transform overflow-hidden border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0 lg:shadow-none ${
                        sidebarOpen
                            ? "translate-x-0"
                            : "-translate-x-full"
                    }`}
                >
                    <div className="flex h-full min-h-0 flex-col">
                        <div className="shrink-0 p-5">
                            <div className="rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-950 p-5 text-white shadow-xl shadow-blue-200">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-lg font-black backdrop-blur">
                                        {appInitial}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-100">
                                            Admin Panel
                                        </p>

                                        <h1 className="mt-1 truncate text-xl font-black">
                                            {appName}
                                        </h1>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSidebarOpen(
                                                false,
                                            )
                                        }
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-black hover:bg-white/20 lg:hidden"
                                        aria-label="Tutup sidebar"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        </div>

                        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-5">
                            {menuItems.map((menu) => {
                                const hasChildren =
                                    Array.isArray(
                                        menu.children,
                                    );

                                const childKeys =
                                    hasChildren
                                        ? menu.children.map(
                                              (child) =>
                                                  child.key,
                                          )
                                        : [];

                                const isActive =
                                    activeMenu ===
                                        menu.key ||
                                    childKeys.includes(
                                        activeMenu,
                                    );

                                const isOpen = Boolean(
                                    openMenus[menu.key],
                                );

                                return (
                                    <div key={menu.key}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleMenuClick(
                                                    menu,
                                                )
                                            }
                                            className={`group flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition ${
                                                isActive
                                                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                                            }`}
                                        >
                                            <span
                                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg transition ${
                                                    isActive
                                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                                                        : "bg-slate-100 group-hover:bg-white"
                                                }`}
                                            >
                                                {
                                                    menu.icon
                                                }
                                            </span>

                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-black">
                                                    {
                                                        menu.label
                                                    }
                                                </span>

                                                <span
                                                    className={`mt-0.5 block truncate text-xs font-semibold ${
                                                        isActive
                                                            ? "text-blue-500"
                                                            : "text-slate-400"
                                                    }`}
                                                >
                                                    {
                                                        menu.description
                                                    }
                                                </span>
                                            </span>

                                            {hasChildren && (
                                                <span
                                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black shadow-sm transition ${
                                                        isActive
                                                            ? "bg-blue-100 text-blue-700"
                                                            : "bg-white text-slate-500"
                                                    }`}
                                                >
                                                    {isOpen
                                                        ? "−"
                                                        : "+"}
                                                </span>
                                            )}
                                        </button>

                                        {hasChildren &&
                                            isOpen && (
                                                <div className="ml-6 mt-2 space-y-1 border-l-2 border-slate-100 pl-4">
                                                    {menu.children.map(
                                                        (
                                                            child,
                                                        ) => {
                                                            const isChildActive =
                                                                activeMenu ===
                                                                child.key;

                                                            return (
                                                                <button
                                                                    key={
                                                                        child.key
                                                                    }
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleSubMenuClick(
                                                                            menu.key,
                                                                            child.key,
                                                                        )
                                                                    }
                                                                    className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                                                                        isChildActive
                                                                            ? "bg-slate-950 text-white shadow-lg"
                                                                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                                                                    }`}
                                                                >
                                                                    <span
                                                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${
                                                                            isChildActive
                                                                                ? "bg-white/10"
                                                                                : "bg-slate-100 group-hover:bg-white"
                                                                        }`}
                                                                    >
                                                                        {
                                                                            child.icon
                                                                        }
                                                                    </span>

                                                                    <span className="min-w-0 flex-1">
                                                                        <span className="block truncate text-sm font-black">
                                                                            {
                                                                                child.label
                                                                            }
                                                                        </span>

                                                                        <span
                                                                            className={`mt-0.5 block truncate text-xs font-semibold ${
                                                                                isChildActive
                                                                                    ? "text-slate-300"
                                                                                    : "text-slate-400"
                                                                            }`}
                                                                        >
                                                                            {
                                                                                child.description
                                                                            }
                                                                        </span>
                                                                    </span>
                                                                </button>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            )}
                                    </div>
                                );
                            })}
                        </nav>

                        <div className="shrink-0 border-t border-slate-100 p-5">
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                                    Login sebagai
                                </p>

                                <div className="mt-3 flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">
                                        AD
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-black text-slate-900">
                                            Admin
                                        </p>

                                        <p className="text-xs font-bold text-emerald-600">
                                            ● Online
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                <section className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
                    <header className="shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
                        <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
                            <div className="flex min-w-0 items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSidebarOpen(true)
                                    }
                                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-700 hover:bg-slate-200 lg:hidden"
                                    aria-label="Buka sidebar"
                                >
                                    ☰
                                </button>

                                <div className="min-w-0">
                                    <p className="truncate text-xs font-black uppercase tracking-wide text-blue-600">
                                        {activeMenuData?.parentLabel ||
                                            "Admin Panel"}
                                    </p>

                                    <h2 className="truncate text-xl font-black text-slate-950 sm:text-2xl">
                                        {activeMenuData?.label ||
                                            "Dashboard"}
                                    </h2>
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-3">
                                <div className="hidden items-center gap-3 rounded-2xl bg-slate-950 px-4 py-2 text-white sm:flex">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-black">
                                        AD
                                    </div>

                                    <div>
                                        <p className="text-sm font-black">
                                            Admin
                                        </p>

                                        <p className="text-xs font-bold text-green-300">
                                            Online
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-100 hover:bg-red-700"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </header>

                    <div
                        ref={contentRef}
                        className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8"
                    >
                        <PageErrorBoundary
                            resetKey={activeMenu}
                        >
                            <ActiveComponent />
                        </PageErrorBoundary>
                    </div>
                </section>
            </div>
        </main>
    );
}

function getInitials(value) {
    const words = String(value || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) {
        return "AP";
    }

    if (words.length === 1) {
        return words[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
