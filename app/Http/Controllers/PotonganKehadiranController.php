<?php

namespace App\Http\Controllers;

use App\Models\PotonganKehadiran;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PotonganKehadiranController extends Controller
{
    public function index(): JsonResponse
    {
        $data = PotonganKehadiran::query()
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'message' => 'Data potongan kehadiran berhasil diambil.',
            'data' => $data,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateRequest($request);

        $potonganKehadiran = PotonganKehadiran::create($validated);

        return response()->json([
            'message' => 'Kebijakan potongan kehadiran berhasil ditambahkan.',
            'data' => $potonganKehadiran,
        ], 201);
    }

    public function show(PotonganKehadiran $potonganKehadiran): JsonResponse
    {
        return response()->json([
            'message' => 'Detail potongan kehadiran berhasil diambil.',
            'data' => $potonganKehadiran,
        ]);
    }

    public function update(
        Request $request,
        PotonganKehadiran $potonganKehadiran
    ): JsonResponse {
        $validated = $this->validateRequest($request);

        $potonganKehadiran->update($validated);

        return response()->json([
            'message' => 'Kebijakan potongan kehadiran berhasil diperbarui.',
            'data' => $potonganKehadiran->fresh(),
        ]);
    }

    public function destroy(PotonganKehadiran $potonganKehadiran): JsonResponse
    {
        $potonganKehadiran->delete();

        return response()->json([
            'message' => 'Kebijakan potongan kehadiran berhasil dihapus.',
        ]);
    }

    private function validateRequest(Request $request): array
    {
        $validated = $request->validate([
            'nama_kebijakan' => ['required', 'string', 'max:255'],
            'jenis_potongan' => ['required', Rule::in(['jam_masuk', 'jam_keluar'])],
            'toleransi_menit' => ['required', 'integer', 'min:0'],
            'nominal' => ['required', 'numeric', 'min:0'],
            'keterangan' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'nama_kebijakan.required' => 'Nama kebijakan wajib diisi.',
            'jenis_potongan.required' => 'Jenis potongan wajib dipilih.',
            'jenis_potongan.in' => 'Jenis potongan tidak valid.',
            'toleransi_menit.required' => 'Toleransi menit wajib diisi.',
            'toleransi_menit.integer' => 'Toleransi menit harus berupa angka.',
            'toleransi_menit.min' => 'Toleransi menit tidak boleh kurang dari 0.',
            'nominal.required' => 'Nominal wajib diisi.',
            'nominal.numeric' => 'Nominal harus berupa angka.',
            'nominal.min' => 'Nominal tidak boleh kurang dari 0.',
        ]);

        $validated['is_active'] = $request->boolean('is_active');

        return $validated;
    }
}
