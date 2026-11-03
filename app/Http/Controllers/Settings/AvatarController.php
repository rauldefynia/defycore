<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class AvatarController extends Controller
{
    private const SIZE = 256;

    /** Sirve la foto desde el disco privado (no requiere `storage:link`). */
    public function show(User $user): Response
    {
        abort_unless($user->avatar_path && Storage::disk('local')->exists($user->avatar_path), 404);

        return Storage::disk('local')->response($user->avatar_path, null, [
            // La URL cambia en cada subida (?v=), por lo que puede cachearse mucho tiempo.
            'Cache-Control' => 'private, max-age=31536000, immutable',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'avatar' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ], [
            'avatar.image' => 'El archivo debe ser una imagen.',
            'avatar.mimes' => 'Usa una imagen JPG, PNG o WEBP.',
            'avatar.max' => 'La imagen no debe pesar más de 4 MB.',
        ]);

        [$binary, $ext] = $this->process($request->file('avatar'));

        $user = $request->user();
        $old = $user->avatar_path;
        $path = "avatars/{$user->id}-".Str::random(10).".{$ext}";

        Storage::disk('local')->put($path, $binary);
        $user->forceFill(['avatar_path' => $path])->save();

        if ($old) {
            Storage::disk('local')->delete($old);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Foto de perfil actualizada.']);

        return back();
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('local')->delete($user->avatar_path);
            $user->forceFill(['avatar_path' => null])->save();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Foto de perfil eliminada.']);

        return back();
    }

    /**
     * Recorta al centro en cuadrado, corrige la orientación EXIF y reduce a 256 px.
     *
     * @return array{0: string, 1: string} [binario, extensión]
     */
    private function process(UploadedFile $file): array
    {
        $image = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));

        if ($image === false) {
            throw ValidationException::withMessages(['avatar' => 'No se pudo leer la imagen.']);
        }

        if (function_exists('exif_read_data') && in_array($file->getMimeType(), ['image/jpeg', 'image/jpg'], true)) {
            $orientation = @exif_read_data($file->getRealPath())['Orientation'] ?? 1;
            $angle = [3 => 180, 6 => -90, 8 => 90][$orientation] ?? 0;

            if ($angle !== 0 && ($rotated = imagerotate($image, $angle, 0))) {
                $image = $rotated;
            }
        }

        $w = imagesx($image);
        $h = imagesy($image);
        $side = min($w, $h);

        $out = imagecreatetruecolor(self::SIZE, self::SIZE);
        imagealphablending($out, false);
        imagesavealpha($out, true);
        imagefill($out, 0, 0, imagecolorallocatealpha($out, 0, 0, 0, 127));
        imagecopyresampled(
            $out, $image, 0, 0,
            (int) (($w - $side) / 2), (int) (($h - $side) / 2),
            self::SIZE, self::SIZE, $side, $side
        );

        $useWebp = function_exists('imagewebp');
        ob_start();
        $useWebp ? imagewebp($out, null, 85) : imagepng($out);

        return [(string) ob_get_clean(), $useWebp ? 'webp' : 'png'];
    }
}
