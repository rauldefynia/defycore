<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Issuer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Alta/edición rápida de clientes y emisores desde el formulario de cotización (JSON). */
class QuoteCatalogController extends Controller
{
    private const RFC = '/^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/u';

    public function storeClient(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'rfc' => ['required', 'string', 'regex:'.self::RFC, 'unique:clients,rfc'],
            'contact' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'zip' => ['nullable', 'string', 'max:10'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
        ]);
        $data['rfc'] = strtoupper($data['rfc']);
        // El cliente queda asignado a quien lo da de alta (así un vendedor puede usarlo).
        $data['seller_id'] = $request->user()->id;
        $data['seller_name'] = $request->user()->name;
        $data['country'] = $data['country'] ?? 'Mexico';

        return response()->json(Client::create($data), 201);
    }

    public function storeIssuer(Request $request): JsonResponse
    {
        return response()->json(Issuer::create($this->issuerData($request)), 201);
    }

    public function updateIssuer(Request $request, Issuer $issuer): JsonResponse
    {
        $issuer->update($this->issuerData($request));

        return response()->json($issuer);
    }

    public function destroyIssuer(Issuer $issuer): JsonResponse
    {
        $issuer->delete();

        return response()->json(['ok' => true]);
    }

    /** @return array<string, mixed> */
    private function issuerData(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'rfc' => ['nullable', 'string', 'max:13'],
            'address' => ['nullable', 'string', 'max:255'],
            'zip' => ['nullable', 'string', 'max:10'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'website' => ['nullable', 'string', 'max:255'],
        ]);
        $data['country'] = $data['country'] ?? 'México';

        return $data;
    }
}
