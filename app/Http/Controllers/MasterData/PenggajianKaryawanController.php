<?php

namespace App\Http\Controllers\MasterData;

use App\Http\Controllers\Controller;
use App\Models\PenggajianKaryawan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PenggajianKaryawanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');

        $penggajianKaryawans = PenggajianKaryawan::query()
            ->with(['dataKaryawan', 'kategoriPenggajian'])
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->whereHas('dataKaryawan', function ($query) use ($search) {
                        $query->where('nama', 'like', "%{$search}%");
                    })
                    ->orWhereHas('kategoriPenggajian', function ($query) use ($search) {
                        $query->where('nama_kategori', 'like', "%{$search}%");
                    })
                    ->orWhere('nominal', 'like', "%{$search}%")
                    ->orWhere('keterangan', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Data penggajian karyawan berhasil diambil.',
            'data' => $penggajianKaryawans->map(function ($penggajianKaryawan) {
                return $this->formatPenggajianKaryawan($penggajianKaryawan);
            })->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'data_karyawan_id' => ['required', 'exists:data_karyawans,id'],
            'kategori_penggajian_id' => ['required', 'exists:kategori_penggajians,id'],
            'nominal' => ['required', 'numeric', 'min:0'],
            'keterangan' => ['nullable', 'string'],
        ]);

        $penggajianKaryawan = PenggajianKaryawan::create($validated);

        $penggajianKaryawan->load(['dataKaryawan', 'kategoriPenggajian']);

        return response()->json([
            'message' => 'Data penggajian karyawan berhasil ditambahkan.',
            'data' => $this->formatPenggajianKaryawan($penggajianKaryawan),
        ], 201);
    }

    public function show(PenggajianKaryawan $penggajianKaryawan): JsonResponse
    {
        $penggajianKaryawan->load(['dataKaryawan', 'kategoriPenggajian']);

        return response()->json([
            'message' => 'Detail penggajian karyawan berhasil diambil.',
            'data' => $this->formatPenggajianKaryawan($penggajianKaryawan),
        ]);
    }

    public function update(Request $request, PenggajianKaryawan $penggajianKaryawan): JsonResponse
    {
        $validated = $request->validate([
            'data_karyawan_id' => ['required', 'exists:data_karyawans,id'],
            'kategori_penggajian_id' => ['required', 'exists:kategori_penggajians,id'],
            'nominal' => ['required', 'numeric', 'min:0'],
            'keterangan' => ['nullable', 'string'],
        ]);

        $penggajianKaryawan->update($validated);

        $penggajianKaryawan = $penggajianKaryawan->fresh(['dataKaryawan', 'kategoriPenggajian']);

        return response()->json([
            'message' => 'Data penggajian karyawan berhasil diperbarui.',
            'data' => $this->formatPenggajianKaryawan($penggajianKaryawan),
        ]);
    }

    public function destroy(PenggajianKaryawan $penggajianKaryawan): JsonResponse
    {
        $penggajianKaryawan->delete();

        return response()->json([
            'message' => 'Data penggajian karyawan berhasil dihapus.',
        ]);
    }

    private function formatPenggajianKaryawan(PenggajianKaryawan $penggajianKaryawan): array
    {
        return [
            'id' => $penggajianKaryawan->id,
            'data_karyawan_id' => $penggajianKaryawan->data_karyawan_id,
            'kategori_penggajian_id' => $penggajianKaryawan->kategori_penggajian_id,

            'nama_karyawan' => optional($penggajianKaryawan->dataKaryawan)->nama,
            'nama_kategori' => optional($penggajianKaryawan->kategoriPenggajian)->nama_kategori,

            'nominal' => (float) $penggajianKaryawan->nominal,
            'nominal_format' => $this->formatRupiah($penggajianKaryawan->nominal),
            'keterangan' => $penggajianKaryawan->keterangan,

            'created_at' => optional($penggajianKaryawan->created_at)->format('Y-m-d H:i:s'),
            'updated_at' => optional($penggajianKaryawan->updated_at)->format('Y-m-d H:i:s'),
            'deleted_at' => optional($penggajianKaryawan->deleted_at)->format('Y-m-d H:i:s'),
        ];
    }

    private function formatRupiah($nominal): string
    {
        return 'Rp ' . number_format((float) $nominal, 0, ',', '.');
    }
}
