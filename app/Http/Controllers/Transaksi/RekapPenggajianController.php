<?php

namespace App\Http\Controllers\Transaksi;

use App\Http\Controllers\Controller;
use App\Models\AbsensiKaryawan;
use App\Models\DataKaryawan;
use App\Models\KomponenGajiKaryawan;
use App\Models\PembelianCatatan;
use App\Models\PenjualanCatatan;
use App\Models\PotonganKehadiran;
use App\Models\SettingJamKerja;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class RekapPenggajianController extends Controller
{
    private const DEFAULT_MINIMAL_MENIT_LEMBUR = 30;

    public function index(Request $request): JsonResponse
    {
        $periode = $this->resolvePeriode($request);
        $search = trim((string) $request->query('search', ''));

        $setting = $this->getSettingJamKerja();
        $kebijakanTelat = $this->getKebijakan('jam_masuk');
        $kebijakanLembur = $this->getKebijakan('jam_keluar');

        $karyawans = DataKaryawan::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('nama', 'like', "%{$search}%")
                        ->orWhere('no_wa', 'like', "%{$search}%");
                });
            })
            ->orderBy('nama')
            ->get();

        $karyawanIds = $karyawans->pluck('id')->map(fn ($id) => (string) $id)->values();
        $bulanKomponen = $periode['bulan'];
        $isBulanan = $periode['tipe_pengambilan'] === 'bulanan';

        /*
        |--------------------------------------------------------------------------
        | Komponen gaji dan absensi hanya dipakai untuk harian/mingguan.
        | Bulanan hanya mengambil bonus fee transaksi.
        |--------------------------------------------------------------------------
        */
        $komponenGajiKaryawans = $isBulanan
            ? collect()
            : KomponenGajiKaryawan::query()
                ->with(['komponenGaji'])
                ->whereIn('karyawan_id', $karyawanIds)
                ->where('bulan', $bulanKomponen)
                ->get()
                ->groupBy(fn ($item) => (string) $item->karyawan_id);

        $absensis = $isBulanan
            ? collect()
            : AbsensiKaryawan::query()
                ->whereIn('karyawan_id', $karyawanIds)
                ->whereBetween('tanggal', [
                    $periode['start']->format('Y-m-d'),
                    $periode['end']->format('Y-m-d'),
                ])
                ->orderBy('tanggal')
                ->get()
                ->groupBy(fn ($item) => (string) $item->karyawan_id);

        /*
        |--------------------------------------------------------------------------
        | Bonus hanya dihitung saat tipe bulanan.
        |--------------------------------------------------------------------------
        */
        $bonusBulananByKaryawan = $isBulanan
            ? $this->hitungBonusBulanan($karyawanIds, $periode['start'], $periode['end'])
            : collect();

        $data = $karyawans->map(function ($karyawan) use (
            $periode,
            $setting,
            $kebijakanTelat,
            $kebijakanLembur,
            $komponenGajiKaryawans,
            $absensis,
            $bonusBulananByKaryawan,
            $isBulanan
        ) {
            $karyawanId = (string) $karyawan->id;

            $komponenGaji = $komponenGajiKaryawans->get($karyawanId, collect());
            $dataAbsensi = $absensis->get($karyawanId, collect());

            $rekapAbsensi = $this->hitungRekapAbsensi(
                $dataAbsensi,
                $setting,
                $kebijakanTelat,
                $kebijakanLembur
            );

            $tarifHarian = (float) $komponenGaji->sum('nominal_per_hari');

            $bonusItems = $bonusBulananByKaryawan->get($karyawanId, collect());
            $totalBonusBulanan = (float) $bonusItems->sum('nominal_bagian');
            $totalBonusPembelian = (float) $bonusItems
                ->where('source', 'pembelian')
                ->sum('nominal_bagian');
            $totalBonusPenjualan = (float) $bonusItems
                ->where('source', 'penjualan')
                ->sum('nominal_bagian');

            /*
            |--------------------------------------------------------------------------
            | ATURAN FINAL PENGAMBILAN GAJI
            |--------------------------------------------------------------------------
            | Harian:
            | - Hanya gaji pokok tanggal yang dipilih.
            | - Bonus tidak dihitung.
            |
            | Mingguan:
            | - Hanya gaji pokok dari tanggal awal sampai tanggal akhir.
            | - Bonus tidak dihitung.
            |
            | Bulanan:
            | - Hanya bonus fee transaksi.
            | - Gaji pokok tidak dihitung.
            | - Absensi, telat, potongan, dan lembur tidak dihitung.
            |--------------------------------------------------------------------------
            */
            if ($isBulanan) {
                $gajiDariAbsensi = 0;
                $totalPotongan = 0;
                $totalLembur = 0;
                $totalGajiBersih = round($totalBonusBulanan, 2);

                $totalHariAbsen = 0;
                $totalHariTelat = 0;
                $totalMenitTelat = 0;
                $totalHariLembur = 0;
                $totalMenitLembur = 0;
                $labelTotalTelat = '-';
                $labelTotalLembur = '-';
                $detailAbsensi = [];
            } else {
                $gajiDariAbsensi = round(
                    $tarifHarian * (int) $rekapAbsensi['total_hari_absen'],
                    2
                );

                $totalPotongan = (float) $rekapAbsensi['total_potongan_telat'];
                $totalLembur = 0;

                /*
                |--------------------------------------------------------------------------
                | Sesuai aturan sebelumnya:
                | harian/mingguan hanya gaji pokok.
                | Potongan telat tetap dikirim sebagai informasi.
                | Total diambil tetap dari gaji pokok saja.
                |--------------------------------------------------------------------------
                */
                $totalGajiBersih = round($gajiDariAbsensi, 2);

                $totalHariAbsen = $rekapAbsensi['total_hari_absen'];
                $totalHariTelat = $rekapAbsensi['total_hari_telat'];
                $totalMenitTelat = $rekapAbsensi['total_menit_telat'];
                $totalHariLembur = $rekapAbsensi['total_hari_lembur'];
                $totalMenitLembur = $rekapAbsensi['total_menit_lembur'];
                $labelTotalTelat = $this->formatMenit($rekapAbsensi['total_menit_telat']);
                $labelTotalLembur = $this->formatMenit($rekapAbsensi['total_menit_lembur']);
                $detailAbsensi = $rekapAbsensi['detail_absensi'];
            }

            return [
                'karyawan_id' => $karyawan->id,
                'nama_karyawan' => $karyawan->nama,
                'no_wa' => $karyawan->no_wa,

                'tipe_pengambilan' => $periode['tipe_pengambilan'],
                'tipe_pengambilan_label' => $this->labelTipePengambilan($periode['tipe_pengambilan']),
                'bulan' => $periode['bulan'],
                'tanggal_mulai' => $periode['start']->format('Y-m-d'),
                'tanggal_selesai' => $periode['end']->format('Y-m-d'),
                'periode_label' => $periode['label'],

                'tarif_harian' => $isBulanan ? 0 : $tarifHarian,
                'tarif_harian_format' => $this->formatRupiah($isBulanan ? 0 : $tarifHarian),

                /*
                |--------------------------------------------------------------------------
                | Gaji absensi:
                | - Harian/mingguan berisi gaji pokok.
                | - Bulanan selalu Rp 0.
                |--------------------------------------------------------------------------
                */
                'total_gaji_absensi' => $gajiDariAbsensi,
                'total_gaji_absensi_format' => $this->formatRupiah($gajiDariAbsensi),

                'total_nominal_gaji' => $gajiDariAbsensi,
                'total_nominal_gaji_format' => $this->formatRupiah($gajiDariAbsensi),

                /*
                |--------------------------------------------------------------------------
                | Bonus:
                | - Harian/mingguan selalu Rp 0.
                | - Bulanan berisi bonus fee transaksi.
                |--------------------------------------------------------------------------
                */
                'total_bonus_bulanan' => $isBulanan ? $totalBonusBulanan : 0,
                'total_bonus_bulanan_format' => $this->formatRupiah($isBulanan ? $totalBonusBulanan : 0),

                'total_bonus_pembelian' => $isBulanan ? $totalBonusPembelian : 0,
                'total_bonus_pembelian_format' => $this->formatRupiah($isBulanan ? $totalBonusPembelian : 0),

                'total_bonus_penjualan' => $isBulanan ? $totalBonusPenjualan : 0,
                'total_bonus_penjualan_format' => $this->formatRupiah($isBulanan ? $totalBonusPenjualan : 0),

                'total_bonus_transaksi' => $isBulanan ? $bonusItems->count() : 0,
                'total_bonus_pembelian_transaksi' => $isBulanan
                    ? $bonusItems->where('source', 'pembelian')->count()
                    : 0,
                'total_bonus_penjualan_transaksi' => $isBulanan
                    ? $bonusItems->where('source', 'penjualan')->count()
                    : 0,

                /*
                |--------------------------------------------------------------------------
                | Potongan dan lembur:
                | - Bulanan selalu Rp 0.
                | - Harian/mingguan dikirim sebagai informasi.
                |--------------------------------------------------------------------------
                */
                'total_potongan' => $totalPotongan,
                'total_potongan_format' => $this->formatRupiah($totalPotongan),

                'total_lembur' => $totalLembur,
                'total_lembur_format' => $this->formatRupiah($totalLembur),

                /*
                |--------------------------------------------------------------------------
                | Total diambil:
                | - Harian/mingguan = gaji pokok.
                | - Bulanan = bonus fee saja.
                |--------------------------------------------------------------------------
                */
                'total_gaji_bersih' => $totalGajiBersih,
                'total_gaji_bersih_format' => $this->formatRupiah($totalGajiBersih),

                'total_hari_absen' => $totalHariAbsen,
                'total_hari_telat' => $totalHariTelat,
                'total_menit_telat' => $totalMenitTelat,
                'label_total_telat' => $labelTotalTelat,

                'total_hari_lembur' => $totalHariLembur,
                'total_menit_lembur' => $totalMenitLembur,
                'label_total_lembur' => $labelTotalLembur,

                'setting_jam_kerja' => [
                    'jam_masuk' => $setting['jam_masuk'],
                    'jam_pulang' => $setting['jam_pulang'],
                ],

                'kebijakan' => [
                    'telat' => $kebijakanTelat ? [
                        'id' => $kebijakanTelat->id,
                        'nama_kebijakan' => $kebijakanTelat->nama_kebijakan,
                        'toleransi_menit' => (int) $kebijakanTelat->toleransi_menit,
                        'nominal' => (float) $kebijakanTelat->nominal,
                        'nominal_format' => $this->formatRupiah($kebijakanTelat->nominal),
                    ] : null,

                    'lembur' => $kebijakanLembur ? [
                        'id' => $kebijakanLembur->id,
                        'nama_kebijakan' => $kebijakanLembur->nama_kebijakan,
                        'toleransi_menit' => (int) $kebijakanLembur->toleransi_menit,
                        'nominal' => (float) $kebijakanLembur->nominal,
                        'nominal_format' => $this->formatRupiah($kebijakanLembur->nominal),
                    ] : null,
                ],

                /*
                |--------------------------------------------------------------------------
                | Komponen gaji:
                | - Bulanan dikosongkan supaya frontend tidak menampilkan gaji pokok.
                |--------------------------------------------------------------------------
                */
                'komponen_gaji' => $isBulanan
                    ? collect()->values()
                    : $komponenGaji->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'komponen_gaji_id' => $item->komponen_gaji_id,
                            'nama_komponen' => optional($item->komponenGaji)->nama_komponen,
                            'nominal_per_hari' => (float) $item->nominal_per_hari,
                            'nominal_per_hari_format' => $this->formatRupiah($item->nominal_per_hari),
                            'jumlah_hari' => (int) $item->jumlah_hari,
                            'total_nominal' => (float) $item->total_nominal,
                            'total_nominal_format' => $this->formatRupiah($item->total_nominal),
                            'keterangan' => $item->keterangan,
                        ];
                    })->values(),

                /*
                |--------------------------------------------------------------------------
                | Detail bonus hanya untuk bulanan.
                |--------------------------------------------------------------------------
                */
                'bonus_bulanan_items' => $isBulanan ? $bonusItems->values() : collect()->values(),
                'fee_bonus_items' => $isBulanan ? $bonusItems->values() : collect()->values(),

                /*
                |--------------------------------------------------------------------------
                | Detail absensi:
                | - Harian/mingguan berisi absensi.
                | - Bulanan kosong.
                |--------------------------------------------------------------------------
                */
                'detail_absensi' => $isBulanan ? [] : $detailAbsensi,
            ];
        })->values();

        $summary = [
            'tipe_pengambilan' => $periode['tipe_pengambilan'],
            'tipe_pengambilan_label' => $this->labelTipePengambilan($periode['tipe_pengambilan']),
            'periode_label' => $periode['label'],
            'bulan' => $periode['bulan'],
            'tanggal_mulai' => $periode['start']->format('Y-m-d'),
            'tanggal_selesai' => $periode['end']->format('Y-m-d'),
            'total_karyawan' => $data->count(),

            'total_gaji_absensi' => (float) $data->sum('total_gaji_absensi'),
            'total_gaji_absensi_format' => $this->formatRupiah($data->sum('total_gaji_absensi')),

            'total_nominal_gaji' => (float) $data->sum('total_nominal_gaji'),
            'total_nominal_gaji_format' => $this->formatRupiah($data->sum('total_nominal_gaji')),

            'total_bonus_bulanan' => (float) $data->sum('total_bonus_bulanan'),
            'total_bonus_bulanan_format' => $this->formatRupiah($data->sum('total_bonus_bulanan')),

            'total_bonus_pembelian' => (float) $data->sum('total_bonus_pembelian'),
            'total_bonus_pembelian_format' => $this->formatRupiah($data->sum('total_bonus_pembelian')),

            'total_bonus_penjualan' => (float) $data->sum('total_bonus_penjualan'),
            'total_bonus_penjualan_format' => $this->formatRupiah($data->sum('total_bonus_penjualan')),

            'total_bonus_transaksi' => (int) $data->sum('total_bonus_transaksi'),
            'total_bonus_pembelian_transaksi' => (int) $data->sum('total_bonus_pembelian_transaksi'),
            'total_bonus_penjualan_transaksi' => (int) $data->sum('total_bonus_penjualan_transaksi'),

            'total_potongan' => (float) $data->sum('total_potongan'),
            'total_potongan_format' => $this->formatRupiah($data->sum('total_potongan')),

            'total_lembur' => (float) $data->sum('total_lembur'),
            'total_lembur_format' => $this->formatRupiah($data->sum('total_lembur')),

            'total_gaji_bersih' => (float) $data->sum('total_gaji_bersih'),
            'total_gaji_bersih_format' => $this->formatRupiah($data->sum('total_gaji_bersih')),
        ];

        return response()->json([
            'message' => 'Rekap penggajian karyawan berhasil diambil.',
            'summary' => $summary,
            'data' => $data,
        ]);
    }

    public function show(DataKaryawan $karyawan, Request $request): JsonResponse
    {
        $response = $this->index($request);
        $payload = $response->getData(true);

        $data = collect($payload['data'] ?? [])
            ->firstWhere('karyawan_id', $karyawan->id);

        if (!$data) {
            return response()->json([
                'message' => 'Rekap penggajian karyawan tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        return response()->json([
            'message' => 'Detail rekap penggajian karyawan berhasil diambil.',
            'data' => $data,
        ]);
    }

    private function resolvePeriode(Request $request): array
    {
        $tipe = $request->query('tipe_pengambilan', $request->query('jenis_pengambilan', 'bulanan'));

        if (!in_array($tipe, ['harian', 'mingguan', 'bulanan'], true)) {
            $tipe = 'bulanan';
        }

        if ($tipe === 'harian') {
            $tanggal = $request->query('tanggal', now()->format('Y-m-d'));
            $start = Carbon::parse($tanggal)->startOfDay();
            $end = $start->copy()->endOfDay();

            return [
                'tipe_pengambilan' => 'harian',
                'bulan' => $start->format('Y-m'),
                'start' => $start,
                'end' => $end,
                'label' => $start->translatedFormat('d F Y'),
            ];
        }

        if ($tipe === 'mingguan') {
            $tanggalMulai = $request->query('tanggal_mulai');
            $tanggalSelesai = $request->query('tanggal_selesai');

            $start = $tanggalMulai
                ? Carbon::parse($tanggalMulai)->startOfDay()
                : now()->startOfWeek(Carbon::MONDAY)->startOfDay();

            $end = $tanggalSelesai
                ? Carbon::parse($tanggalSelesai)->endOfDay()
                : $start->copy()->endOfWeek(Carbon::SUNDAY)->endOfDay();

            if ($end->lt($start)) {
                $end = $start->copy()->endOfWeek(Carbon::SUNDAY)->endOfDay();
            }

            return [
                'tipe_pengambilan' => 'mingguan',
                'bulan' => $start->format('Y-m'),
                'start' => $start,
                'end' => $end,
                'label' => $start->translatedFormat('d M Y') . ' - ' . $end->translatedFormat('d M Y'),
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | Bulanan sekarang mendukung tanggal awal - tanggal akhir.
        | Jika frontend mengirim tanggal_mulai dan tanggal_selesai, itu yang dipakai.
        | Jika tidak, fallback ke bulan penuh.
        |--------------------------------------------------------------------------
        */
        $tanggalMulai = $request->query('tanggal_mulai');
        $tanggalSelesai = $request->query('tanggal_selesai');

        if ($tanggalMulai || $tanggalSelesai) {
            $start = $tanggalMulai
                ? Carbon::parse($tanggalMulai)->startOfDay()
                : now()->startOfMonth();

            $end = $tanggalSelesai
                ? Carbon::parse($tanggalSelesai)->endOfDay()
                : $start->copy()->endOfMonth();

            if ($end->lt($start)) {
                $end = $start->copy()->endOfMonth();
            }

            return [
                'tipe_pengambilan' => 'bulanan',
                'bulan' => $start->format('Y-m'),
                'start' => $start,
                'end' => $end,
                'label' => $start->translatedFormat('d M Y') . ' - ' . $end->translatedFormat('d M Y'),
            ];
        }

        $bulan = $request->query('bulan', now()->format('Y-m'));
        $start = Carbon::parse($bulan . '-01')->startOfMonth();
        $end = $start->copy()->endOfMonth();

        return [
            'tipe_pengambilan' => 'bulanan',
            'bulan' => $bulan,
            'start' => $start,
            'end' => $end,
            'label' => $start->translatedFormat('F Y'),
        ];
    }

    private function hitungBonusBulanan($karyawanIds, Carbon $start, Carbon $end): Collection
    {
        $allowedIds = collect($karyawanIds)->map(fn ($id) => (string) $id)->values();
        $rows = collect();

        /*
        |--------------------------------------------------------------------------
        | BONUS FEE BULANAN
        |--------------------------------------------------------------------------
        | Sumber bonus fee diambil dari:
        | 1. pembelian_catatans tipe power_box
        | 2. penjualan_catatans tipe power_box
        |
        | Karyawan dan nominal pembagian fee dibaca dari field:
        | - karyawan_ids
        | - nominal_per_karyawan
        |--------------------------------------------------------------------------
        */
        $pembelianCatatans = PembelianCatatan::query()
            ->with(['pembelian'])
            ->where('tipe', 'power_box')
            ->whereNotNull('karyawan_ids')
            ->whereHas('pembelian', function ($query) use ($start, $end) {
                $query->whereBetween('tanggal', [
                    $start->format('Y-m-d'),
                    $end->format('Y-m-d'),
                ]);
            })
            ->get();

        foreach ($pembelianCatatans as $catatan) {
            $this->pushBonusRowsFromCatatan(
                rows: $rows,
                allowedIds: $allowedIds,
                catatan: $catatan,
                source: 'pembelian',
                sourceId: $catatan->pembelian_id,
                nomorNota: $catatan->pembelian?->nomor_nota,
                namaRelasi: $catatan->pembelian?->nama_supplier,
                tanggal: $catatan->pembelian?->tanggal ? Carbon::parse($catatan->pembelian->tanggal) : null
            );
        }

        $penjualanCatatans = PenjualanCatatan::query()
            ->with(['penjualan'])
            ->where('tipe', 'power_box')
            ->whereNotNull('karyawan_ids')
            ->whereHas('penjualan', function ($query) use ($start, $end) {
                $query->whereBetween('tanggal', [
                    $start->format('Y-m-d'),
                    $end->format('Y-m-d'),
                ]);
            })
            ->get();

        foreach ($penjualanCatatans as $catatan) {
            $this->pushBonusRowsFromCatatan(
                rows: $rows,
                allowedIds: $allowedIds,
                catatan: $catatan,
                source: 'penjualan',
                sourceId: $catatan->penjualan_id,
                nomorNota: $catatan->penjualan?->nomor_nota,
                namaRelasi: $catatan->penjualan?->nama_pelanggan,
                tanggal: $catatan->penjualan?->tanggal ? Carbon::parse($catatan->penjualan->tanggal) : null
            );
        }

        return $rows->groupBy('karyawan_id');
    }

    private function pushBonusRowsFromCatatan(
        Collection $rows,
        Collection $allowedIds,
        mixed $catatan,
        string $source,
        mixed $sourceId,
        ?string $nomorNota,
        ?string $namaRelasi,
        ?Carbon $tanggal
    ): void {
        $ids = collect($catatan->karyawan_ids)
            ->filter()
            ->map(fn ($id) => (string) $id)
            ->unique()
            ->values();

        if ($ids->isEmpty()) {
            return;
        }

        $nominal = (float) $catatan->nominal;
        $nominalPerKaryawan = (float) ($catatan->nominal_per_karyawan ?? 0);

        if ($nominalPerKaryawan <= 0) {
            $nominalPerKaryawan = round($nominal / max($ids->count(), 1), 2);
        }

        foreach ($ids as $id) {
            if (!$allowedIds->contains($id)) {
                continue;
            }

            $rows->push([
                'source' => $source,
                'source_label' => $source === 'pembelian' ? 'Pembelian' : 'Penjualan',
                'source_catatan_id' => $catatan->id,
                'source_id' => $sourceId,

                // Alias lama agar frontend lama tetap aman.
                'pembelian_catatan_id' => $source === 'pembelian' ? $catatan->id : null,
                'pembelian_id' => $source === 'pembelian' ? $sourceId : null,
                'penjualan_catatan_id' => $source === 'penjualan' ? $catatan->id : null,
                'penjualan_id' => $source === 'penjualan' ? $sourceId : null,

                'nomor_nota' => $nomorNota,
                'nama_relasi' => $namaRelasi,
                'nama_supplier' => $source === 'pembelian' ? $namaRelasi : null,
                'nama_pelanggan' => $source === 'penjualan' ? $namaRelasi : null,
                'tanggal' => $tanggal?->format('Y-m-d'),
                'tanggal_label' => $tanggal?->translatedFormat('d M Y'),
                'catatan' => $catatan->catatan,
                'nominal_catatan' => $nominal,
                'nominal_catatan_format' => $this->formatRupiah($nominal),
                'jumlah_karyawan' => $ids->count(),
                'nominal_bagian' => $nominalPerKaryawan,
                'nominal_bagian_format' => $this->formatRupiah($nominalPerKaryawan),
                'karyawan_id' => $id,
            ]);
        }
    }

    private function hitungRekapAbsensi($absensis, array $setting, ?PotonganKehadiran $kebijakanTelat, ?PotonganKehadiran $kebijakanLembur): array
    {
        $totalHariAbsen = 0;
        $totalHariTelat = 0;
        $totalMenitTelat = 0;
        $totalPotonganTelat = 0;
        $totalHariLembur = 0;
        $totalMenitLembur = 0;
        $totalNominalLembur = 0;
        $detailAbsensi = [];

        foreach ($absensis as $absensi) {
            $totalHariAbsen++;

            $jamMasuk = $absensi->jam_masuk ? substr($absensi->jam_masuk, 0, 5) : null;
            $jamPulang = $absensi->jam_pulang ? substr($absensi->jam_pulang, 0, 5) : null;

            $menitTelat = $jamMasuk ? $this->hitungSelisihTelatMenit($setting['jam_masuk'], $jamMasuk) : 0;
            $menitLembur = $jamPulang ? $this->hitungSelisihLemburMenit($setting['jam_pulang'], $jamPulang) : 0;

            $nominalPotonganTelat = $this->hitungNominalTelat($menitTelat, $kebijakanTelat);
            $nominalLembur = $this->hitungNominalLembur($menitLembur, $kebijakanLembur);

            if ($menitTelat > 0) {
                $totalHariTelat++;
                $totalMenitTelat += $menitTelat;
                $totalPotonganTelat += $nominalPotonganTelat;
            }

            if ($menitLembur > 0) {
                $totalHariLembur++;
                $totalMenitLembur += $menitLembur;
                $totalNominalLembur += $nominalLembur;
            }

            $tanggal = $absensi->tanggal ? Carbon::parse($absensi->tanggal) : null;

            $detailAbsensi[] = [
                'id' => $absensi->id,
                'tanggal' => $tanggal?->format('Y-m-d'),
                'tanggal_label' => $tanggal?->translatedFormat('d M Y'),
                'jam_masuk' => $jamMasuk,
                'jam_pulang' => $jamPulang,
                'keterangan_masuk' => $absensi->keterangan_masuk,
                'keterangan_pulang' => $absensi->keterangan_pulang,
                'menit_telat' => $menitTelat,
                'label_telat' => $this->formatMenit($menitTelat),
                'nominal_potongan_telat' => $nominalPotonganTelat,
                'nominal_potongan_telat_format' => $this->formatRupiah($nominalPotonganTelat),
                'menit_lembur' => $menitLembur,
                'label_lembur' => $this->formatMenit($menitLembur),
                'nominal_lembur' => $nominalLembur,
                'nominal_lembur_format' => $this->formatRupiah($nominalLembur),
                'keterangan' => $absensi->keterangan,
            ];
        }

        return [
            'total_hari_absen' => $totalHariAbsen,
            'total_hari_telat' => $totalHariTelat,
            'total_menit_telat' => $totalMenitTelat,
            'total_potongan_telat' => (float) $totalPotonganTelat,
            'total_hari_lembur' => $totalHariLembur,
            'total_menit_lembur' => $totalMenitLembur,
            'total_lembur' => (float) $totalNominalLembur,
            'detail_absensi' => $detailAbsensi,
        ];
    }

    private function hitungNominalTelat(int $menitTelat, ?PotonganKehadiran $kebijakanTelat): float
    {
        if (!$kebijakanTelat) {
            return 0;
        }

        $toleransi = (int) $kebijakanTelat->toleransi_menit;

        if ($menitTelat <= $toleransi) {
            return 0;
        }

        return (float) $kebijakanTelat->nominal;
    }

    private function hitungNominalLembur(int $menitLembur, ?PotonganKehadiran $kebijakanLembur): float
    {
        if (!$kebijakanLembur) {
            return 0;
        }

        $minimalMenit = (int) $kebijakanLembur->toleransi_menit;

        if ($minimalMenit <= 0) {
            $minimalMenit = self::DEFAULT_MINIMAL_MENIT_LEMBUR;
        }

        if ($menitLembur < $minimalMenit) {
            return 0;
        }

        $kelipatan = intdiv($menitLembur, $minimalMenit);

        return $kelipatan * (float) $kebijakanLembur->nominal;
    }

    private function getKebijakan(string $jenis): ?PotonganKehadiran
    {
        return PotonganKehadiran::query()
            ->where('jenis_potongan', $jenis)
            ->where('is_active', true)
            ->latest()
            ->first();
    }

    private function getSettingJamKerja(): array
    {
        $setting = SettingJamKerja::query()
            ->where('status', 'Aktif')
            ->latest()
            ->first();

        return [
            'jam_masuk' => $setting?->jam_masuk ? substr($setting->jam_masuk, 0, 5) : '08:00',
            'jam_pulang' => $setting?->jam_pulang ? substr($setting->jam_pulang, 0, 5) : '17:00',
        ];
    }

    private function hitungSelisihTelatMenit(string $jamSetting, string $jamAktual): int
    {
        $setting = Carbon::createFromFormat('H:i', $jamSetting);
        $aktual = Carbon::createFromFormat('H:i', $jamAktual);

        if ($aktual->lessThanOrEqualTo($setting)) {
            return 0;
        }

        return (int) floor($setting->diffInMinutes($aktual));
    }

    private function hitungSelisihLemburMenit(string $jamPulangSetting, string $jamPulangAktual): int
    {
        $setting = Carbon::createFromFormat('H:i', $jamPulangSetting);
        $aktual = Carbon::createFromFormat('H:i', $jamPulangAktual);

        if ($aktual->lessThanOrEqualTo($setting)) {
            return 0;
        }

        return (int) floor($setting->diffInMinutes($aktual));
    }

    private function labelTipePengambilan(string $tipe): string
    {
        return match ($tipe) {
            'harian' => 'Pengambilan Harian',
            'mingguan' => 'Pengambilan Mingguan',
            default => 'Pengambilan Bulanan',
        };
    }

    private function formatMenit(int $menit): string
    {
        if ($menit <= 0) {
            return '-';
        }

        $jam = intdiv($menit, 60);
        $sisaMenit = $menit % 60;

        if ($jam > 0 && $sisaMenit > 0) {
            return "{$jam} jam {$sisaMenit} menit";
        }

        if ($jam > 0) {
            return "{$jam} jam";
        }

        return "{$sisaMenit} menit";
    }

    private function formatRupiah($nominal): string
    {
        return 'Rp ' . number_format((float) $nominal, 0, ',', '.');
    }
}
