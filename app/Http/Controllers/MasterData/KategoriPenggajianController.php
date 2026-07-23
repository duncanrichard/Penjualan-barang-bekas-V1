<?php

namespace App\Http\Controllers\MasterData;

use App\Http\Controllers\Controller;
use App\Models\KategoriPenggajian;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KategoriPenggajianController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');

        $kategoriPenggajians = KategoriPenggajian::query()
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('nama_kategori', 'like', "%{$search}%")
                        ->orWhere('nominal', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Kategori penggajian berhasil diambil.',
            'data' => $kategoriPenggajians->map(function ($kategoriPenggajian) {
                return $this->formatKategoriPenggajian($kategoriPenggajian);
            })->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_kategori' => ['required', 'string', 'max:150'],
            'nominal' => ['required', 'numeric', 'min:0'],
        ]);

        $kategoriPenggajian = KategoriPenggajian::create($validated);

        return response()->json([
            'message' => 'Kategori penggajian berhasil ditambahkan.',
            'data' => $this->formatKategoriPenggajian($kategoriPenggajian),
        ], 201);
    }

    public function show(KategoriPenggajian $kategoriPenggajian): JsonResponse
    {
        return response()->json([
            'message' => 'Detail kategori penggajian berhasil diambil.',
            'data' => $this->formatKategoriPenggajian($kategoriPenggajian),
        ]);
    }

    public function update(Request $request, KategoriPenggajian $kategoriPenggajian): JsonResponse
    {
        $validated = $request->validate([
            'nama_kategori' => ['required', 'string', 'max:150'],
            'nominal' => ['required', 'numeric', 'min:0'],
        ]);

        $kategoriPenggajian->update($validated);

        return response()->json([
            'message' => 'Kategori penggajian berhasil diperbarui.',
            'data' => $this->formatKategoriPenggajian($kategoriPenggajian->fresh()),
        ]);
    }

    public function destroy(KategoriPenggajian $kategoriPenggajian): JsonResponse
    {
        $kategoriPenggajian->delete();

        return response()->json([
            'message' => 'Kategori penggajian berhasil dihapus.',
        ]);
    }

    private function formatKategoriPenggajian(KategoriPenggajian $kategoriPenggajian): array
    {
        return [
            'id' => $kategoriPenggajian->id,
            'nama_kategori' => $kategoriPenggajian->nama_kategori,
            'nominal' => (float) $kategoriPenggajian->nominal,
            'nominal_format' => $this->formatRupiah($kategoriPenggajian->nominal),
            'created_at' => optional($kategoriPenggajian->created_at)->format('Y-m-d H:i:s'),
            'updated_at' => optional($kategoriPenggajian->updated_at)->format('Y-m-d H:i:s'),
            'deleted_at' => optional($kategoriPenggajian->deleted_at)->format('Y-m-d H:i:s'),
        ];
    }

    private function formatRupiah($nominal): string
    {
        return 'Rp ' . number_format((float) $nominal, 0, ',', '.');
    }
}
