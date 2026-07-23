<?php

namespace App\Http\Controllers\MasterData;

use App\Http\Controllers\Controller;
use App\Models\DataKaryawan;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DataKaryawanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');

        $dataKaryawans = DataKaryawan::query()
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('nama', 'like', "%{$search}%")
                        ->orWhere('no_wa', 'like', "%{$search}%")
                        ->orWhere('alamat_ktp', 'like', "%{$search}%")
                        ->orWhere('alamat_domisili', 'like', "%{$search}%")
                        ->orWhere('tanggal_masuk', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Data karyawan berhasil diambil.',
            'data' => $dataKaryawans->map(function ($karyawan) {
                return $this->formatDataKaryawan($karyawan);
            })->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:150'],
            'no_wa' => ['nullable', 'numeric'],
            'alamat_ktp' => ['nullable', 'string'],
            'alamat_domisili' => ['nullable', 'string'],
            'tanggal_masuk' => ['nullable', 'date'],
        ]);

        $validated['no_wa'] = isset($validated['no_wa'])
            ? (string) $validated['no_wa']
            : null;

        $dataKaryawan = DataKaryawan::create($validated);

        return response()->json([
            'message' => 'Data karyawan berhasil ditambahkan.',
            'data' => $this->formatDataKaryawan($dataKaryawan),
        ], 201);
    }

    public function show(DataKaryawan $dataKaryawan): JsonResponse
    {
        return response()->json([
            'message' => 'Detail data karyawan berhasil diambil.',
            'data' => $this->formatDataKaryawan($dataKaryawan),
        ]);
    }

    public function update(Request $request, DataKaryawan $dataKaryawan): JsonResponse
    {
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:150'],
            'no_wa' => ['nullable', 'numeric'],
            'alamat_ktp' => ['nullable', 'string'],
            'alamat_domisili' => ['nullable', 'string'],
            'tanggal_masuk' => ['nullable', 'date'],
        ]);

        $validated['no_wa'] = isset($validated['no_wa'])
            ? (string) $validated['no_wa']
            : null;

        $dataKaryawan->update($validated);

        return response()->json([
            'message' => 'Data karyawan berhasil diperbarui.',
            'data' => $this->formatDataKaryawan($dataKaryawan->fresh()),
        ]);
    }

    public function destroy(DataKaryawan $dataKaryawan): JsonResponse
    {
        $dataKaryawan->delete();

        return response()->json([
            'message' => 'Data karyawan berhasil dihapus.',
        ]);
    }

    private function formatDataKaryawan(DataKaryawan $karyawan): array
    {
        return [
            'id' => $karyawan->id,
            'nama' => $karyawan->nama,
            'no_wa' => $karyawan->no_wa,
            'alamat_ktp' => $karyawan->alamat_ktp,
            'alamat_domisili' => $karyawan->alamat_domisili,
            'tanggal_masuk' => optional($karyawan->tanggal_masuk)->format('Y-m-d'),
            'lama_bekerja' => $this->hitungLamaBekerja($karyawan->tanggal_masuk),
            'created_at' => optional($karyawan->created_at)->format('Y-m-d H:i:s'),
            'updated_at' => optional($karyawan->updated_at)->format('Y-m-d H:i:s'),
            'deleted_at' => optional($karyawan->deleted_at)->format('Y-m-d H:i:s'),
        ];
    }

    private function hitungLamaBekerja($tanggalMasuk): string
    {
        if (!$tanggalMasuk) {
            return '-';
        }

        $masuk = Carbon::parse($tanggalMasuk)->startOfDay();
        $sekarang = Carbon::now()->startOfDay();

        if ($masuk->greaterThan($sekarang)) {
            return '-';
        }

        $interval = $masuk->diff($sekarang);

        $tahun = (int) $interval->y;
        $bulan = (int) $interval->m;
        $hari = (int) $interval->d;

        if ($tahun > 0) {
            return "{$tahun} tahun {$bulan} bulan";
        }

        if ($bulan > 0) {
            return "{$bulan} bulan {$hari} hari";
        }

        return "{$hari} hari";
    }
}
