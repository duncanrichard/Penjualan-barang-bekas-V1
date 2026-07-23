<?php

namespace App\Http\Controllers\MasterData;

use App\Http\Controllers\Controller;
use App\Models\KategoriBarang;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class KategoriBarangController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!Schema::hasTable('kategori_barangs')) {
            return response()->json([
                'message' => 'Tabel kategori_barangs belum ada. Jalankan php artisan migrate.',
                'data' => [],
            ], 500);
        }

        $search = $request->query('search');

        $kategoriBarangs = KategoriBarang::query()
            ->withCount('dataBarangs')
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('kode', 'like', "%{$search}%")
                        ->orWhere('nama', 'like', "%{$search}%")
                        ->orWhere('deskripsi', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Data kategori barang berhasil diambil.',
            'data' => $kategoriBarangs->map(function ($kategoriBarang) {
                return $this->formatKategoriBarang($kategoriBarang);
            })->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => [
                'required',
                'string',
                'max:150',
            ],
            'deskripsi' => [
                'nullable',
                'string',
            ],
            'status' => [
                'required',
                Rule::in(['Aktif', 'Nonaktif']),
            ],
        ]);

        $validated['kode'] = $this->generateKodeKategori();

        $kategoriBarang = KategoriBarang::create($validated);

        $kategoriBarang->loadCount('dataBarangs');

        return response()->json([
            'message' => 'Kategori barang berhasil ditambahkan.',
            'data' => $this->formatKategoriBarang($kategoriBarang),
        ], 201);
    }

    public function show(KategoriBarang $kategoriBarang): JsonResponse
    {
        $kategoriBarang->loadCount('dataBarangs');

        return response()->json([
            'message' => 'Detail kategori barang berhasil diambil.',
            'data' => $this->formatKategoriBarang($kategoriBarang),
        ]);
    }

    public function update(Request $request, KategoriBarang $kategoriBarang): JsonResponse
    {
        $validated = $request->validate([
            'nama' => [
                'required',
                'string',
                'max:150',
            ],
            'deskripsi' => [
                'nullable',
                'string',
            ],
            'status' => [
                'required',
                Rule::in(['Aktif', 'Nonaktif']),
            ],
        ]);

        // kode tidak diubah saat update
        $kategoriBarang->update($validated);

        $kategoriBarang = $kategoriBarang->fresh();
        $kategoriBarang->loadCount('dataBarangs');

        return response()->json([
            'message' => 'Kategori barang berhasil diperbarui.',
            'data' => $this->formatKategoriBarang($kategoriBarang),
        ]);
    }

    public function destroy(KategoriBarang $kategoriBarang): JsonResponse
    {
        if ($kategoriBarang->dataBarangs()->exists()) {
            return response()->json([
                'message' => 'Kategori barang tidak bisa dihapus karena masih memiliki data barang.',
            ], 422);
        }

        $kategoriBarang->delete();

        return response()->json([
            'message' => 'Kategori barang berhasil dihapus.',
        ]);
    }

    private function formatKategoriBarang(KategoriBarang $kategoriBarang): array
    {
        return [
            'id' => (string) $kategoriBarang->id,
            'kode' => $kategoriBarang->kode,
            'nama' => $kategoriBarang->nama,
            'deskripsi' => $kategoriBarang->deskripsi,
            'status' => $kategoriBarang->status,
            'jumlah_barang' => (int) ($kategoriBarang->data_barangs_count ?? 0),
            'created_at' => optional($kategoriBarang->created_at)->format('Y-m-d H:i:s'),
            'updated_at' => optional($kategoriBarang->updated_at)->format('Y-m-d H:i:s'),
        ];
    }

    private function generateKodeKategori(): string
    {
        do {
            $kode = 'KAT-' . strtoupper(Str::random(6));
        } while (KategoriBarang::where('kode', $kode)->exists());

        return $kode;
    }
}
