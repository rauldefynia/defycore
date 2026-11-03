# Módulo de Cotizaciones (Quotes) — Documentación funcional a detalle

> **Objetivo de este documento:** describir QUÉ hace el módulo de cotizaciones y CÓMO calcula cada
> valor (fórmulas exactas, orden de operaciones, redondeos, reglas de negocio), de forma
> independiente del stack actual (Laravel + FilamentPHP + DomPDF), para poder reimplementar el
> mismo comportamiento en otro backend/frontend.
>
> No se documenta "cómo está montado en Filament" salvo cuando es necesario para entender el
> comportamiento (p. ej. qué dispara un recálculo). El foco es: **campos de entrada, fórmulas,
> campos derivados, y reglas**.

Fuente: `heimfinal26` (Laravel 11 + FilamentPHP 4), revisado 2026-09-14.

---

## Índice

1. [Visión general](#1-visión-general)
2. [Modelo de datos](#2-modelo-de-datos)
3. [Campos de captura manual vs. campos calculados](#3-campos-de-captura-manual-vs-campos-calculados)
4. [Motor de cálculo por partida (línea/ítem)](#4-motor-de-cálculo-por-partida-línea)
5. [Totales de la cotización](#5-totales-de-la-cotización)
6. [Moneda extranjera y equivalente en MXN](#6-moneda-extranjera-y-equivalente-en-mxn)
7. [Plan de pagos / Anticipos](#7-plan-de-pagos--anticipos)
8. [Reglas de negocio, límites y redondeo](#8-reglas-de-negocio-límites-y-redondeo)
9. [Generación de PDF](#9-generación-de-pdf)
10. [Otras funciones del módulo](#10-otras-funciones-del-módulo)
11. [Notas para la reimplementación](#11-notas-para-la-reimplementación-en-otro-stack)

---

## 1. Visión general

Una **Cotización (Quote)** es un documento comercial compuesto por:

- Datos generales (folio, nombre, fechas, vendedor, cliente, emisor, oportunidad relacionada).
- Una lista de **partidas (QuoteItem)**: productos o servicios, cada uno con su propio costo,
  margen deseado y descuento a cliente, de los cuales se deriva un precio de venta.
- Un **resumen financiero** agregado (costo total, venta total, utilidad, margen, subtotal, IVA,
  descuento general, total).
- Un **plan de pagos opcional** (anticipo + mensualidades) calculado sobre el total final.
- Soporte de **moneda extranjera** con conversión a MXN para reportes internos.
- Generación de **dos tipos de PDF**: uno interno (para el vendedor, muestra costos/utilidades) y
  uno para el cliente (sin costos ni utilidades, con tabla de pagos y términos legales).

No existe módulo de "pagos/abonos reales" (registro de pagos recibidos) — el "plan de pagos" es
únicamente una **proyección/calendario mostrado en el PDF**, no hay tabla de pagos cobrados ni
seguimiento de abonos. No hay integración con facturación ni contabilidad.

---

## 2. Modelo de datos

### 2.1 Quote (cabecera de la cotización)

Encabezado / identificación:

| Campo | Tipo | Notas |
|---|---|---|
| `number` | string, único | Folio autogenerado `PRE-{YmdHis}` al crear, editable como solo-lectura después |
| `name` | string | Nombre descriptivo de la cotización (captura manual) |
| `date` | date | Fecha de emisión (default: hoy) |
| `due_date` | date, nullable | Fecha de vencimiento (default: hoy + 15 días); no puede ser anterior a `date` |
| `delivery_days_min` / `delivery_days_max` | int | Rango de días de entrega para el texto de términos y condiciones |
| `delivery_unit` | enum: `dias`,`semanas`,`meses`,`personalizado` | Si es `personalizado`, se usa el campo `notes` como texto libre de términos y condiciones completo, y se ignoran `delivery_days_min/max` |
| `notes` | text, nullable | Términos y condiciones libres (solo se usa si `delivery_unit = personalizado`) |
| `seller_id` | FK User | Vendedor dueño de la cotización (default: usuario autenticado) |
| `client_id` | FK Client, nullable | Cliente seleccionado |
| `client_data` | JSON | **Snapshot** de los datos del cliente al momento de cotizar (ver 2.3) |
| `opportunity_id` | FK Opportunity, nullable | Oportunidad de venta relacionada |
| `active_with_client` | boolean | Marca cuál cotización de una misma oportunidad es "la vigente" (ver 10.3) |
| `issuer_id` | FK Issuer, nullable | Emisor (empresa que cotiza) seleccionado de un catálogo reutilizable |
| `issuer_data` | JSON | **Snapshot** de los datos del emisor (ver 2.3) |

Moneda:

| Campo | Tipo | Notas |
|---|---|---|
| `currency` | string(3), default `MXN` | Una de 15 divisas soportadas (ver §6) |
| `exchange_rate` | decimal(18,6), default 1 | "1 `currency` = `exchange_rate` MXN". Forzado a `1.00` si `currency = MXN` |
| `show_mxn_equivalent` | boolean, default false | Si se muestran/calculan columnas equivalentes en MXN cuando `currency != MXN` |

Resumen financiero (en la divisa de la cotización — todos son **campos calculados**, ver §5):

| Campo | Tipo |
|---|---|
| `summary_cost` | decimal(12,2) — suma de `cost_total` de todas las partidas |
| `summary_sale_total` | decimal(12,2) — suma de `sale_total_price` = **`subtotal`** |
| `summary_profit` | decimal(12,2) — utilidad total (antes del descuento general) |
| `summary_margin_percent` | decimal(8,2) — margen % (después de aplicar el descuento general a la utilidad) |
| `subtotal` | decimal(12,2) — = `summary_sale_total` |
| `tax_amount` | decimal(12,2) — IVA = `subtotal * 0.16` (16% fijo, no configurable) |
| `total` | decimal(12,2) — `subtotal + tax_amount - global_discount_amount` |

Descuento general:

| Campo | Tipo | Notas |
|---|---|---|
| `global_discount_type` | enum: `percentage`,`fixed`, default `percentage` | |
| `global_discount_value` | decimal(15,4), default 0 | Valor capturado por el usuario (el % o el monto fijo) |
| `global_discount_amount` | decimal(15,2), default 0 | Monto de descuento **calculado**, en la divisa de la cotización |

Equivalentes en MXN (solo relevantes si `currency != 'MXN'`):

| Campo | Tipo |
|---|---|
| `subtotal_mxn`, `tax_amount_mxn`, `total_mxn_equivalent` | decimal(18,2), nullable — `= valor_en_divisa * exchange_rate` |

Plan de pagos / anticipo:

| Campo | Tipo | Notas |
|---|---|---|
| `has_payment_plan` | boolean, default false | Activa/desactiva todo el bloque |
| `first_payment_type` | enum: `percentage`,`fixed`, nullable | |
| `first_payment_value` | decimal(15,4), nullable | Valor capturado (% o monto) |
| `first_payment_date` | date, nullable | Fecha del anticipo / inicio del calendario |
| `payment_months` | unsigned int, nullable, default 1, min 1, max 120 | Número de mensualidades para repartir el saldo restante |
| `first_payment_amount` | decimal(15,2), nullable — **calculado** | Monto del anticipo, en la divisa de la cotización |
| `remaining_amount` | decimal(15,2), nullable — **calculado** | `total - first_payment_amount` |
| `monthly_payment_amount` | decimal(15,2), nullable — **calculado** | `remaining_amount / payment_months` |
| `payment_schedule` | JSON, nullable — **calculado** | Calendario detallado (ver §7) |
| `payment_terms` | text, nullable | Texto libre de términos del plan de pagos (captura manual), se imprime en el PDF sólo si hay plan de pagos activo |

### 2.2 QuoteItem (partida / línea)

Identificación:

| Campo | Tipo | Notas |
|---|---|---|
| `quote_id` | FK Quote | |
| `item_number` | int | Consecutivo 1..N, se recalcula automáticamente al agregar/quitar/reordenar partidas |
| `item_type` | enum: `producto`,`servicio`, default `producto` | Sólo afecta la alerta de anticipo mínimo (§7); no excluye nada de los totales |
| `description` | string, requerido | Captura manual |
| `detail` | text, nullable | Detalle adicional, se imprime en el PDF cliente debajo de la descripción |
| `sku` | string, nullable | Opcional; sólo se muestra si el usuario activa el toggle "Incluir SKU" |
| `quantity` | decimal(2), default 1, min 1 | Captura manual |

Costo (en la divisa de la cotización) — **captura manual marcada en negrita**:

| Campo | Fuente |
|---|---|
| **`cost_unit_without_discount`** | Manual — costo unitario que da el proveedor, sin descuento |
| **`discount_percent`** | Manual — % de descuento que otorga el proveedor (0–100) |
| `discount_amount` | Calculado |
| `cost_unit` | Calculado |
| `cost_total` | Calculado |

Precio de venta:

| Campo | Fuente |
|---|---|
| **`target_margin_percent`** | Manual — margen deseado sobre el precio de venta (0–99.99) |
| `sale_unit_price_without_client_discount` | Calculado |
| **`client_discount_percent`** | Manual — % de descuento que se le da al cliente (0–100) |
| `client_discount_amount` | Calculado |
| `sale_unit_price` | Calculado |
| `sale_total_price` | Calculado |

Utilidad (100% calculado):

| Campo |
|---|
| `unit_profit`, `unit_margin_percent`, `line_profit`, `line_margin_percent` |

Equivalentes en MXN (100% calculado, sólo si `show_mxn_equivalent`):

| Campo |
|---|
| `cost_total_mxn`, `sale_total_price_mxn`, `line_profit_mxn` |

> Nota: en el formulario existen además muchos campos `*_mxn_preview` que son **solo de
> visualización** (no se persisten en base de datos, `dehydrated(false)`) — son la vista previa en
> vivo del equivalente MXN mientras se edita. Los únicos campos MXN que sí se guardan en BD son
> `cost_total_mxn`, `sale_total_price_mxn`, `line_profit_mxn` (a nivel partida) y
> `subtotal_mxn`, `tax_amount_mxn`, `total_mxn_equivalent` (a nivel cotización).

### 2.3 Snapshots de Cliente y Emisor (`client_data`, `issuer_data`)

Ambos son objetos JSON embebidos en la cotización, **copiados** desde el catálogo (`Client` /
`Issuer`) en el momento de seleccionarlos, para que la cotización conserve los datos históricos
aunque el catálogo cambie después.

`client_data`: `name`, `rfc`, `address`, `zip`, `city`, `state`, `country` (y opcionalmente
`contact`, usado sólo en el PDF si existe).

`issuer_data`: `name`, `rfc`, `address`, `zip`, `city`, `state`, `country`, `phone`, `email`,
`website`.

Catálogos fuente:

- **Client**: `name`, `rfc` (validado con regex de RFC mexicano y único), `zip`, `address`, `city`,
  `state`, `country` (default `Mexico`).
- **Issuer**: `name`, `rfc`, `address`, `zip`, `city`, `state`, `country` (default `México`),
  `phone`, `email`, `website`. Se puede crear/editar/eliminar el emisor desde el propio formulario
  de la cotización (catálogo reutilizable entre cotizaciones).

Si no se selecciona emisor (`issuer_id` null) o faltan campos, el PDF cliente usa como *fallback*
los datos de una configuración de marca (`branding.brands.{brand}`) — nombre, RFC, dirección, etc.
de la empresa dueña del sistema — para nunca imprimir un emisor vacío.

### 2.4 Relaciones

- `Quote hasMany QuoteItem` (cascade delete al borrar la cotización).
- `Quote belongsTo Client`, `belongsTo Issuer`, `belongsTo Opportunity`, `belongsTo User` (seller).
- `Opportunity hasMany Quote` (una oportunidad puede tener varias cotizaciones/versiones; una de
  ellas puede marcarse como `active_with_client`).

---

## 3. Campos de captura manual vs. campos calculados

Regla general del formulario: **todo campo readonly es resultado de una fórmula**; todo campo
editable es una entrada. Resumen por bloque:

**Cabecera** — manuales: `name`, `seller_id`, `date`, `due_date`, `delivery_unit`,
`delivery_days_min/max`, `notes` (si personalizado), selección de `client_id` / `issuer_id`
(disparan el copiado de snapshot). `number` es de solo lectura pero generado automáticamente (no
es una fórmula, es un folio con timestamp).

**Por partida** — manuales: `item_type`, `quantity`, `has_sku`(toggle)+`sku`, `description`,
`detail`, `cost_unit_without_discount`, `discount_percent` (desc. proveedor),
`target_margin_percent` (ganancia deseada), `client_discount_percent` (desc. a cliente).
Todo lo demás en la partida es calculado (`discount_amount`, `cost_unit`, `cost_total`,
`sale_unit_price_without_client_discount`, `client_discount_amount`, `sale_unit_price`,
`sale_total_price`, `unit_profit`, `unit_margin_percent`, `line_profit`, `line_margin_percent`, y
todos los `*_mxn`/`*_mxn_preview`).

**Descuento general** — manuales: `global_discount_type`, `global_discount_value`. Calculado:
`global_discount_amount` (y su preview MXN).

**Resumen** — 100% calculado, ningún campo editable.

**Plan de pagos** — manuales: `has_payment_plan` (toggle), `first_payment_type`,
`first_payment_value`, `first_payment_date`, `payment_months`, `payment_terms` (texto libre).
Calculado: `first_payment_amount`, `remaining_amount`, `monthly_payment_amount`,
`payment_schedule` y sus previews MXN.

**Moneda** — manuales: `currency`, `exchange_rate` (oculto si `currency=MXN`, forzado a 1),
`show_mxn_equivalent` (toggle). Calculado: `total_mxn_equivalent` (mostrado aquí también como
atajo).

Cualquier cambio en un campo manual dispara el recálculo **completo** de partidas + resumen + plan
de pagos (ver §4 y más abajo el detalle de "cuándo se recalcula"), de modo que la UI siempre
refleja valores consistentes en tiempo real, sin necesidad de guardar.

---

## 4. Motor de cálculo por partida (línea)

Esta es la fórmula central del "cotizador": a partir de un **costo** y un **margen deseado sobre
el precio de venta**, deriva el precio de venta necesario para lograr ese margen, y luego aplica un
descuento adicional a cliente sobre ese precio.

### Entradas de una partida

| Símbolo | Campo | Rango permitido |
|---|---|---|
| `qty` | `quantity` | ≥ 1 |
| `CUSD` | `cost_unit_without_discount` | ≥ 0 |
| `DP` | `discount_percent` (desc. proveedor) | 0–100 |
| `TM` | `target_margin_percent` (ganancia deseada) | 0–99.99 (nunca 100, ver nota) |
| `CDP` | `client_discount_percent` (desc. a cliente) | 0–100 |
| `FX` | `exchange_rate` de la cotización | > 0 |

### Fórmulas (en orden)

```
discount_amount   = CUSD * (DP / 100)
cost_unit         = max(CUSD - discount_amount, 0)
cost_total        = cost_unit * qty

margin_decimal    = TM / 100

// Markup para lograr el margen deseado SOBRE EL PRECIO DE VENTA (no sobre el costo):
// margen = (precio_venta - costo) / precio_venta  =>  precio_venta = costo / (1 - margen)
sale_unit_price_without_client_discount =
    (cost_unit > 0 AND margin_decimal < 1)
        ? cost_unit / (1 - margin_decimal)
        : 0

client_discount_amount = sale_unit_price_without_client_discount * (CDP / 100)
sale_unit_price        = max(sale_unit_price_without_client_discount - client_discount_amount, 0)
sale_total_price       = sale_unit_price * qty

unit_profit         = sale_unit_price  - cost_unit
line_profit         = sale_total_price - cost_total
unit_margin_percent = sale_unit_price  > 0 ? (unit_profit / sale_unit_price)  * 100 : 0
line_margin_percent = sale_total_price > 0 ? (line_profit / sale_total_price) * 100 : 0
```

**Punto clave — el margen NO es "markup sobre costo"**, es "margen sobre precio de venta"
(gross margin), por eso la fórmula es `costo / (1 - margen%)` y no `costo * (1 + margen%)`. Por
ejemplo, con costo=100 y margen deseado=20%, el precio de venta es `100/0.8 = 125` (utilidad de 25
sobre 125 = 20% de margen), no 120.

Por eso `target_margin_percent` está limitado a un máximo de **99.99**, nunca 100: con margen=100%
la fórmula dividiría entre cero (precio de venta infinito). El sistema simplemente devuelve 0 en
ese caso límite (`margin_decimal < 1` es la guarda).

### Equivalente en MXN por partida

Si `currency != MXN`, cada campo anterior tiene un equivalente `*_mxn` / `*_mxn_preview`
multiplicando el valor por `exchange_rate` (interpretado como "1 unidad de `currency` = X MXN").
Los porcentajes (`discount_percent`, `target_margin_percent`, `client_discount_percent`,
`unit_margin_percent`, `line_margin_percent`) se muestran igual en ambas monedas (un % no cambia al
convertir moneda).

### Cuándo se recalcula

Cualquier cambio en `quantity`, `cost_unit_without_discount`, `discount_percent`,
`target_margin_percent` o `client_discount_percent` de **una** partida:
1. Recalcula esa partida con la fórmula anterior.
2. Reconstruye los **totales de la cotización completa** sumando (a precisión completa, sin
   redondear intermedios) el `cost_total`, `sale_total_price` y `line_profit` de **todas** las
   partidas — no suma los valores ya redondeados/mostrados, vuelve a calcular cada partida desde
   sus entradas crudas y suma los resultados en punto flotante, redondeando sólo al final para
   mostrar/guardar. Esto evita arrastre de error de redondeo por partida en el subtotal.

Agregar, eliminar o reordenar una partida, cambiar la divisa/tipo de cambio, o cambiar el
descuento general o cualquier campo del plan de pagos, dispara el mismo recálculo integral
(recorre TODAS las partidas, no sólo la que cambió).

---

## 5. Totales de la cotización

A partir de las sumas agregadas de todas las partidas:

```
summaryCost      = Σ cost_total        (todas las partidas)
summarySaleTotal = Σ sale_total_price  (todas las partidas)
summaryProfit    = Σ line_profit       (todas las partidas)

subtotal             = summarySaleTotal
tax_amount           = subtotal * 0.16                         // IVA 16% fijo, no configurable
total_before_discount = subtotal + tax_amount

// Descuento general se aplica DESPUÉS del IVA, sobre total_before_discount:
global_discount_amount =
    (global_discount_type == 'fixed')
        ? min(global_discount_value, total_before_discount)
        : total_before_discount * (min(global_discount_value, 100) / 100)
    // luego, en cualquier caso:
    global_discount_amount = min(global_discount_amount, total_before_discount)   // nunca > total_before_discount, nunca negativo

total = total_before_discount - global_discount_amount

// La utilidad total se reduce por el descuento general completo (se asume que
// el descuento "sale" de la utilidad, no del costo):
summary_profit_final   = summaryProfit - global_discount_amount
summary_margin_percent = summarySaleTotal > 0 ? (summary_profit_final / summarySaleTotal) * 100 : 0
```

Equivalentes en MXN (si aplica): `subtotal_mxn = subtotal*FX`, `tax_amount_mxn = tax_amount*FX`,
`total_mxn_equivalent = total*FX`, e igualmente para `global_discount_amount_mxn`,
`summary_cost_mxn`, `summary_sale_total_mxn`, `summary_profit_mxn` (todas: valor × `exchange_rate`).

`summary_cost` **no** participa en el cálculo de `total` — es puramente informativo/interno
(costo total de la cotización, para referencia del vendedor); el cliente nunca lo ve.

---

## 6. Moneda extranjera y equivalente en MXN

### Divisas soportadas

`MXN, USD, EUR, CAD, GBP, JPY, CHF, AUD, CNY, BRL, ARS, CLP, COP, PEN, GTQ`

### Símbolos de despliegue

```
MXN=$   USD=US$   EUR=EUR(form)/€(PDF)   CAD=CA$   GBP=GBP(form)/£(PDF)
JPY=JPY(form)/¥(PDF)   CHF=Fr.   AUD=A$   CNY=CNY(form)/¥(PDF)   BRL=R$
ARS=$   CLP=$   COP=$   PEN=S/   GTQ=Q
```
(El formulario interno usa códigos de 3 letras para algunas divisas sin símbolo típico; el PDF
cliente usa símbolos Unicode reales.)

### Formato numérico por divisa (separadores y decimales)

| Divisas | Decimales | Separador decimal | Separador de miles |
|---|---|---|---|
| `EUR`, `CHF` | 2 | `,` | `.` |
| `JPY`, `CNY` | 0 | `.` | `,` |
| `ARS`, `CLP`, `COP` | 0 | `,` | `.` |
| Resto (`MXN`, `USD`, `CAD`, `GBP`, `AUD`, `BRL`, `PEN`, `GTQ`) | 2 | `.` | `,` |

Esto aplica a TODOS los montos monetarios de la cotización (partidas y totales), en la divisa de la
cotización. Los montos en MXN siempre usan el formato "default" (2 decimales, `.` decimal, `,`
miles), independientemente de la divisa de la cotización.

### Tipo de cambio y conversión

- `exchange_rate` se interpreta siempre como **"1 `currency` = `exchange_rate` MXN"**.
- Si `currency = MXN`, `exchange_rate` se fuerza a `1.00` y se ocultan todos los campos/columnas
  MXN (no tiene sentido duplicarlos).
- Conversión a MXN: `valor_mxn = valor_en_currency * exchange_rate`.
- El PDF cliente, al generarse **en un `mode` distinto a la divisa nativa de la cotización**
  (p. ej. cotización capturada en USD pero se pide el PDF en MXN, o viceversa), recalcula un
  **factor de conversión** en el momento de imprimir (ver §9.2) — es una segunda conversión
  independiente de lo guardado en BD, no una simple lectura de columna.
- `show_mxn_equivalent` sólo controla si se **muestran** columnas/campos MXN en el formulario y en
  el PDF interno; no afecta ningún cálculo del total real de la cotización.

---

## 7. Plan de pagos / Anticipos

Se activa con el toggle `has_payment_plan`. Cuando está activo:

### 7.1 Montos base (idéntico en todo el sistema)

```
first_payment_amount =
    (first_payment_type == 'fixed')
        ? min(first_payment_value, total)
        : total * (min(first_payment_value, 100) / 100)
    first_payment_amount = clamp(first_payment_amount, 0, total)

remaining_amount   = max(total - first_payment_amount, 0)
monthly_payment_amount = payment_months > 0 ? remaining_amount / payment_months : 0
```

`total` aquí es **el total final de la cotización, ya con IVA y con el descuento general
aplicado** (no el subtotal).

### 7.2 Alerta de riesgo de anticipo insuficiente

Se muestra un aviso (no bloquea el guardado) si:

```
productsCost = Σ cost_total de partidas con item_type == 'producto'   (excluye 'servicio')

si has_payment_plan AND productsCost > 0 AND first_payment_amount < productsCost:
    mostrar alerta: "El pago inicial (...) es MENOR que el costo de los productos (...).
                     Con este anticipo podrías no cubrir el costo de compra a proveedor."
```

Es decir: el anticipo debería, idealmente, cubrir al menos lo que cuesta comprar los productos a
proveedor (para no financiar la compra con capital propio).

### 7.3 ⚠️ Tres implementaciones distintas del calendario de pagos (detalle importante)

El sistema construye el "calendario de pagos" (anticipo + N mensualidades con fechas) en **tres
lugares distintos, con lógica ligeramente distinta**. Esto es relevante para la reimplementación:
hay que decidir **cuál comportamiento es el que se quiere preservar** (recomendación al final).

**(A) Vista previa en el formulario de edición + valor que se guarda en `payment_schedule` (JSON)**

Ubicación conceptual: se ejecuta cada vez que cambia cualquier dato relevante mientras se edita la
cotización, y es lo que efectivamente se persiste en la columna `payment_schedule` al guardar.

```
ratio         = total_before_discount > 0 ? total / total_before_discount : 0
planSubtotal  = round(subtotal * ratio, 2)          // "subtotal" prorrateado a valor post-descuento
planIva       = round(total - planSubtotal, 2)       // el resto es "IVA" del plan

filas_crudas = []
si first_payment_amount > 0.005:
    filas_crudas.push({ mes:"Anticipo", fecha: first_payment_date, monto: first_payment_amount })
para i en 1..payment_months:
    fecha_i = first_payment_date + (hay_anticipo ? i : i-1) meses
    filas_crudas.push({ mes: i, fecha: fecha_i, monto: remaining_amount / payment_months })
    // NOTA: monto mensual NO se corrige por redondeo acumulado aquí.

para cada fila (k de 1..N), share = monto_fila / total:
    si k < N:  rowSub = round(planSubtotal * share, 2);  rowIva = round(planIva * share, 2)
    si k == N (última fila): rowSub = planSubtotal - Σ(rowSub anteriores)   // absorbe el remanente de redondeo
                              rowIva = planIva      - Σ(rowIva anteriores)  // absorbe el remanente de redondeo
    rowTotal = round(rowSub + rowIva, 2)
```

Es decir: **cada fila del calendario reparte proporcionalmente cuánto de su pago es "subtotal" y
cuánto es "IVA"**, y sólo esa partición (no el monto total del pago) se ajusta en la última fila
para cuadrar exactamente contra `planSubtotal`/`planIva`. El *monto total* de cada mensualidad
(`remaining_amount / payment_months`) puede arrastrar un pequeño residuo de redondeo que esta
implementación **no corrige**.

**(B) Accesor `payment_schedule` del modelo `Quote` (capa de datos, no usado actualmente por los PDFs)**

Formato distinto (sin partición subtotal/IVA), pensado para consumo genérico (p. ej. una futura
API):

```
filas = [{ label:"Anticipo / Pago inicial", fecha: first_payment_date, monto: first_payment_amount }]
para i en 1..payment_months:
    monto_i = (i == payment_months)
        ? round(remaining_amount - monthly*(payment_months-1), 2)   // última mensualidad absorbe el remanente
        : round(remaining_amount / payment_months, 2)
    filas.push({ label:"Mensualidad {i} de {N}", fecha: first_payment_date + i meses, monto: monto_i })
```

Aquí sí se corrige el **monto** de la última mensualidad para que la suma de todas cuadre
exactamente con `remaining_amount`. Importante: como este método tiene el mismo nombre que la
columna de base de datos (`payment_schedule`), en Eloquent **el accesor tiene prioridad sobre el
dato crudo guardado por (A)** cuando se lee `$quote->payment_schedule` desde código PHP fuera de
los formularios — es decir, la variante (A) que quedó en la columna JSON queda "opacada" por esta
variante (B) cada vez que alguien accede a esa propiedad vía el modelo Eloquent. Ninguno de los dos
PDFs usa este accesor hoy; es lógica presente pero no conectada visualmente a ningún reporte.

**(C) Tabla de pagos impresa en el PDF cliente (lo que el cliente realmente ve)**

Se recalcula de forma completamente independiente al generar el PDF, con seguimiento de saldo
(running balance), y sin desglosar subtotal/IVA por fila (la tabla sólo muestra "Pago" y "Saldo
restante", con una nota de que "todos los pagos incluyen IVA (16%)"):

```
balance = total   (ya en la moneda/mode de salida del PDF)
si hay_anticipo:
    balance -= first_payment_amount_convertido
    fila: Anticipo (X%), pago = first_payment_amount, saldo = balance
para i en 1..payment_months:
    pago_i = (i < payment_months) ? round(remaining/payment_months, 2) : balance   // ÚLTIMA fila = balance restante exacto
    balance = round(balance - pago_i, 2)
    fila: Mes i, pago = pago_i, saldo = balance
```

Esta variante garantiza que la suma de todos los pagos reconstruye exactamente `total` (porque la
última cuota es "lo que falte", no una fórmula), y es la que determina lo que el cliente firma y
paga.

**Resumen de diferencias:**

| | Reparte subtotal/IVA por fila | Corrige redondeo de montos | Usado en |
|---|---|---|---|
| (A) form/JSON guardado | Sí | Sólo en el split subtotal/IVA, no en el monto total | Vista previa en el editor; lo que se guarda en BD |
| (B) accesor del modelo | No | Sí (última mensualidad absorbe) | Ninguno de los PDFs actuales; sólo si se accede por código |
| (C) PDF cliente | No (nota textual "incluye IVA") | Sí (última fila = saldo restante) | El documento que el cliente recibe |

### 7.4 Fechas del calendario

- Si hay anticipo, la fecha del anticipo es `first_payment_date` y la mensualidad *i* cae en
  `first_payment_date + i meses`.
- Si NO hay anticipo (monto = 0 o deshabilitado el campo), la mensualidad *i* cae en
  `first_payment_date + (i-1) meses` (la primera mensualidad coincide con la fecha capturada).

---

## 8. Reglas de negocio, límites y redondeo

- **IVA fijo al 16%**, no es un parámetro configurable por cotización.
- El descuento general se aplica **después** del IVA (sobre el total con impuesto), nunca sobre el
  subtotal.
- Límites de captura:
  - `quantity` ≥ 1.
  - `discount_percent` (proveedor) y `client_discount_percent`: 0–100.
  - `target_margin_percent`: 0–99.99 (evita división entre cero).
  - `global_discount_value`: si es porcentaje, 0–100; si es monto fijo, sin tope de captura, pero
    el **monto resultante** siempre se limita (`min(...)`) a no exceder `total_before_discount`
    (nunca puede dar un total negativo).
  - `first_payment_value`: si es porcentaje, 0–100; si es fijo, sin tope de captura, pero el
    **monto resultante** se limita a no exceder `total`.
  - `payment_months`: entero 1–120.
- Ningún monto calculado puede quedar negativo — todas las restas relevantes están protegidas con
  `max(..., 0)`.
- **Parseo numérico tolerante**: los campos de entrada numérica aceptan tanto `1234.56` como
  `1.234,56` o `1234,56`. Regla de interpretación (para reimplementar el parser):
  - Si el texto tiene tanto `.` como `,`, el símbolo que aparece **más a la derecha** se asume como
    separador decimal, y el otro se elimina como separador de miles.
  - Si sólo tiene `,` y hay 2 o menos dígitos después de la última coma, la coma se trata como
    separador **decimal**; si hay más de 2 dígitos después, se trata como separador de **miles**
    (se elimina).
  - Si el resultado no es numérico, el valor cae a `0`.
- **Formato de salida**: todo monto se redondea/formatea a la precisión de la divisa de la
  cotización (ver tabla de §6) antes de guardarse como "valor mostrado"; los porcentajes siempre se
  formatean a 2 decimales; el tipo de cambio se guarda con 6 decimales.
- **Orden de redondeo en los totales**: los totales de la cotización (`subtotal`, `tax_amount`,
  `total`, etc.) se calculan sumando los valores **crudos sin redondear** de cada partida (no la
  suma de los valores ya formateados/mostrados por partida), y sólo se redondea/formatea el
  resultado final. Esto puede diferir en centavos de "sumar a mano" los importes impresos por
  partida si se reimplementa ingenuamente sumando los strings ya formateados.

---

## 9. Generación de PDF

Existen **dos plantillas de PDF completamente distintas**, generadas con la misma librería de
render HTML→PDF, a partir del mismo registro `Quote` con sus `items` cargados.

### 9.1 PDF interno ("Calculadora") — `pdf.quote`

Uso: sólo para el vendedor/administración, nunca se entrega al cliente. Orientación horizontal
(landscape) para caber una tabla ancha con muchas columnas.

Contenido, por partida: identificación (#, cantidad, SKU, descripción), **costo** (unitario sin
descuento, % descuento, unitario con descuento, total), **precio de venta** (unitario sin
descuento, % ganancia, % descuento cliente, unitario con descuento, total), **utilidad** (unitaria,
total), **margen %**. Es decir, expone TODA la información financiera interna (costos y
utilidades), a diferencia del PDF cliente.

Totales de la página 1: `Subtotal`, `IVA 16%`, `TOTAL` (los tres tomados directamente de las
columnas guardadas de la cotización en su divisa nativa — **no** desglosa el descuento general por
separado en esta vista, sólo muestra el total ya neto).

**Página 2 (opcional, sólo si `show_mxn_equivalent = true`)**: repite exactamente la misma tabla,
pero con todos los montos convertidos/leídos en su versión `_mxn` (o recalculados como
`valor * exchange_rate` si el campo `_mxn` guardado es nulo), con un encabezado que indica el tipo
de cambio aplicado.

No incluye: datos del cliente formales, tabla de pagos, términos y condiciones legales, firmas.
Sí incluye: logo/branding seleccionable, nombre del vendedor.

### 9.2 PDF cliente ("PDF Cotización MXN/USD") — `pdf.quote-client`

Uso: el documento formal que se entrega/firma con el cliente. Orientación vertical (portrait). Se
genera en un **`mode`** explícito (`mxn` o `usd`) independiente de la divisa nativa en que se
capturó la cotización — es decir, una cotización capturada en EUR puede imprimirse "vista en USD" o
"vista en MXN" bajo demanda.

**Lógica de conversión al momento de imprimir** (recalculada en el propio blade, no es una simple
lectura de columnas):

```
outputCurrency = mode en mayúsculas (MXN o USD)

si quoteCurrency == outputCurrency:            factor = 1
si quoteCurrency == MXN y outputCurrency == USD: factor = 1 / exchange_rate
en cualquier otro caso:                         factor = exchange_rate

subtotal = quote.subtotal * factor
tax      = quote.tax_amount * factor
total    = quote.total * factor

// Excepción: si se pide ver en MXN una cotización que NO es nativa en MXN,
// se prefieren los campos _mxn ya guardados en BD (más confiables que recalcular)
// en vez de multiplicar por el factor:
si quoteCurrency != MXN y outputCurrency == MXN:
    subtotal = quote.subtotal_mxn   (o el valor calculado arriba si es null)
    tax      = quote.tax_amount_mxn (ídem)
    total    = quote.total_mxn_equivalent (ídem)
```

**Reconstrucción del descuento general para mostrarlo** — esta parte es una lógica **defensiva /
de respaldo**, con un *fallback* en caso de que los campos de descuento no vengan poblados:

```
totalBeforeDiscount = subtotal + tax
globalDiscountAmount = 0

si global_discount_value > 0:
    si tipo == fixed:  globalDiscountAmount = global_discount_value * factor (o * exchange_rate si se usó el camino "_mxn" de arriba)
    si tipo == percentage: globalDiscountAmount = totalBeforeDiscount * (min(valor,100)/100)

// Fallback 1: si no se pudo derivar nada arriba pero sí hay un monto guardado:
si globalDiscountAmount <= 0 y quote.global_discount_amount > 0:
    globalDiscountAmount = quote.global_discount_amount * factor (o * exchange_rate)

// Fallback 2 ("descuento implícito"): si AÚN no hay descuento detectado y los campos
// de descuento están totalmente vacíos (null), se infiere el descuento comparando
// el total con y sin descuento, con una tolerancia para no disparar por ruido de redondeo:
si globalDiscountAmount <= 0 y (global_discount_value es null y global_discount_amount es null):
    tolerancia = 2.0 si outputCurrency es de 0 decimales (JPY/CNY/ARS/CLP/COP), si no 0.05
    impliedDiscount = totalBeforeDiscount - total
    si impliedDiscount > tolerancia:
        globalDiscountAmount = impliedDiscount

globalDiscountAmount = min(globalDiscountAmount, totalBeforeDiscount)
hasGlobalDiscount = round(globalDiscountAmount, 2) > 0
si hasGlobalDiscount: total = totalBeforeDiscount - globalDiscountAmount
```

Esta redundancia existe porque el PDF debe poder imprimirse correctamente incluso para
cotizaciones antiguas o con datos parcialmente incompletos; para una reimplementación limpia
**no debería ser necesaria** si el backend nuevo siempre persiste `global_discount_amount` de forma
consistente (ver recomendaciones, §11).

**Contenido del PDF cliente:**
- Encabezado con folio, moneda de salida, branding/logo.
- Bloque "Cliente" (desde `client_data`, o mensaje "Sin datos de cliente registrados" si falta) y
  bloque "Proveedor/Emisor" (desde `issuer_data`, con *fallback* a los datos de marca/branding si
  faltan).
- Barra de metadatos: folio, fecha, vigencia (`due_date`), ejecutivo (vendedor), moneda.
- Tabla de partidas: sólo **N°, cantidad, (SKU si alguna partida lo tiene), descripción + detalle,
  precio unitario sin IVA, (% descuento si alguna partida tiene descuento a cliente), importe sin
  IVA**. **No** se muestra costo, margen ni utilidad — información exclusivamente comercial.
  - El precio unitario/importe de cada partida también se reconvierte con el mismo `factor`/lógica
    `_mxn` que los totales (para que la tabla de partidas cuadre con los totales impresos).
- Bloque de totales: Subtotal, IVA 16%, (si hay descuento: "Total sin descuento" + línea de
  descuento con su etiqueta dinámica `"Descuento general (X%)"` o `"Descuento general (cantidad
  fija)"`), TOTAL final. Incluye un renglón opcional de "importe con letra" si existe
  `total_in_words` (campo/atributo no confirmado como persistido; tratarlo como opcional).
- Tabla de pagos (sólo si `has_payment_plan` y `payment_months >= 1` y `total > 0`) — ver
  variante (C) de §7.3. Incluye tarjetas resumen (Anticipo / Pago mensual) y, si existe,
  el texto libre de `payment_terms`.
- Términos y condiciones: si `delivery_unit = personalizado`, imprime el texto libre de `notes` tal
  cual; si no, imprime un bloque **fijo de 8 cláusulas boilerplate** (moneda y precios, condiciones
  de pago —anticipo 100%—, vigencia hasta `due_date`, cancelaciones, entrega usando
  `delivery_days_min`–`delivery_days_max` `delivery_unit`, garantía del fabricante, límite de
  responsabilidad, solución de controversias en Jalisco). Este texto boilerplate está **hard-coded**
  en la plantilla, no es configurable desde el formulario salvo cambiando a `personalizado`.
- Bloque de aceptación/firmas: nombre del cliente (`client_data.name`) y nombre del vendedor.
- Pie de página con nombre/contacto del emisor y "Folio X · Página N de M".

### 9.3 Rutas/acciones de generación

- Descarga directa (`quotes.pdf.download` / `.stream`): siempre genera el PDF **interno**
  (`pdf.quote`), en A4 portrait.
- Botones en el formulario de edición de la cotización:
  - **"PDF Calculadora"**: interno, landscape, con selector de marca/branding.
  - **"PDF Cotización MXN"** / **"PDF Cotización USD"**: cliente (`pdf.quote-client`), portrait, con
    `mode` fijo a `mxn`/`usd` respectivamente y selector de marca.
  - **"Vista Previa"**: abre en una pestaña nueva una URL de preview (`quotes.pdf.preview`) que
    acepta `type` (`internal`/`client_mxn`/`client_usd`) + `brand`, útil para revisar sin descargar.
- Todas las rutas de PDF verifican autorización (`Gate::authorize('view', $quote)`) antes de
  generar el documento.

---

## 10. Otras funciones del módulo

### 10.1 Importación inteligente con IA / Excel

Sección colapsable en el formulario: el usuario sube un archivo (Excel `.xlsx`/`.xls`, PDF o
imagen `.png/.jpg/.webp`, máx. 10 MB) con una cotización/lista de precios de un proveedor.

Flujo:
1. El archivo se guarda temporalmente en disco local (`storage/app/private/temp-imports`).
2. Se envía por HTTP (`multipart/form-data`, campo `file`) a un **microservicio externo
   extractor** (`config('services.extractor.url') . '/extract'`, autenticado con header
   `X-API-Key`, parámetro `driver: deepseek`, timeout configurable), que usa IA para extraer una
   lista de partidas del documento.
3. Respuesta esperada: `{ success: bool, items: [{ quantity, sku, description,
   cost_unit_without_discount, discount_percent }], error?: string }`.
4. Las partidas devueltas se mapean a filas nuevas del repeater con:
   `item_type = 'producto'` (fijo), `target_margin_percent = 0`, `client_discount_percent = 0`
   (el vendedor debe capturar manualmente el margen y el descuento después de importar — la
   importación **nunca** trae precio de venta, sólo costo).
5. Las partidas nuevas se **fusionan** con las partidas ya existentes en el formulario que tengan
   contenido real (se descartan filas "vacías por defecto": sin SKU, con la descripción por
   defecto "Producto importado" y costo 0).
6. Se dispara el recálculo integral de partidas + totales.
7. Se limpia el archivo temporal del disco (inmediatamente el procesado, y cualquier archivo de
   más de 1 hora de antigüedad en la carpeta temporal, como limpieza oportunista).

Este es el único punto de integración externa (HTTP saliente) de todo el módulo.

### 10.2 Duplicar cotización

Acción de tabla "Copiar Cotización": clona la cotización completa (`replicate()`) dentro de una
transacción de base de datos:
- Nuevo `number` = `PRE-{timestamp actual}`.
- Nuevo `name` = `{nombre original}-copia`.
- Todas las demás columnas se copian tal cual (incluye moneda, descuentos, plan de pagos, etc.).
- Se clonan también **todas** las partidas (`QuoteItem`) asociadas, apuntando al nuevo `quote_id`.
- No se recalcula nada (se copian los valores calculados tal cual estaban).

### 10.3 "Cotización activa con cliente" (relación con Oportunidades)

Cuando varias cotizaciones (versiones) pertenecen a la misma `Opportunity`, se puede marcar **una
sola** como `active_with_client = true` (p. ej. "esta es la versión que el cliente aceptó / está
revisando"). Al marcar una:

```
UPDATE quotes SET active_with_client = false
WHERE opportunity_id = <la misma oportunidad>   // (o sólo esta cotización si no tiene oportunidad)

UPDATE quotes SET active_with_client = true WHERE id = <esta cotización>
```

Es decir, es una bandera **mutuamente excluyente dentro de la misma oportunidad**. Se gestiona
desde el listado de cotizaciones de una oportunidad (`QuotesRelationManager`), no desde la
cotización misma.

### 10.4 Autoguardado (actualmente deshabilitado)

Existe un mecanismo de autoguardado (evento Livewire `doAutosave`, probablemente disparado por
JavaScript en el frontend tras cierta inactividad de edición) que llamaría a `save()` sobre el
registro y notificaría éxito/error al front. **Está desactivado por una constante en código**
(`AUTOSAVE_ENABLED = false`) — actualmente cualquier intento de autoguardar responde
inmediatamente con "error" sin intentar guardar. Si se reimplementa, decidir si se quiere
autoguardado real o guardado explícito por botón.

### 10.5 Autorización y alcance de datos

- Sólo usuarios con rol **admin** o **seller** pueden acceder al módulo de cotizaciones.
- Un **seller** (vendedor) sólo puede **ver/listar** sus propias cotizaciones (`seller_id = yo`);
  un **admin** ve todas.
- Reglas de permisos por acción (política de autorización):
  - `view`, `update`, `delete`: permitido si es admin **o** si `quote.seller_id == usuario actual`.
  - `create`: permitido a admin o seller (cualquiera puede crear).
- Estas reglas aplican también a la descarga/preview de PDF (verificación antes de generar el
  documento).

---

## 11. Notas para la reimplementación en otro stack

1. **Elegir una sola implementación del calendario de pagos.** Hoy conviven 3 variantes (§7.3) con
   pequeñas diferencias de redondeo. Recomendación: usar el enfoque de "saldo corriente" (variante
   C, la que ve el cliente en el PDF final) como única fuente de verdad — es la más robusta porque
   garantiza que la suma de todos los pagos reconstruye exactamente el total, y es además la que ya
   está validada como "lo que el cliente ve y firma".
2. **El motor de cálculo de partidas (§4) es el núcleo no negociable** — cualquier UI que se
   construya (repetidor de líneas, hoja de cálculo, etc.) debe recalcular con esas fórmulas ante
   cualquier cambio de `quantity`, costo, %descuento proveedor, %margen deseado o %descuento
   cliente, y luego re-sumar TODAS las partidas para los totales (no arrastrar sumas parciales).
3. **El IVA (16%) y el orden "descuento después de IVA" están hard-codeados.** Si el nuevo negocio
   requiere IVA variable o descuento antes de impuestos, es un cambio de reglas de negocio, no sólo
   de implementación — dejarlo explícito en el nuevo diseño.
4. **Snapshots de cliente/emisor (`client_data`/`issuer_data`) son intencionales**: no deben
   normalizarse a un simple `client_id`/`issuer_id` sin snapshot, porque el objetivo es preservar
   los datos fiscales/de contacto tal como estaban al momento de cotizar, aunque el catálogo
   cambie después.
5. **La lógica defensiva de "descuento implícito" del PDF cliente (§9.2) es un parche para datos
   legacy/incompletos.** Si el nuevo sistema garantiza que `global_discount_amount` siempre se
   persiste correctamente en cada guardado, esa lógica de *fallback* no debería ser necesaria —
   pero si se van a migrar cotizaciones existentes desde este sistema, sí conviene replicarla (o
   correr una migración de datos que la resuelva una sola vez).
6. **No existe today un módulo de pagos/cobranza real** (abonos recibidos, estatus pagado/pendiente
   por mensualidad). El "plan de pagos" es sólo una proyección informativa impresa en el PDF. Si el
   nuevo proyecto sí requiere seguimiento real de pagos, es una funcionalidad **nueva**, no una
   migración de algo existente.
7. **Formato numérico por divisa (§6) debe respetarse** si se van a soportar las mismas 15 divisas
   — en particular las divisas de "0 decimales" (JPY, CNY, ARS, CLP, COP) cambian tanto el
   redondeo como el formato de separadores.
8. **El parser numérico tolerante a formato (`1.234,56` vs `1234.56`)** es relevante si el nuevo
   frontend seguirá aceptando texto libre en campos numéricos; si se usa un `<input type="number">`
   nativo o un componente numérico estricto, probablemente ya no se necesite reimplementar ese
   parser.
