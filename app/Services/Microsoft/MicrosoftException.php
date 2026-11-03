<?php

namespace App\Services\Microsoft;

use RuntimeException;

/** Error de autenticación o de envío con Microsoft; su mensaje es apto para mostrarse al usuario. */
class MicrosoftException extends RuntimeException {}
