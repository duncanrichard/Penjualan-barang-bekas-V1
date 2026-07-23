<?php

namespace App\Http\Controllers\Transaksi;

use App\Http\Controllers\Controller;
use App\Models\AbsensiKaryawan;
use App\Models\DataKaryawan;
use App\Models\SettingJamKerja;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AbsensiKaryawanController extends Controller
{
    private const MINIMAL_MENIT_LEMBUR = 30;

    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $tanggal = $request->query('tanggal', now()->format('Y-m-d'));

        $absensis = AbsensiKaryawan::query()
            ->with('karyawan')
            ->whereDate('tanggal', $tanggal)
            ->when($search, function ($query) use ($search) {
                $query->whereHas('karyawan', function ($karyawanQuery) use ($search) {
                    $karyawanQuery->where('nama', 'like', "%{$search}%")
                        ->orWhere('no_wa', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Data absensi berhasil diambil.',
            'data' => $absensis
                ->map(fn ($absensi) => $this->formatAbsensi($absensi))
                ->values(),
        ]);
    }

    public function karyawanOptions(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $tanggal = $request->query('tanggal', now()->format('Y-m-d'));

        $karyawans = DataKaryawan::query()
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('nama', 'like', "%{$search}%")
                        ->orWhere('no_wa', 'like', "%{$search}%");
                });
            })
            ->orderBy('nama')
            ->get();

        $absensiToday = AbsensiKaryawan::query()
            ->with('karyawan')
            ->whereDate('tanggal', $tanggal)
            ->whereIn('karyawan_id', $karyawans->pluck('id')->values())
            ->get()
            ->keyBy('karyawan_id');

        return response()->json([
            'message' => 'Data karyawan berhasil diambil.',
            'data' => $karyawans->map(function ($karyawan) use ($absensiToday) {
                $absensi = $absensiToday->get($karyawan->id);

                return [
                    'id' => $karyawan->id,
                    'nama' => $karyawan->nama,
                    'no_wa' => $karyawan->no_wa,
                    'absensi_hari_ini' => $absensi
                        ? $this->formatAbsensi($absensi)
                        : null,
                ];
            })->values(),
        ]);
    }

    public function masuk(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'karyawan_id' => ['required', 'uuid', 'exists:data_karyawans,id'],
            'tanggal' => ['nullable', 'date'],
            'jam_masuk' => ['nullable', 'date_format:H:i'],
            'keterangan' => ['nullable', 'string'],
        ]);

        $tanggal = $validated['tanggal'] ?? now()->format('Y-m-d');
        $jamMasuk = $validated['jam_masuk'] ?? now()->format('H:i');

        $setting = $this->getSettingJamKerja();

        $keteranganMasuk = $this->getKeteranganMasuk(
            $jamMasuk,
            $setting['jam_masuk']
        );

        $absensi = AbsensiKaryawan::query()
            ->where('karyawan_id', $validated['karyawan_id'])
            ->whereDate('tanggal', $tanggal)
            ->first();

        if ($absensi && $absensi->jam_masuk) {
            return response()->json([
                'message' => 'Jam masuk sudah tersimpan untuk karyawan ini pada tanggal tersebut.',
                'data' => $this->formatAbsensi($absensi->load('karyawan')),
            ], 422);
        }

        if ($absensi) {
            $absensi->update([
                'jam_masuk' => $jamMasuk,
                'keterangan_masuk' => $keteranganMasuk,
                'keterangan' => $validated['keterangan'] ?? $absensi->keterangan,
            ]);
        } else {
            $absensi = AbsensiKaryawan::create([
                'karyawan_id' => $validated['karyawan_id'],
                'tanggal' => $tanggal,
                'jam_masuk' => $jamMasuk,
                'jam_pulang' => null,
                'keterangan_masuk' => $keteranganMasuk,
                'keterangan_pulang' => null,
                'keterangan' => $validated['keterangan'] ?? null,
            ]);
        }

        $absensi = AbsensiKaryawan::query()
            ->with('karyawan')
            ->where('id', $absensi->id)
            ->firstOrFail();

        return response()->json([
            'message' => 'Jam masuk berhasil disimpan.',
            'data' => $this->formatAbsensi($absensi),
        ]);
    }

    public function pulang(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'karyawan_id' => ['required', 'uuid', 'exists:data_karyawans,id'],
            'tanggal' => ['nullable', 'date'],
            'jam_pulang' => ['nullable', 'date_format:H:i'],
            'keterangan' => ['nullable', 'string'],
        ]);

        $tanggal = $validated['tanggal'] ?? now()->format('Y-m-d');
        $jamPulang = $validated['jam_pulang'] ?? now()->format('H:i');

        $absensi = AbsensiKaryawan::query()
            ->where('karyawan_id', $validated['karyawan_id'])
            ->whereDate('tanggal', $tanggal)
            ->first();

        if (!$absensi || !$absensi->jam_masuk) {
            return response()->json([
                'message' => 'Jam pulang tidak bisa disimpan karena karyawan belum melakukan absen masuk.',
            ], 422);
        }

        if ($absensi->jam_pulang) {
            return response()->json([
                'message' => 'Jam pulang sudah tersimpan untuk karyawan ini pada tanggal tersebut.',
                'data' => $this->formatAbsensi($absensi->load('karyawan')),
            ], 422);
        }

        $setting = $this->getSettingJamKerja();

        $keteranganPulang = $this->getKeteranganPulang(
            $jamPulang,
            $setting['jam_pulang']
        );

        $absensi->update([
            'jam_pulang' => $jamPulang,
            'keterangan_pulang' => $keteranganPulang,
            'keterangan' => $validated['keterangan'] ?? $absensi->keterangan,
        ]);

        $absensi = AbsensiKaryawan::query()
            ->with('karyawan')
            ->where('id', $absensi->id)
            ->firstOrFail();

        return response()->json([
            'message' => 'Jam pulang berhasil disimpan.',
            'data' => $this->formatAbsensi($absensi),
        ]);
    }

    public function tidakHadir(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'karyawan_id' => ['required', 'uuid', 'exists:data_karyawans,id'],
            'tanggal' => ['nullable', 'date'],
            'keterangan' => ['nullable', 'string'],
        ]);

        $tanggal = $validated['tanggal'] ?? now()->format('Y-m-d');

        $absensi = AbsensiKaryawan::query()
            ->where('karyawan_id', $validated['karyawan_id'])
            ->whereDate('tanggal', $tanggal)
            ->first();

        if ($absensi && ($absensi->jam_masuk || $absensi->jam_pulang)) {
            return response()->json([
                'message' => 'Karyawan sudah memiliki data jam masuk atau jam pulang, tidak bisa ditandai tidak hadir.',
                'data' => $this->formatAbsensi($absensi->load('karyawan')),
            ], 422);
        }

        $absensi = AbsensiKaryawan::query()
            ->updateOrCreate(
                [
                    'karyawan_id' => $validated['karyawan_id'],
                    'tanggal' => $tanggal,
                ],
                [
                    'jam_masuk' => null,
                    'jam_pulang' => null,
                    'keterangan_masuk' => 'Tidak Hadir',
                    'keterangan_pulang' => 'Tidak Hadir',
                    'keterangan' => $validated['keterangan'] ?? null,
                ]
            );

        $absensi = AbsensiKaryawan::query()
            ->with('karyawan')
            ->where('id', $absensi->id)
            ->firstOrFail();

        return response()->json([
            'message' => 'Karyawan ditandai tidak hadir.',
            'data' => $this->formatAbsensi($absensi),
        ]);
    }

    public function detail(DataKaryawan $karyawan, Request $request): JsonResponse
    {
        $bulan = $request->query('bulan', now()->format('Y-m'));
        $start = Carbon::parse($bulan . '-01')->startOfMonth();
        $end = $start->copy()->endOfMonth();

        $setting = $this->getSettingJamKerja();

        $absensis = AbsensiKaryawan::query()
            ->where('karyawan_id', $karyawan->id)
            ->whereBetween('tanggal', [
                $start->format('Y-m-d'),
                $end->format('Y-m-d'),
            ])
            ->orderBy('tanggal')
            ->get()
            ->keyBy(fn ($absensi) => $absensi->tanggal->format('Y-m-d'));

        $days = [];

        for ($date = $start->copy(); $date <= $end; $date->addDay()) {
            $tanggal = $date->format('Y-m-d');
            $absensi = $absensis->get($tanggal);

            $jamMasuk = $absensi?->jam_masuk
                ? substr($absensi->jam_masuk, 0, 5)
                : null;

            $jamPulang = $absensi?->jam_pulang
                ? substr($absensi->jam_pulang, 0, 5)
                : null;

            $menitTelat = $jamMasuk
                ? $this->hitungSelisihTelatMenit($setting['jam_masuk'], $jamMasuk)
                : 0;

            $menitLembur = $jamPulang
                ? $this->hitungMenitLemburKelipatanSetengahJam($setting['jam_pulang'], $jamPulang)
                : 0;

            $days[] = [
                'tanggal' => $tanggal,
                'hari' => $date->translatedFormat('l'),
                'tanggal_label' => $date->translatedFormat('d M Y'),
                'jam_masuk' => $jamMasuk,
                'jam_pulang' => $jamPulang,
                'keterangan_masuk' => $absensi?->keterangan_masuk,
                'keterangan_pulang' => $absensi?->keterangan_pulang,
                'menit_telat' => $menitTelat,
                'menit_lembur' => $menitLembur,
                'label_telat' => $menitTelat > 0
                    ? $this->formatMenit($menitTelat)
                    : '-',
                'label_lembur' => $menitLembur > 0
                    ? $this->formatMenit($menitLembur)
                    : '-',
                'keterangan' => $absensi?->keterangan,
            ];
        }

        return response()->json([
            'message' => 'Detail absensi karyawan berhasil diambil.',
            'data' => [
                'karyawan' => [
                    'id' => $karyawan->id,
                    'nama' => $karyawan->nama,
                    'no_wa' => $karyawan->no_wa,
                ],
                'bulan' => $bulan,
                'setting_jam_kerja' => [
                    'jam_masuk' => $setting['jam_masuk'],
                    'jam_pulang' => $setting['jam_pulang'],
                    'minimal_menit_lembur' => self::MINIMAL_MENIT_LEMBUR,
                ],
                'days' => $days,
            ],
        ]);
    }

    public function destroy(AbsensiKaryawan $absensiKaryawan): JsonResponse
    {
        $absensiKaryawan->delete();

        return response()->json([
            'message' => 'Absensi berhasil dihapus.',
        ]);
    }

    private function getSettingJamKerja(): array
    {
        $setting = SettingJamKerja::query()
            ->where('status', 'Aktif')
            ->latest()
            ->first();

        return [
            'jam_masuk' => $setting?->jam_masuk
                ? substr($setting->jam_masuk, 0, 5)
                : '08:00',
            'jam_pulang' => $setting?->jam_pulang
                ? substr($setting->jam_pulang, 0, 5)
                : '17:00',
        ];
    }

    private function getKeteranganMasuk(string $jamMasuk, string $jamMasukSetting): string
    {
        return $this->hitungSelisihTelatMenit($jamMasukSetting, $jamMasuk) > 0
            ? 'Telat'
            : 'Tepat Waktu';
    }

    private function getKeteranganPulang(string $jamPulang, string $jamPulangSetting): string
    {
        return $this->hitungMenitLemburKelipatanSetengahJam($jamPulangSetting, $jamPulang) > 0
            ? 'Lembur'
            : 'Tepat Waktu';
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

    private function hitungMenitLemburKelipatanSetengahJam(
        string $jamPulangSetting,
        string $jamPulangAktual
    ): int {
        $setting = Carbon::createFromFormat('H:i', $jamPulangSetting);
        $aktual = Carbon::createFromFormat('H:i', $jamPulangAktual);

        if ($aktual->lessThan($setting->copy()->addMinutes(self::MINIMAL_MENIT_LEMBUR))) {
            return 0;
        }

        $selisihMenit = (int) floor($setting->diffInMinutes($aktual));

        return intdiv($selisihMenit, self::MINIMAL_MENIT_LEMBUR) * self::MINIMAL_MENIT_LEMBUR;
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

    private function formatAbsensi(AbsensiKaryawan $absensi): array
    {
        $setting = $this->getSettingJamKerja();

        $jamMasuk = $absensi->jam_masuk
            ? substr($absensi->jam_masuk, 0, 5)
            : null;

        $jamPulang = $absensi->jam_pulang
            ? substr($absensi->jam_pulang, 0, 5)
            : null;

        $menitTelat = $jamMasuk
            ? $this->hitungSelisihTelatMenit($setting['jam_masuk'], $jamMasuk)
            : 0;

        $menitLembur = $jamPulang
            ? $this->hitungMenitLemburKelipatanSetengahJam($setting['jam_pulang'], $jamPulang)
            : 0;

        return [
            'id' => $absensi->id,
            'karyawan_id' => $absensi->karyawan_id,
            'karyawan' => $absensi->karyawan ? [
                'id' => $absensi->karyawan->id,
                'nama' => $absensi->karyawan->nama,
                'no_wa' => $absensi->karyawan->no_wa,
            ] : null,
            'tanggal' => optional($absensi->tanggal)->format('Y-m-d'),
            'jam_masuk' => $jamMasuk,
            'jam_pulang' => $jamPulang,
            'keterangan_masuk' => $absensi->keterangan_masuk,
            'keterangan_pulang' => $absensi->keterangan_pulang,
            'menit_telat' => $menitTelat,
            'menit_lembur' => $menitLembur,
            'label_telat' => $menitTelat > 0
                ? $this->formatMenit($menitTelat)
                : '-',
            'label_lembur' => $menitLembur > 0
                ? $this->formatMenit($menitLembur)
                : '-',
            'keterangan' => $absensi->keterangan,
            'created_at' => optional($absensi->created_at)->format('Y-m-d H:i:s'),
            'updated_at' => optional($absensi->updated_at)->format('Y-m-d H:i:s'),
        ];
    }
}
