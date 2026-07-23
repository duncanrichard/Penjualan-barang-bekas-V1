<?php

namespace App\Http\Controllers\MasterData;

use App\Http\Controllers\Controller;
use App\Models\DataBarang;
use App\Models\KategoriBarang;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DataBarangController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');

        $dataBarangs = DataBarang::query()
            ->with('kategori')
            ->withSum(['stockMovements as stok_mentah_masuk' => function ($query) {
                $query->where('jenis_barang', 'mentah');
            }], 'qty_masuk')
            ->withSum(['stockMovements as stok_mentah_keluar' => function ($query) {
                $query->where('jenis_barang', 'mentah');
            }], 'qty_keluar')
            ->withSum(['stockMovements as stok_jadi_masuk' => function ($query) {
                $query->where('jenis_barang', 'jadi');
            }], 'qty_masuk')
            ->withSum(['stockMovements as stok_jadi_keluar' => function ($query) {
                $query->where('jenis_barang', 'jadi');
            }], 'qty_keluar')
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('kode', 'like', "%{$search}%")
                        ->orWhere('nama_barang', 'like', "%{$search}%")
                        ->orWhereHas('kategori', function ($kategoriQuery) use ($search) {
                            $kategoriQuery->where('nama', 'like', "%{$search}%")
                                ->orWhere('kode', 'like', "%{$search}%");
                        });
                });
            })
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Data barang berhasil diambil.',
            'data' => $dataBarangs
                ->map(fn ($barang) => $this->formatDataBarang($barang))
                ->values(),
        ]);
    }

    public function kategoriOptions(): JsonResponse
    {
        $kategoriBarangs = KategoriBarang::query()
            ->where('status', 'Aktif')
            ->orderBy('nama')
            ->get(['id', 'kode', 'nama']);

        return response()->json([
            'message' => 'Data kategori berhasil diambil.',
            'data' => $kategoriBarangs->map(function ($kategori) {
                return [
                    'id' => (string) $kategori->id,
                    'kode' => $kategori->kode,
                    'nama' => $kategori->nama,
                ];
            })->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateRequest($request);

        $validated['kode'] = $this->generateKodeBarang();

        $dataBarang = DataBarang::create($validated);
        $dataBarang->load('kategori');

        return response()->json([
            'message' => 'Data barang berhasil ditambahkan.',
            'data' => $this->formatDataBarang($dataBarang),
        ], 201);
    }

    public function show(DataBarang $dataBarang): JsonResponse
    {
        $dataBarang->load('kategori');

        return response()->json([
            'message' => 'Detail data barang berhasil diambil.',
            'data' => $this->formatDataBarang($dataBarang),
        ]);
    }

    public function update(Request $request, DataBarang $dataBarang): JsonResponse
    {
        $validated = $this->validateRequest($request);

        $dataBarang->update($validated);
        $dataBarang = $dataBarang->fresh('kategori');

        return response()->json([
            'message' => 'Data barang berhasil diperbarui.',
            'data' => $this->formatDataBarang($dataBarang),
        ]);
    }

    public function destroy(DataBarang $dataBarang): JsonResponse
    {
        if ($dataBarang->stockMovements()->exists()
            || $dataBarang->pembelianItems()->exists()
            || $dataBarang->boronganItems()->exists()
            || $dataBarang->boronganOutputItems()->exists()) {
            return response()->json([
                'message' => 'Barang tidak bisa dihapus karena sudah digunakan pada transaksi atau stok.',
            ], 422);
        }

        $dataBarang->delete();

        return response()->json([
            'message' => 'Data barang berhasil dihapus.',
        ]);
    }

    private function validateRequest(Request $request): array
    {
        return $request->validate([
            'kategori_id' => [
                'required',
                'uuid',
                'exists:kategori_barangs,id',
            ],
            'nama_barang' => [
                'required',
                'string',
                'max:150',
            ],
        ], [
            'kategori_id.required' => 'Kategori wajib dipilih.',
            'kategori_id.uuid' => 'ID kategori tidak valid.',
            'kategori_id.exists' => 'Kategori tidak ditemukan.',

            'nama_barang.required' => 'Nama barang wajib diisi.',
            'nama_barang.string' => 'Nama barang harus berupa teks.',
            'nama_barang.max' => 'Nama barang maksimal 150 karakter.',
        ]);
    }

    private function formatDataBarang(DataBarang $barang): array
    {
        $stokMentah = $this->toDecimal($barang->stok_mentah_masuk ?? 0)
            - $this->toDecimal($barang->stok_mentah_keluar ?? 0);

        $stokJadi = $this->toDecimal($barang->stok_jadi_masuk ?? 0)
            - $this->toDecimal($barang->stok_jadi_keluar ?? 0);

        return [
            'id' => (string) $barang->id,
            'kategori_id' => (string) $barang->kategori_id,
            'kategori' => $barang->kategori ? [
                'id' => (string) $barang->kategori->id,
                'kode' => $barang->kategori->kode,
                'nama' => $barang->kategori->nama,
            ] : null,

            'kode' => $barang->kode,
            'nama_barang' => $barang->nama_barang,

            // Field ini dihitung dari stock_movements, bukan dari master data.
            'stok_mentah' => round($stokMentah, 2),
            'stok_jadi' => round($stokJadi, 2),
            'stok_total' => round($stokMentah + $stokJadi, 2),

            'created_at' => optional($barang->created_at)->format('Y-m-d H:i:s'),
            'updated_at' => optional($barang->updated_at)->format('Y-m-d H:i:s'),
            'deleted_at' => optional($barang->deleted_at)->format('Y-m-d H:i:s'),
        ];
    }

    private function generateKodeBarang(): string
    {
        do {
            $kode = 'BRG-' . strtoupper(Str::random(6));
        } while (DataBarang::where('kode', $kode)->exists());

        return $kode;
    }

    private function toDecimal($value): float
    {
        if ($value === null || $value === '') {
            return 0.00;
        }

        if (is_float($value) || is_int($value)) {
            return round((float) $value, 2);
        }

        $value = trim((string) $value);
        $value = str_replace(['Rp', 'rp', 'IDR', 'idr', ' '], '', $value);
        $value = str_replace(',', '.', $value);

        return is_numeric($value) ? round((float) $value, 2) : 0.00;
    }
}
