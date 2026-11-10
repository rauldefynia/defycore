<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\Captcha;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CaptchaController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless(Captcha::enabled(), 404);

        return response()->json(Captcha::generate($request))
            ->header('Cache-Control', 'no-store');
    }
}
