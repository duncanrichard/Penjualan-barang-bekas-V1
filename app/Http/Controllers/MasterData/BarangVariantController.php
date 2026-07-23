<?php

namespace App\Http\Controllers\MasterData;

use App\Http\Controllers\Controller;
use App\Models\BarangVariant;
use App\Models\DataBarang;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BarangVariantController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');

        $variants = BarangVariant::query()
            ->with('dataBarang')
            ->when($search, function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('nama', 'like', "%{$search}%")
                        ->orWhere('kode', 'like', "%{$search}%")
                        ->orWhereHas('dataBarang', function ($barangQuery) use ($search) {
                            $barangQuery->where('kode', 'like', "%{$search}%")
                                ->orWhere('nama_barang', 'like', "%{$search}%");
                        });
                });
            })
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Data varian produk berhasil diambil.',
            'data' => $variants->map(fn ($variant) => $this->formatVariant($variant))->values(),
        ]);
    }

    public function barangOptions(): JsonResponse
    {
        $barangs = DataBarang::query()
            ->orderBy('nama_barang')
            ->get(['id', 'kode', 'nama_barang']);

        return response()->json([
            'message' => 'Data barang berhasil diambil.',
            'data' => $barangs->map(fn ($barang) => [
                'id' => $barang->id,
                'kode' => $barang->kode,
                'kode_barang' => $barang->kode,
                'nama_barang' => $barang->nama_barang,
            ])->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateRequest($request);

        $variant = BarangVariant::create([
            'data_barang_id' => $validated['data_barang_id'],
            'nama' => $validated['nama'],
            'kode' => $validated['kode'] ?? $this->generateKode($validated['nama']),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $variant->load('dataBarang');

        return response()->json([
            'message' => 'Varian produk berhasil ditambahkan.',
            'data' => $this->formatVariant($variant),
        ], 201);
    }

    public function show(BarangVariant $barangVariant): JsonResponse
    {
        $barangVariant->load('dataBarang');

        return response()->json([
            'message' => 'Detail varian produk berhasil diambil.',
            'data' => $this->formatVariant($barangVariant),
        ]);
    }

    public function update(Request $request, BarangVariant $barangVariant): JsonResponse
    {
        $validated = $this->validateRequest($request, $barangVariant);

        $barangVariant->update([
            'data_barang_id' => $validated['data_barang_id'],
            'nama' => $validated['nama'],
            'kode' => $validated['kode'] ?? $this->generateKode($validated['nama']),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $barangVariant->load('dataBarang');

        return response()->json([
            'message' => 'Varian produk berhasil diperbarui.',
            'data' => $this->formatVariant($barangVariant),
        ]);
    }

    public function destroy(BarangVariant $barangVariant): JsonResponse
    {
        $barangVariant->delete();

        return response()->json([
            'message' => 'Varian produk berhasil dihapus.',
        ]);
    }

    private function validateRequest(Request $request, ?BarangVariant $variant = null): array
    {
        $request->merge([
            'kode' => $request->filled('kode')
                ? $this->generateKode($request->input('kode'))
                : $this->generateKode($request->input('nama')),
            'is_active' => filter_var($request->input('is_active', true), FILTER_VALIDATE_BOOLEAN),
        ]);

        return $request->validate([
            'data_barang_id' => ['required', 'uuid', Rule::exists('data_barangs', 'id')],
            'nama' => ['required', 'string', 'max:150'],
            'kode' => [
                'nullable',
                'string',
                'max:150',
                Rule::unique('barang_variants', 'kode')
                    ->where(fn ($query) => $query->where('data_barang_id', $request->input('data_barang_id')))
                    ->ignore($variant?->id),
            ],
            'is_active' => ['required', 'boolean'],
        ], [
            'data_barang_id.required' => 'Barang wajib dipilih.',
            'data_barang_id.exists' => 'Barang tidak valid.',
            'nama.required' => 'Nama varian wajib diisi.',
            'kode.unique' => 'Kode varian untuk barang ini sudah digunakan.',
        ]);
    }

    private function formatVariant(BarangVariant $variant): array
    {
        return [
            'id' => $variant->id,
            'data_barang_id' => $variant->data_barang_id,
            'kode_barang' => $variant->dataBarang?->kode,
            'nama_barang' => $variant->dataBarang?->nama_barang,
            'nama' => $variant->nama,
            'kode' => $variant->kode,
            'is_active' => (bool) $variant->is_active,
            'status_label' => $variant->is_active ? 'Aktif' : 'Nonaktif',
            'created_at' => optional($variant->created_at)->format('Y-m-d H:i:s'),
            'updated_at' => optional($variant->updated_at)->format('Y-m-d H:i:s'),
        ];
    }

    private function generateKode(?string $value): string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return 'varian';
        }

        $value = strtolower($value);
        $value = preg_replace('/[^a-z0-9]+/i', '_', $value);
        $value = trim($value, '_');

        return $value ?: 'varian';
    }
}
