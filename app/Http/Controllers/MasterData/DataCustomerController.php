<?php

namespace App\Http\Controllers\MasterData;

use App\Http\Controllers\Controller;
use App\Models\DataCustomer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DataCustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));

        $customers = DataCustomer::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('nama_customer', 'like', "%{$search}%")
                        ->orWhere('no_wa', 'like', "%{$search}%")
                        ->orWhere('alamat', 'like', "%{$search}%");
                });
            })
            ->orderBy('nama_customer')
            ->get()
            ->map(fn (DataCustomer $customer) => $this->formatCustomer($customer))
            ->values();

        return response()->json([
            'message' => 'Data customer berhasil diambil.',
            'data' => $customers,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateRequest($request);

        $customer = DataCustomer::create([
            'nama_customer' => trim($validated['nama_customer']),
            'no_wa' => $this->normalizeWhatsappNumber($validated['no_wa']),
            'alamat' => filled($validated['alamat'] ?? null)
                ? trim($validated['alamat'])
                : null,
        ]);

        return response()->json([
            'message' => 'Data customer berhasil ditambahkan.',
            'data' => $this->formatCustomer($customer),
        ], 201);
    }

    public function show(DataCustomer $dataCustomer): JsonResponse
    {
        return response()->json([
            'message' => 'Detail customer berhasil diambil.',
            'data' => $this->formatCustomer($dataCustomer),
        ]);
    }

    public function update(Request $request, DataCustomer $dataCustomer): JsonResponse
    {
        $validated = $this->validateRequest($request, $dataCustomer);

        $dataCustomer->update([
            'nama_customer' => trim($validated['nama_customer']),
            'no_wa' => $this->normalizeWhatsappNumber($validated['no_wa']),
            'alamat' => filled($validated['alamat'] ?? null)
                ? trim($validated['alamat'])
                : null,
        ]);

        return response()->json([
            'message' => 'Data customer berhasil diperbarui.',
            'data' => $this->formatCustomer($dataCustomer->fresh()),
        ]);
    }

    public function destroy(DataCustomer $dataCustomer): JsonResponse
    {
        $dataCustomer->delete();

        return response()->json([
            'message' => 'Data customer berhasil dihapus.',
        ]);
    }

    private function validateRequest(
        Request $request,
        ?DataCustomer $customer = null
    ): array {
        $request->merge([
            'nama_customer' => trim((string) $request->input('nama_customer', '')),
            'no_wa' => $this->normalizeWhatsappNumber(
                (string) $request->input('no_wa', '')
            ),
            'alamat' => trim((string) $request->input('alamat', '')),
        ]);

        return $request->validate([
            'nama_customer' => ['required', 'string', 'max:150'],
            'no_wa' => [
                'required',
                'string',
                'max:30',
                'regex:/^62[0-9]{8,15}$/',
                Rule::unique('data_customers', 'no_wa')
                    ->ignore($customer?->id),
            ],
            'alamat' => ['nullable', 'string', 'max:1000'],
        ], [
            'nama_customer.required' => 'Nama customer wajib diisi.',
            'nama_customer.max' => 'Nama customer maksimal 150 karakter.',
            'no_wa.required' => 'Nomor WhatsApp wajib diisi.',
            'no_wa.regex' => 'Nomor WhatsApp tidak valid. Gunakan contoh 081234567890.',
            'no_wa.unique' => 'Nomor WhatsApp sudah digunakan customer lain.',
            'no_wa.max' => 'Nomor WhatsApp maksimal 30 karakter.',
            'alamat.max' => 'Alamat maksimal 1000 karakter.',
        ]);
    }

    private function normalizeWhatsappNumber(?string $number): ?string
    {
        if (!$number) {
            return null;
        }

        $number = preg_replace('/[^0-9]/', '', $number);

        if (!$number) {
            return null;
        }

        if (str_starts_with($number, '0')) {
            return '62' . substr($number, 1);
        }

        if (str_starts_with($number, '8')) {
            return '62' . $number;
        }

        return $number;
    }

    private function formatCustomer(DataCustomer $customer): array
    {
        return [
            'id' => (string) $customer->id,
            'nama_customer' => $customer->nama_customer,
            'no_wa' => $customer->no_wa,
            'alamat' => $customer->alamat,
            'created_at' => optional($customer->created_at)->format('Y-m-d H:i:s'),
            'updated_at' => optional($customer->updated_at)->format('Y-m-d H:i:s'),
        ];
    }
}
