<?php

namespace App\Http\Controllers\Transaksi;

use App\Http\Controllers\Controller;
use App\Models\KomponenGaji;
use App\Models\KomponenGajiKaryawan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class KomponenGajiKaryawanController extends Controller
{
    public function options(): JsonResponse
    {
        $namaColumn = $this->getNamaKomponenColumn();

        $query = KomponenGaji::query();

        if ($namaColumn !== 'id') {
            $query->orderBy($namaColumn);
        } else {
            $query->orderBy('id');
        }

        $data = $query->get()
            ->map(function ($item) use ($namaColumn) {
                return [
                    'id' => $item->id,
                    'nama_komponen' => $namaColumn === 'id'
                        ? 'Komponen #' . $item->id
                        : $item->{$namaColumn},
                ];
            })
            ->values();

        return response()->json([
            'message' => 'Data komponen gaji berhasil diambil.',
            'data' => $data,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $bulan = $request->query('bulan', now()->format('Y-m'));
        $karyawanId = $request->query('karyawan_id');

        $data = KomponenGajiKaryawan::query()
            ->with(['komponenGaji', 'karyawan'])
            ->when($bulan, function ($query) use ($bulan) {
                $query->where('bulan', $bulan);
            })
            ->when($karyawanId, function ($query) use ($karyawanId) {
                $query->where('karyawan_id', $karyawanId);
            })
            ->latest()
            ->get()
            ->map(fn ($item) => $this->formatItem($item))
            ->values();

        return response()->json([
            'message' => 'Data komponen gaji karyawan berhasil diambil.',
            'data' => $data,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'karyawan_id' => ['required', 'exists:data_karyawans,id'],
            'bulan' => ['required', 'date_format:Y-m'],

            'komponens' => ['required', 'array', 'min:1'],
            'komponens.*.komponen_gaji_id' => ['required', 'exists:komponen_gajis,id'],
            'komponens.*.nominal_per_hari' => ['required', 'numeric', 'min:0'],
            'komponens.*.jumlah_hari' => ['required', 'integer', 'min:0'],
            'komponens.*.keterangan' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($validated) {
            KomponenGajiKaryawan::query()
                ->where('karyawan_id', $validated['karyawan_id'])
                ->where('bulan', $validated['bulan'])
                ->delete();

            foreach ($validated['komponens'] as $komponen) {
                KomponenGajiKaryawan::create([
                    'karyawan_id' => $validated['karyawan_id'],
                    'bulan' => $validated['bulan'],
                    'komponen_gaji_id' => $komponen['komponen_gaji_id'],
                    'nominal_per_hari' => $komponen['nominal_per_hari'],
                    'jumlah_hari' => $komponen['jumlah_hari'],
                    'total_nominal' => (float) $komponen['nominal_per_hari'] * (int) $komponen['jumlah_hari'],
                    'keterangan' => $komponen['keterangan'] ?? null,
                ]);
            }
        });

        return response()->json([
            'message' => 'Komponen gaji karyawan berhasil disimpan.',
        ]);
    }

    public function destroy(KomponenGajiKaryawan $komponenGajiKaryawan): JsonResponse
    {
        $komponenGajiKaryawan->delete();

        return response()->json([
            'message' => 'Komponen gaji karyawan berhasil dihapus.',
        ]);
    }

    private function formatItem(KomponenGajiKaryawan $item): array
    {
        $namaColumn = $this->getNamaKomponenColumn();

        return [
            'id' => $item->id,

            'karyawan_id' => $item->karyawan_id,
            'nama_karyawan' => optional($item->karyawan)->nama,

            'komponen_gaji_id' => $item->komponen_gaji_id,
            'nama_komponen' => $this->getNamaKomponenValue($item->komponenGaji, $namaColumn),

            'bulan' => $item->bulan,

            'nominal_per_hari' => (float) $item->nominal_per_hari,
            'nominal_per_hari_format' => $this->formatRupiah($item->nominal_per_hari),

            'jumlah_hari' => (int) $item->jumlah_hari,

            'total_nominal' => (float) $item->total_nominal,
            'total_nominal_format' => $this->formatRupiah($item->total_nominal),

            'keterangan' => $item->keterangan,
        ];
    }

    private function getNamaKomponenColumn(): string
    {
        if (Schema::hasColumn('komponen_gajis', 'nama_komponen')) {
            return 'nama_komponen';
        }

        if (Schema::hasColumn('komponen_gajis', 'nama')) {
            return 'nama';
        }

        if (Schema::hasColumn('komponen_gajis', 'nama_kategori')) {
            return 'nama_kategori';
        }

        if (Schema::hasColumn('komponen_gajis', 'kategori')) {
            return 'kategori';
        }

        if (Schema::hasColumn('komponen_gajis', 'name')) {
            return 'name';
        }

        return 'id';
    }

    private function getNamaKomponenValue($komponenGaji, string $namaColumn): string
    {
        if (!$komponenGaji) {
            return '-';
        }

        if ($namaColumn === 'id') {
            return 'Komponen #' . $komponenGaji->id;
        }

        return $komponenGaji->{$namaColumn} ?? '-';
    }

    private function formatRupiah($nominal): string
    {
        return 'Rp ' . number_format((float) $nominal, 0, ',', '.');
    }
}
