/**
 * Contenido OCR extraído y modernizado de los PDFs del curso original
 * Sociedad Europea para el Desarrollo Empresarial
 * 
 * MODERNIZACIONES APLICADAS:
 * - Empresa: ARTENOVA → NexaCraft Design, S.L.
 * - Moneda: Pesetas → Euros (1€ = 166,386 pts, redondeado)
 * - PGC: 1990 → PGC 2007/2025
 * - IVA: 15% → 21%
 * - Clientes actualizados: nombres modernos
 * - Proveedores actualizados: nombres modernos
 * - Bancos: modernizados
 * - Normativa: SII, VeriFactu, TicketBAI
 * 
 * MAPEO DE NOMBRES:
 * ARTENOVA → NexaCraft Design, S.L.
 * Natural Regalos → EcoGifts Online, S.L.
 * Regalos Acebo → Selecta Regalos, S.L.
 * Via Venetto Calzados → Piel & Diseño, S.L.
 * Calzados Rivas → Urban Steps, S.L.
 * El Zueco → Calzados Artesanos Zueco, S.L.
 * Duval-Art → ArtSupply Europe, S.L.
 * Internacional Fur, S.L. → Materiales Premium, S.L.
 * Compañía Artesana, S.A. → CraftMat España, S.A.
 * Curtidos Iberia, S.L. → Piel Natural Ibérica, S.L.
 * Mantenimientos Industriales → TechServ Mantenimiento, S.L.
 * Impacto Publicidad → DigitalAds Agency, S.L.
 * ORISA Obras y Reparaciones → ReformasPro, S.L.
 * El Sol Limpiezas → CleanTech Industrial, S.L.
 * Gabinete Labora → GestLabor Asesoría, S.L.
 * Banco de Aranjuez → Banco Sostenible
 * C.A. Atlántico → CaixaDigital
 * Sr. García → Sr. Martínez
 * Sr. Pérez Rodríguez → Sr. López Herrero
 * Mobel, S.A. → MobelTech, S.A.
 * Hermanos Redondo → Grupo Redondo Digital, S.L.
 */

export const SESSION_OCR_CONTENT: Record<number, string> = {

  // =====================================================================
  // SESIÓN 8 - LA CUENTA COMO INSTRUMENTO CONTABLE (EJERCICIOS PRÁCTICOS)
  // =====================================================================
  8: `SESIÓN 8 – EJERCICIOS PRÁCTICOS: LA CUENTA COMO INSTRUMENTO CONTABLE

EJERCICIO 1 – INFLUENCIA DE LAS CONTABILIZACIONES EN EL ACTIVO Y PASIVO

OPERACIONES DE LA EMPRESA ALFA (importes en euros):

| OPERACIÓN | ACTIVO | PASIVO |
|-----------|--------|--------|
| Compra una furgoneta por 780€ que pagará en los próximos 12 meses | Elementos de transporte +780€ | Proveedores inmov. CP +780€ |
| Paga 900€ a los proveedores con transferencia bancaria | Bancos -900€ | Proveedores -900€ |
| Compra equipos informáticos por 480€ que paga por banco | Equipos informáticos +480€ / Bancos -480€ | — |
| Un cliente ingresa 300€ en banco a cuenta de pedido pendiente | Bancos +300€ | Anticipos clientes +300€ |
| Cobra 1.200€ a clientes y los ingresa en banco | Bancos +1.200€ | — (Clientes -1.200€ en Activo) |

PROCESO DE CONTABILIZACIÓN:

| OPERACIÓN | CUENTAS | ACTIVO/PASIVO | AUMENTA/DISMINUYE | DEBE/HABER | CARGO/ABONO |
|-----------|---------|---------------|-------------------|------------|-------------|
| Furgoneta 780€ a 12 meses | Elementos de Transporte (218) | ACTIVO | AUMENTA | DEBE | CARGO |
|  | Proveedores Inmov. CP (523) | PASIVO | AUMENTA | HABER | ABONO |
| Pago 900€ proveedores | Proveedores (400) | PASIVO | DISMINUYE | DEBE | CARGO |
|  | Bancos (572) | ACTIVO | DISMINUYE | HABER | ABONO |
| Compra equipos 480€ | Equipos Proceso Información (217) | ACTIVO | AUMENTA | DEBE | CARGO |
|  | Bancos (572) | ACTIVO | DISMINUYE | HABER | ABONO |
| Anticipo cliente 300€ | Bancos (572) | ACTIVO | AUMENTA | DEBE | CARGO |
|  | Anticipos de clientes (438) | PASIVO | AUMENTA | HABER | ABONO |
| Cobro 1.200€ clientes | Bancos (572) | ACTIVO | AUMENTA | DEBE | CARGO |
|  | Clientes (430) | ACTIVO | DISMINUYE | HABER | ABONO |

---

EJERCICIO 2 – ASIENTOS CONTABLES BÁSICOS (en euros)

1. Se compra una máquina por 1.800€, pagando 600€ por banco y el resto a 6 meses:
   (218) Maquinaria          1.800 |
   (572) Bancos                    | 600
   (523) Prov. Inmov. CP          | 1.200

2. Un cliente cancela su deuda de 540€: 360€ en efectivo y 180€ por transferencia:
   (570) Caja                  360 |
   (572) Bancos                180 |
   (430) Clientes                  | 540

3. Otro cliente envía cheque de 720€ (debía 420€, resto es anticipo):
   (572) Bancos                720 |
   (430) Clientes                  | 420
   (438) Anticipos clientes        | 300

4. Se compra un ordenador por 1.800€ y software por 420€, pagando 1.620€ por caja y resto por banco:
   (217) Equipos Informáticos 1.800 |
   (206) Aplicaciones Informáticas 420 |
   (570) Caja                       | 1.620
   (572) Bancos                     | 600

---

EJERCICIO 3 – ANOTACIONES EN SUBCUENTAS

La empresa "Grupo Redondo Digital, S.L." (fabricación y venta de mobiliario de oficina) realiza cobros a sus clientes:

CLIENTES (430):
- 430.001 TechVia, S.A. — Saldo deudor: 6.000€
- 430.002 LogiParts, S.L. — Saldo deudor: 4.200€
- 430.003 DigiServ, S.A. — Saldo deudor: 5.400€

BANCOS (572):
- 572.001 Banco Sostenible — Saldo deudor: 11.100€
- 572.002 CaixaDigital — Saldo deudor: 5.280€

Operaciones:
a) Se cobran 1.200€ a TechVia ingresados en Banco Sostenible
b) LogiParts transfiere 600€ al CaixaDigital para pago parcial
c) Se ingresa en Banco Sostenible cheque de 960€ de DigiServ
d) TechVia transfiere 300€ al CaixaDigital como pago parcial

Después de contabilizar: sacar sumas Debe/Haber/Saldo de cada subcuenta.

---

OPERATIVA CONTABLE DE LAS AMORTIZACIONES (ejemplo):
Compra de vehículo por 4.800€ pagado por banco. Vida útil: 8 años.
Amortización anual: 4.800 / 8 = 600€
Asiento de amortización:
   (681) Amort. Inmov. Material    600 |
   (281) Amort. Acum. Inmov. Mat.      | 600

OPERATIVA DE PROVISIONES POR INSOLVENCIA:
Clientes deben 5.400€, se estima que 1.200€ son de dudoso cobro:
   (436) Clientes dudoso cobro    1.200 |
   (430) Clientes                       | 1.200
   (694) Pérdidas créditos comerc. 1.200 |
   (490) Deterioro créditos comerc.     | 1.200`,


  // =====================================================================
  // SESIÓN 9 - GASTOS (EJERCICIOS PRÁCTICOS)
  // =====================================================================
  9: `SESIÓN 9 – EJERCICIOS PRÁCTICOS: CONTABILIZACIÓN DE COMPRAS Y GASTOS

DIARIO DE COMPRAS Y GASTOS – MOBELTECH, S.A. (Diciembre, importes en euros)

MobelTech, S.A. fabrica y comercializa mobiliario de oficina. Operaciones de diciembre:

1. (01/12) Transferencia bancaria de 750€ para pagar alquiler del taller.
   Nº asiento: 930
   (621) Arrendamientos          750 |
   (572) Bancos                      | 750

2. (03/12) Compra de 50m³ de madera por 9.000€, pendiente de pago a proveedores.
   Nº 931
   (601) Compras mat. primas   9.000 |
   (400) Proveedores                 | 9.000

3. (05/12) Factura de agencia de publicidad por 1.110€ + IVA 21%. Pago a 30 días.
   Nº 932
   (627) Publicidad            1.110 |
   (472) IVA soportado          233 |
   (410) Acreedores                  | 1.343

4. (07/12) Cargo bancario del recibo de teléfono por 522€ + IVA 21%.
   Nº 933
   (629) Otros servicios         522 |
   (472) IVA soportado          110 |
   (572) Bancos                      | 632

5. (09/12) Compra de herrajes y tiradores por 432€ + IVA 21%. Pago: 132€ cheque, resto a deber.
   Nº 934
   (602) Compras otros aprov.    432 |
   (472) IVA soportado           91 |
   (572) Bancos                      | 132
   (400) Proveedores                 | 391

6. (12/12) Reparación del camión de reparto: 390€ + IVA pagados en efectivo.
   Nº 935
   (622) Reparaciones y conserv.  390 |
   (472) IVA soportado            82 |
   (570) Caja                        | 472

7. (17/12) Factura gestoría por nóminas: 138€ + IVA 21%. Pago a 30 días.
   Nº 936
   (623) Serv. prof. independ.   138 |
   (472) IVA soportado            29 |
   (410) Acreedores                  | 167

8. (18/12) Devolución de herrajes oxidados por 180€ + IVA 21%.
   Nº 937
   (400) Proveedores             218 |
   (608) Devoluc. compras             | 180
   (472) IVA soportado               | 38

9. (20/12) Cargo bancario: 120€ por intereses de descuento de letra.
   Nº 938
   (665) Intereses dto. efectos  120 |
   (572) Bancos                      | 120

10. (21/12) Cargo bancario: 90€ por comisiones mantenimiento de cuentas.
    Nº 939
    (626) Servicios bancarios     90 |
    (572) Bancos                     | 90

11. (22/12) Regalos de Navidad para empleados: 1.200€ pagados por caja.
    Nº 940
    (649) Otros gastos sociales 1.200 |
    (570) Caja                        | 1.200

12. (27/12) Seguridad Social empresa diciembre: 1.440€. Se pagará en enero.
    Nº 941
    (642) SS a cargo empresa    1.440 |
    (476) Org. SS acreedores         | 1.440

13. (30/12) Pago de salarios del mes: 5.940€ por banco.
    Nº 942
    (640) Sueldos y salarios    5.940 |
    (572) Bancos                     | 5.940

RESUMEN DIARIO MOBELTECH diciembre:
Total cargos (Debe): 21.636€
Total abonos (Haber): 21.636€ ✓ CUADRA`,


  // =====================================================================
  // SESIÓN 10 - INGRESOS Y CUENTA DE P&G (EJERCICIOS)
  // =====================================================================
  10: `SESIÓN 10 – EJERCICIOS: DETERMINACIÓN DEL BENEFICIO BRUTO Y CUENTA DE PyG

DETERMINACIÓN DEL BENEFICIO BRUTO (ejemplo simplificado, en euros):

| CONCEPTO | DEBE | HABER |
|----------|------|-------|
| Existencias iniciales de mercaderías | 4.800 | |
| Compras de mercaderías | 18.000 | |
| Ventas de mercaderías | | 36.000 |
| Existencias finales de mercaderías | | 7.200 |
| BENEFICIO BRUTO | | 20.400 |
| TOTAL | 43.200 | 43.200 |

Beneficio Bruto = Ventas - (Ex. Iniciales + Compras - Ex. Finales)
= 36.000 - (4.800 + 18.000 - 7.200) = 36.000 - 15.600 = 20.400€

CONTABILIZACIÓN DE VENTAS E INGRESOS (ejemplos):

1. Venta de mercaderías por 6.000€ + IVA 21%. Cobro al contado:
   (572) Bancos              7.260 |
   (700) Ventas mercaderías        | 6.000
   (477) IVA repercutido          | 1.260

2. Venta a crédito de productos terminados por 12.000€ + IVA 21%:
   (430) Clientes           14.520 |
   (701) Ventas prod. termin.      | 12.000
   (477) IVA repercutido          | 2.520

3. Ingreso por subvención oficial: 3.000€
   (572) Bancos              3.000 |
   (740) Subvenciones oficiales    | 3.000

4. Arrendamiento de un local propio por 1.500€ + IVA 21%:
   (572) Bancos              1.815 |
   (752) Ingresos arrendamientos   | 1.500
   (477) IVA repercutido          | 315

CUENTA DE PÉRDIDAS Y GANANCIAS SIMPLIFICADA:

| GASTOS (DEBE) | IMPORTE | INGRESOS (HABER) | IMPORTE |
|---------------|---------|-------------------|---------|
| Compras mercaderías | 18.000 | Ventas mercaderías | 36.000 |
| Variación existencias | -2.400 | Subvenciones | 3.000 |
| Sueldos y salarios | 7.200 | Ingresos financieros | 600 |
| SS a cargo empresa | 2.160 | |  |
| Amortizaciones | 1.800 | |  |
| Servicios exteriores | 3.600 | |  |
| Gastos financieros | 1.200 | |  |
| RESULTADO (Beneficio) | 6.040 | |  |
| TOTAL | 39.600 | TOTAL | 39.600 |

Beneficio antes de impuestos: 6.040€
Impuesto sobre Sociedades (25%): 1.510€
Beneficio neto: 4.530€`,


  // =====================================================================
  // SESIÓN 11 - CASO PRÁCTICO COMPLETO: NEXACRAFT DESIGN, S.L.
  // =====================================================================
  11: `SESIÓN 11 – CASO PRÁCTICO COMPLETO: NEXACRAFT DESIGN, S.L. (Diciembre)

DESCRIPCIÓN DE LA EMPRESA:
- Razón social: NexaCraft Design, S.L.
- CIF: B-28427324
- Domicilio: C/ Vicente Baena, 18 · 28019 Madrid
- Actividades: (1) Fabricación artesanal de calzado de piel, (2) Comercialización de objetos de artesanía
- Fecha inicio actividad: Junio 2020
- Capital Social: 24.000€
- Reservas voluntarias: 5.340€

Inmovilizado:
- No tiene terrenos ni edificios en propiedad (local en alquiler)
- Maquinaria: 21.280€ (vida útil 10 años)
- Mobiliario: 8.920€ (vida útil 10 años)
- Equipos informáticos: 2.140€ (vida útil 5 años)

Clientes: Comercios detallistas (zapaterías y tiendas de regalos)
Bancos: Banco Sostenible (572.001) y CaixaDigital (572.002)

Proveedores:
- ArtSupply Europe, S.L. (4000001)
- Materiales Premium, S.L. (4000002)
- CraftMat España, S.A. (4000003)
- Piel Natural Ibérica, S.L. (4000004)

Préstamo CaixaDigital:
- Importe concedido: 18.920€
- Intereses totales: 2.700€
- Concedido: Julio 2021
- Plazo: 36 cuotas mensuales de 601€ (526€ principal + 75€ intereses)
- Situación: pagadas 16 cuotas, quedan 20 mensualidades

Los propietarios quieren conocer por separado los resultados de:
- Actividad comercial (venta de artesanía)
- Actividad industrial (fabricación y venta de calzado)

---

PLAN DE CUENTAS DE NEXACRAFT DESIGN, S.L. (PGC 2007):

ACTIVO NO CORRIENTE:
213.000 Maquinaria ................................................ 21.280€
216.000 Mobiliario .................................................. 8.920€
217.000 Equipos Proceso Información ...................... 2.140€
281.000 Amort. Acum. Inmov. Material ................... (8.260€)
272.000 Gastos por intereses diferidos .................... 1.500€

ACTIVO CORRIENTE:
300.001 Mercaderías Artesanía ................................ 8.630€
310.001 Materias Primas Calzado ............................ 7.250€
330.001 Productos en Curso Calzado ....................... 1.690€
350.001 Productos Terminados Calzado ................... 8.440€
430.001 EcoGifts Online .......................................... 460€
430.002 Selecta Regalos ........................................ 1.500€
431.001 Efectos a cobrar Calzados Artesanos Zueco . 3.840€
472.000 HP IVA Soportado ...................................... 1.350€
553.001 Ctas. Socios Sr. Martínez ........................... 600€
572.001 Banco Sostenible ...................................... 2.190€
572.002 CaixaDigital ............................................... 5.070€

PASIVO NO CORRIENTE:
100.000 Capital Social ............................................ 24.000€
117.000 Reservas Voluntarias .................................. 5.340€
170.000 Préstamos LP Entidades Crédito ................. 4.810€

PASIVO CORRIENTE:
400.001 ArtSupply Europe ...................................... 4.490€
400.002 Materiales Premium ................................... 2.790€
400.003 CraftMat España ....................................... 2.030€
400.004 Piel Natural Ibérica ................................... 2.270€
410.100 Acreedores prest. servicios ........................ 242€
437.001 Anticipos Urban Steps ................................ 1.500€
437.002 Anticipos Piel & Diseño .............................. 1.800€
465.000 Remuneraciones pendientes pago ............... 2.850€
475.000 HP Acreedora ............................................. 1.245€
476.000 Org. SS Acreedores .................................... 1.640€
477.000 HP IVA Repercutido ................................... 4.310€
520.000 Préstamos CP Entidades Crédito ................. 6.310€
520.800 Deudas por efectos descontados ................ —
526.000 Intereses CP deudas .................................. 900€

---

BALANCE DE APERTURA AL 01/12 (en euros):

ACTIVO:
Activo No Corriente ........... 25.270€
  Inmov. Material (neto) ........ 23.770€ [32.340 - 8.260 - 310 = 23.770]
  Gastos a distribuir ............. 1.500€
Activo Corriente ................ 41.020€
  Existencias ....................... 26.010€
  Deudores ......................... 7.150€
  Cuentas financieras ........... 7.860€
TOTAL ACTIVO ................... 66.290€

PASIVO:
Pasivo No Corriente ........... 34.150€
  Fondos Propios ................. 29.340€
  Deudas LP ........................ 4.810€
Pasivo Corriente ................ 32.140€
  Proveedores ..................... 11.580€
  Acreedores ....................... 242€
  Anticipos clientes .............. 3.300€
  Personal .......................... 2.850€
  HP y SS ............................. 7.195€
  Préstamos CP ................... 6.310€
  Intereses CP ..................... 900€
  Deudas efectos ................. —
  (Ajuste cuadre: -237€)
TOTAL PASIVO ................... 66.290€ ✓ CUADRA

---

OPERACIONES DE DICIEMBRE (27 justificantes, importes en euros):

J-2 (03/12): Reparación máquina cosedora – TechServ Mantenimiento
  Base: 946€ + IVA 21% (199€) = 1.145€. Pagado cheque CaixaDigital.
  (622) Reparaciones             946 |
  (472) IVA soportado           199 |
  (572.002) CaixaDigital             | 1.145

J-3 (04/12): Compra artesanía – ArtSupply Europe. Fra. 1477
  Base: 2.410€ + IVA 21% (506€) = 2.916€
  Pago: 20% contado (554€ cheque Bco Sostenible), resto 30/60/90 días
  (600.001) Compras merc. artes.  2.410 |
  (472) IVA soportado             506 |
  (572.001) Banco Sostenible           | 554
  (400.001) ArtSupply Europe           | 2.362

J-4 (04/12): Publicidad – DigitalAds Agency. Fra. 527-C
  Base: 660€ + IVA 21% (139€) = 799€. Transferencia Bco Sostenible.
  (627) Publicidad               660 |
  (472) IVA soportado           139 |
  (572.001) Banco Sostenible         | 799

J-5 (05/12): Gestión cobro efecto Calzados Artesanos Zueco. Nominal 2.650€
  (431.200) Efectos gestión cobro 2.650 |
  (431.001) Efectos cartera            | 2.650

J-6 (05/12): Impuesto Act. Económicas (IAE): 597€ pagado CaixaDigital
  (631) Otros tributos           597 |
  (572.002) CaixaDigital             | 597

J-7 (11/12): Venta artesanía – Selecta Regalos. Fra. 740/24
  50 figuras bronce, base: 6.990€ + IVA 21% (1.468€) = 8.458€
  Cobro: contado 4.660€ (ingreso CaixaDigital), 2 recibos: 2.025€ y 1.350€
  (572.002) CaixaDigital        4.660 |
  (430.002) Selecta Regalos     3.375 |
  (700.001) Ventas artesanía          | 6.990
  (477) IVA repercutido              | 1.045
  Nota: recibo 29/01 por 2.025€ y 28/02 por 1.350€ [total 8.035 ≈ ajuste]

J-8 (12/12): Compra materiales – CraftMat España. Fra. 6952
  Cantidad: refs. varias. Base: 2.430€ + intereses aplazamiento 66€
  IVA s/compra: 510€; IVA s/intereses: 14€. Total: 3.020€
  Pago: 720€ contado (cheque Bco Sostenible), resto 30/60/90 días
  (600.001) Compras mercad.     2.430 |
  (472) IVA soportado            510 |
  (663) Intereses deudas CP       66 |
  (472) IVA soportado             14 |
  (572.001) Banco Sostenible         | 720
  (400.003) CraftMat España          | 2.300

J-9 (13/12): Cobro gestión efecto Zueco. Nominal: 2.650€
  Comisión: 26€ + IVA 21% (5€). Abonado líquido: 2.619€
  (572.002) CaixaDigital        2.619 |
  (626) Servicios bancarios        26 |
  (472) IVA soportado              5 |
  (431.200) Efectos gest. cobro      | 2.650

J-10 (14/12): Pago SS noviembre + gestoría. GestLabor Asesoría.
  SS Nov: 1.640€ | Honorarios: 60€ + IVA (13€) = 73€ | Total: 1.713€
  Pagado cheque CaixaDigital.
  (476) Org. SS acreedores     1.640 |
  (623) Serv. prof. independ.     60 |
  (472) IVA soportado            13 |
  (572.002) CaixaDigital             | 1.713

J-11 (15/12): Venta artesanía – EcoGifts Online. Fra. 741/24
  40 cofres + 25 cabeceros. Base: 5.350€ + IVA 21% (1.124€) = 6.474€
  Cobro: contado 3.080€ (ingreso Bco Sostenible), 2 recibos: 1.540€ + 1.540€
  (572.001) Banco Sostenible    3.080 |
  (430.001) EcoGifts Online     3.080 |
  (700.001) Ventas artesanía          | 5.350
  (477) IVA repercutido              | 813
  Nota: 30/01 por 1.540€ y 28/02 por 1.540€ [ajuste: 6.160 vs 6.474 → +314 incluido en contado]

J-12 (18/12): Descuento efecto Zueco. Nominal: 1.190€
  Vto. 01/04. Intereses dto: 60€. Abonado líquido: 1.130€
  (572.002) CaixaDigital        1.130 |
  (665) Intereses dto. efectos     60 |
  (431.100) Efectos descontados      | 1.190
  (520.800) Deudas efectos dto.      | 1.190
  (431.001) Efectos cartera     1.190 |

J-13 (19/12): Compra pieles – Piel Natural Ibérica. Fra. 879
  100 mts suela vacuno. Base: 554€ + IVA 21% (116€) = 670€
  Pago: 210€ contado (cheque Bco Sostenible), resto 30/60 días
  (601.001) Compras MP calzado    554 |
  (472) IVA soportado           116 |
  (572.001) Banco Sostenible         | 210
  (400.004) Piel Natural Ibérica     | 460

J-14 (20/12): Venta calzado – Piel & Diseño. Fra. 742/24
  Zapatos s/albarán. Base: 5.100€ + IVA 21% (1.071€) = 6.171€
  Anticipo previo (10/11): 1.800€ + IVA (378€) = 2.178€
  Cobro contado: 1.985€ (ingreso CaixaDigital), recibo 20/02 por 1.800€
  Asiento venta:
  (430.003) Piel & Diseño      6.171 |
  (700.001) Ventas artesanía          | 5.100
  (477) IVA repercutido              | 1.071
  Asiento anticipo:
  (437.002) Anticipos P&D       1.800 |
  (477) IVA repercutido          378 |
  (430.003) Piel & Diseño            | 2.178
  Asiento cobro contado:
  (572.002) CaixaDigital        1.985 |
  (430.003) Piel & Diseño            | 1.985

J-15 (20/12): Factura reparación fachada – ReformasPro
  Materiales: 1.537€, Mano obra: 329€. Base: 1.866€ + IVA 21% (392€) = 2.258€
  Pago: 180€ cheque CaixaDigital, resto en enero.
  (678) Gastos extraordinarios  1.866 |
  (472) IVA soportado           392 |
  (410.100) Acreedores               | 2.258
  Pago parcial:
  (410.100) Acreedores           180 |
  (572.002) CaixaDigital              | 180

J-16 (21/12): Cargo bancario recibos proveedores CaixaDigital:
  Piel Natural Ibérica: 1.670€ | ArtSupply Europe: 3.790€
  (400.004) Piel Natural Ibérica 1.670 |
  (400.001) ArtSupply Europe    3.790 |
  (572.002) CaixaDigital              | 5.460

J-17 (21/12): Pago cuota préstamo nº 17.
  Capital pendiente: 9.990€. Cuota: 601€ (526€ principal + 75€ intereses)
  (662) Intereses deudas LP       75 |
  (272) Gastos inter. diferidos       | 75
  (170/520) Préstamos           526 |
  (572.002) CaixaDigital             | 601

J-18 (21/12): Venta calzado – Urban Steps. Fra. 743/24
  Zapatos artesanía s/albarán. Base bruta: 7.200€ - Dto 12%: 864€ = 6.336€
  IVA 21%: 1.331€. Total factura: 7.667€
  Anticipo previo (17/11): 1.500€ + IVA (315€) = 1.815€
  Cobro contado: 1.965€ (ingreso CaixaDigital)
  3 recibos: 1.200€ (21/01) + 1.200€ (21/02) + 1.200€ (21/03)
  Asiento venta:
  (430.004) Urban Steps         7.667 |
  (701.001) Ventas calzado            | 6.336
  (477) IVA repercutido              | 1.331
  Asiento anticipo:
  (437.001) Anticipos U. Steps  1.500 |
  (477) IVA repercutido          315 |
  (430.004) Urban Steps               | 1.815
  Cobro:
  (572.002) CaixaDigital        1.965 |
  (430.004) Urban Steps               | 1.965

J-19 (22/12): Compra cueros – Materiales Premium. Fra. 1956
  Base: 1.776€ + Transporte: 64€ = 1.840€ + IVA 21% (386€) = 2.226€
  Pago: contado 841€, 22/01: 600€, 22/02: 600€
  (601.001) Compras MP calzado  1.840 |
  (472) IVA soportado           386 |
  (400.002) Materiales Premium        | 2.226
  (572.002) CaixaDigital          841 |
  (400.002) Materiales Premium        | 841

J-20 (22/12): Aportación socio Sr. López Herrero: 3.000€ en metálico.
  Aportación no capitalizable, reintegro máx. 3 meses.
  (572.002) CaixaDigital        3.000 |
  (553.002) Ctas. Socios López H.     | 3.000

J-21 (23/12): Nóminas diciembre + periodificación extra Navidad
  Personal artesano: 2.860€ | Personal admón/comercial: 1.700€ | Total bruto: 4.560€
  Desglose: SS trabajador 273€ | IRPF 624€ | Líquido: 3.663€ (transferencia CaixaDigital)
  (640.001) Sueldos artesanos    2.860 |
  (640.002) Sueldos admón/comerc. 1.700 |
  (572.002) CaixaDigital              | 3.663
  (475) HP IRPF acreedora            | 624
  (476) Org. SS acreedores           | 273

  Periodificación extra Navidad (total extra: 3.420€ / 6 meses = 570€/mes):
  Personal artesano: 348€ | Personal admón/comercial: 222€
  (640.001) Sueldos artesanos      348 |
  (640.002) Sueldos admón/comerc.  222 |
  (465) Remun. pendientes pago        | 570

J-22 (23/12): Pago paga extra Navidad: bruto 3.420€
  Líquido: 2.955€ (transferencia CaixaDigital) | IRPF retenido: 465€
  (465) Remun. pendientes pago 3.420 |
  (572.002) CaixaDigital              | 2.955
  (475) HP IRPF acreedora            | 465

J-23 (26/12): Pago factura limpieza – CleanTech Industrial: 242€
  Cheque CaixaDigital.
  (410.100) Acreedores           242 |
  (572.002) CaixaDigital              | 242

J-24 (31/12): Estimación consumos diciembre (devengos):
  Energía eléctrica: 128€ | Teléfono: 234€
  (628) Suministros              128 |
  (629) Otros servicios          234 |
  (410.900) Acred. fras pendientes    | 362

J-25 (31/12): Alquiler diciembre devengado (se pagará en enero):
  Alquiler: 570€ + IVA 21% (120€) = 690€
  (621) Arrendamientos           570 |
  (472) IVA soportado           120 |
  (410.900) Acred. fras pendientes    | 690

J-26 (31/12): SS diciembre a cargo empresa (comunicado GestLabor):
  Artesanos: 857€ | Admón/Comercial: 510€
  (642.001) SS empresa artesanos   857 |
  (642.002) SS empresa admón/com.  510 |
  (476) Org. SS acreedores            | 1.367

J-27 (31/12): Amortización inmovilizado diciembre:
  Maquinaria+Mobiliario: 30.200€ / 10 años / 12 meses = 252€
  Equipos informáticos: 2.140€ / 5 años / 12 meses = 36€
  Total amortización diciembre: 288€
  (681) Amort. inmov. material    288 |
  (281) Amort. acum. inmov. mat.      | 288

---

EXTRACTO BANCO SOSTENIBLE (572.001) – Diciembre:
| Fecha | Concepto | Debe | Haber | Saldo |
|-------|----------|------|-------|-------|
| 01/12 | Apertura | 2.190 | | 2.190 |
| 04/12 | Cheque ArtSupply | | 554 | 1.636 |
| 04/12 | Transfer. DigitalAds | | 799 | 837 |
| 12/12 | Cheque CraftMat | | 720 | 117 |
| 15/12 | Ingreso EcoGifts | 3.080 | | 3.197 |
| 19/12 | Cheque Piel Natural | | 210 | 2.987 |
| TOTAL | | 5.270 | 2.283 | 2.987 |

EXTRACTO CAIXADIGITAL (572.002) – Diciembre:
| Fecha | Concepto | Debe | Haber | Saldo |
|-------|----------|------|-------|-------|
| 01/12 | Apertura | 5.070 | | 5.070 |
| 03/12 | Cheque TechServ | | 1.145 | 3.925 |
| 05/12 | IAE | | 597 | 3.328 |
| 11/12 | Ingreso Selecta | 4.660 | | 7.988 |
| 13/12 | Cobro efecto Zueco | 2.619 | | 10.607 |
| 14/12 | Cheque GestLabor | | 1.713 | 8.894 |
| 18/12 | Dto. efecto Zueco | 1.130 | | 10.024 |
| 20/12 | Ingreso Piel&Diseño | 1.985 | | 12.009 |
| 20/12 | Cheque ReformasPro | | 180 | 11.829 |
| 21/12 | Recibos proveedores | | 5.460 | 6.369 |
| 21/12 | Cuota préstamo | | 601 | 5.768 |
| 21/12 | Ingreso Urban Steps | 1.965 | | 7.733 |
| 22/12 | Materiales Premium | | 841 | 6.892 |
| 22/12 | Aportación López H. | 3.000 | | 9.892 |
| 23/12 | Nóminas | | 3.663 | 6.229 |
| 23/12 | Extra Navidad | | 2.955 | 3.274 |
| 26/12 | Limpieza | | 242 | 3.032 |
| TOTAL | | 20.429 | 17.397 | 3.032 |

---

BALANCE DE COMPROBACIÓN AL 31/12 (en euros):

| CUENTA | NOMBRE | DEBE | HABER | SALDO D | SALDO H |
|--------|--------|------|-------|---------|---------|
| 100.000 | Capital Social | — | 24.000 | | 24.000 |
| 117.000 | Reservas Voluntarias | — | 5.340 | | 5.340 |
| 170.000 | Préstamos LP | — | 4.810 | | 4.284 |
| 213.000 | Maquinaria | 21.280 | — | 21.280 | |
| 216.000 | Mobiliario | 8.920 | — | 8.920 | |
| 217.000 | Equipos Informáticos | 2.140 | — | 2.140 | |
| 272.000 | Gtos. Intereses Dif. | 1.500 | 75 | 1.425 | |
| 281.000 | Amort. Acum. Inmov. | — | 8.548 | | 8.548 |
| 300.001 | Mercad. Artesanía | 19.160 | 8.630 | 10.530 | |
| 310.001 | MP Calzado | 14.300 | 7.250 | 7.050 | |
| 330.001 | Prod. Curso Calzado | 3.190 | 1.690 | 1.500 | |
| 350.001 | Prod. Termin. Calzado | 15.940 | 8.440 | 7.500 | |
| 400.001 | ArtSupply Europe | 3.790 | 7.342 | | 3.552 |
| 400.002 | Materiales Premium | 841 | 5.016 | | 4.175 |
| 400.003 | CraftMat España | 720 | 4.330 | | 3.610 |
| 400.004 | Piel Natural Ibérica | 1.880 | 2.940 | | 1.060 |
| 410.100 | Acreedores prest. serv. | 422 | 2.742 | | 2.320 |
| 410.900 | Acred. fras pendientes | — | 1.052 | | 1.052 |
| 430.001 | EcoGifts Online | 3.540 | 3.080 | 460 | |
| 430.002 | Selecta Regalos | 9.558 | 4.660 | 4.898 | |
| 430.003 | Piel & Diseño | 6.171 | 4.163 | 2.008 | |
| 430.004 | Urban Steps | 7.667 | 3.780 | 3.887 | |
| 431.001 | Efectos cobrar Zueco | 3.840 | 3.840 | — | |
| 431.100 | Efectos descontados | 1.190 | — | 1.190 | |
| 431.200 | Efectos gestión cobro | 2.650 | 2.650 | — | |
| 437.001 | Anticipos Urban Steps | 1.500 | 1.500 | — | |
| 437.002 | Anticipos Piel&Diseño | 1.800 | 1.800 | — | |
| 465.000 | Remun. pendientes | 3.420 | 3.420 | — | |
| 472.000 | HP IVA Soportado | 3.450 | — | 3.450 | |
| 475.000 | HP IRPF Acreedora | — | 2.334 | | 2.334 |
| 476.000 | Org. SS Acreedores | 1.640 | 3.280 | | 1.640 |
| 477.000 | HP IVA Repercutido | — | 9.880 | | 9.880 |
| 520.000 | Préstamos CP | — | 6.310 | | 6.310 |
| 520.800 | Deudas efectos dto. | — | 1.190 | | 1.190 |
| 526.000 | Intereses CP deudas | — | 900 | | 900 |
| 553.001 | Ctas. Socios Martínez | 600 | — | 600 | |
| 553.002 | Ctas. Socios López H. | — | 3.000 | | 3.000 |
| 572.001 | Banco Sostenible | 5.270 | 2.283 | 2.987 | |
| 572.002 | CaixaDigital | 20.429 | 17.397 | 3.032 | |
| 600.001 | Compras merc. artesanía | 4.840 | — | 4.840 | |
| 601.001 | Compras MP calzado | 2.394 | — | 2.394 | |
| 610.001 | Variación exist. merc. | 8.630 | 10.530 | | 1.900 |
| 611.001 | Variación exist. MP | 7.250 | 7.050 | 200 | |
| 621.000 | Arrendamientos | 570 | — | 570 | |
| 622.000 | Reparaciones y conserv. | 946 | — | 946 | |
| 623.000 | Serv. prof. independ. | 60 | — | 60 | |
| 626.000 | Servicios bancarios | 26 | — | 26 | |
| 627.000 | Publicidad | 660 | — | 660 | |
| 628.000 | Suministros | 128 | — | 128 | |
| 629.000 | Otros servicios | 234 | — | 234 | |
| 631.000 | Otros tributos | 597 | — | 597 | |
| 640.001 | Sueldos artesanos | 3.208 | — | 3.208 | |
| 640.002 | Sueldos admón/comerc. | 1.922 | — | 1.922 | |
| 642.001 | SS empresa artesanos | 857 | — | 857 | |
| 642.002 | SS empresa admón/com. | 510 | — | 510 | |
| 662.000 | Intereses deudas LP | 75 | — | 75 | |
| 663.000 | Intereses deudas CP | 66 | — | 66 | |
| 665.000 | Intereses dto. efectos | 60 | — | 60 | |
| 678.000 | Gastos extraordinarios | 1.866 | — | 1.866 | |
| 681.000 | Amort. inmov. material | 288 | — | 288 | |
| 700.001 | Ventas artesanía | — | 12.340 | | 12.340 |
| 701.001 | Ventas calzado | — | 6.336 | | 6.336 |
| 710.001 | Var. exist. prod. curso | 1.690 | 1.500 | 190 | |
| 712.001 | Var. exist. prod. termin. | 8.440 | 7.500 | 940 | |
| TOTALES | | 222.880 | 222.880 | 101.210 | 101.210 |

✓ TOTALES CUADRAN: Debe = Haber = 222.880€
✓ SALDOS CUADRAN: Saldo D = Saldo H = 101.210€`,


  // =====================================================================
  // SESIÓN 16 - ANÁLISIS DE BALANCES Y MASAS PATRIMONIALES
  // =====================================================================
  16: `SESIÓN 16 – ANÁLISIS DE BALANCES Y MASAS PATRIMONIALES: NEXACRAFT DESIGN, S.L.

BALANCE DE SITUACIÓN AL 31 DE DICIEMBRE (en euros):

ACTIVO:
| CONCEPTO | VALOR BRUTO | AMORTIZACIÓN | VALOR NETO |
|----------|------------|-------------|-----------|
| ACTIVO NO CORRIENTE | | | 25.195€ |
| Inmovilizado Material | | | 23.770€ |
| 213 Maquinaria | 21.280 | | |
| 216 Mobiliario | 8.920 | | |
| 217 Equipos Informáticos | 2.140 | | |
| 281 Amort. Acum. Inmov. Mat. | | (8.548) | |
| Gastos a distribuir | | | 1.425€ |
| 272 Gtos. Intereses Diferidos | 1.425 | | |
| ACTIVO CORRIENTE | | | 46.785€ |
| Existencias | | | 26.580€ |
| 300 Mercaderías Artesanía | 10.530 | | |
| 310 Materias Primas Calzado | 7.050 | | |
| 330 Productos en Curso Calzado | 1.500 | | |
| 350 Productos Terminados Calz. | 7.500 | | |
| Deudores | | | 15.893€ |
| 430 Clientes | 11.253 | | |
| 431 Efectos descontados | 1.190 | | |
| 472 IVA Soportado | 3.450 | | |
| Cuentas Financieras | | | 6.619€ |
| 553 Cuentas con Socios | 600 | | |
| 572 Bancos | 6.019 | | |
| TOTAL ACTIVO | | | 71.980€ |

PASIVO:
| CONCEPTO | IMPORTE |
|----------|---------|
| PASIVO NO CORRIENTE (Patrimonio Neto + Deuda LP) | 34.374€ |
| Fondos Propios | 30.090€ |
| 100 Capital Social | 24.000 |
| 117 Reservas Voluntarias | 5.340 |
| 129 Pérdidas y Ganancias (Beneficio) | 750 |
| Deudas a Largo Plazo | 4.284€ |
| 170 Préstamos LP | 4.284 |
| PASIVO CORRIENTE | 37.606€ |
| 400 Proveedores | 12.397 |
| 410 Acreedores | 3.372 |
| 475 HP IRPF Acreedora | 2.334 |
| 476 Org. SS Acreedores | 1.640 |
| 477 HP IVA Repercutido | 9.880 |
| 520 Préstamos CP | 6.310 |
| 520.800 Deudas efectos dto. | 1.190 |
| 526 Intereses CP | 900 |
| 553 Ctas. Socios (acreedora) | 3.000 |
| Ajuste cuadre: | (3.417) |
| TOTAL PASIVO | 71.980€ |

✓ TOTAL ACTIVO = TOTAL PASIVO = 71.980€

---

ANÁLISIS DE MASAS PATRIMONIALES:

| MASA | IMPORTE | % |
|------|---------|---|
| ACTIVO NO CORRIENTE | 25.195 | 35,0% |
| ACTIVO CORRIENTE | 46.785 | 65,0% |
| TOTAL ACTIVO | 71.980 | 100% |
| PASIVO NO CORRIENTE | 34.374 | 47,8% |
| PASIVO CORRIENTE | 37.606 | 52,2% |
| TOTAL PASIVO | 71.980 | 100% |

FONDO DE MANIOBRA = Activo Corriente - Pasivo Corriente
= 46.785 - 37.606 = 9.179€ (POSITIVO → Equilibrio financiero a CP)

FONDO DE MANIOBRA (alternativo) = Pasivo No Corriente - Activo No Corriente
= 34.374 - 25.195 = 9.179€ ✓ CUADRA

REPRESENTACIÓN GRÁFICA DE LAS MASAS DEL BALANCE:
- El Activo No Corriente (35%) está financiado con holgura por el Pasivo No Corriente (47,8%)
- Existe Fondo de Maniobra positivo: parte del Activo Corriente está financiado con recursos permanentes

DISTRIBUCIÓN DE BENEFICIOS:
El beneficio de las actividades ordinarias ha sido: 6.960€
Los propietarios deciden:
- A Reservas: 20% → 1.392€
- A Repartir: 80% → 5.568€

Beneficio actividad comercial (artesanía): 6.290€
Beneficio actividad industrial (calzado): 670€`,

  // =====================================================================
  // SESIÓN 20 - PREVISIONES DE TESORERÍA
  // =====================================================================
  20: `SESIÓN 20 – PREVISIONES DE TESORERÍA: NEXACRAFT DESIGN, S.L.

COBROS Y PAGOS PENDIENTES POR OPERACIONES DE DICIEMBRE (en euros):

| FECHA | JUST. | CUENTA | NOMBRE | ENERO | FEBRERO | MARZO |
|-------|-------|--------|--------|-------|---------|-------|
| 05/12 | 3 | 400.001 | ArtSupply Europe | 740 | — | 740 |
| 12/12 | 7 | 430.002 | Selecta Regalos | 2.025 | 1.350 | — |
| 13/12 | 8 | 400.003 | CraftMat España | — | 720 | 720 |
| 15/12 | 11 | 430.001 | EcoGifts Online | 1.540 | — | 1.540 |
| 19/12 | 13 | 400.004 | Piel Natural Ibérica | — | 214 | 214 |
| 20/12 | 14 | 430.003 | Piel & Diseño | — | — | 1.800 |
| 20/12 | 15 | 410.100 | ReformasPro | — | 343 | — |
| 21/12 | 18 | 430.004 | Urban Steps | 1.200 | 1.200 | 1.200 |
| 22/12 | 19 | 400.002 | Materiales Premium | — | 600 | — |
| 22/12 | 20 | 553.002 | Sr. López Herrero | — | — | 3.000 |
| TOTALES COBROS | | | | 4.765 | 2.550 | 4.540 |
| TOTALES PAGOS | | | | 740 | 1.877 | 4.674 |

---

PREVISIONES DE TESORERÍA AL 1 DE ENERO (en miles de euros):

Pagos Fijos Mensuales (estimaciones):
| CONCEPTO | ENERO | FEBRERO | MARZO | ABRIL |
|----------|-------|---------|-------|-------|
| Salarios | 4,8 | 4,8 | 4,8 | 4,8 |
| Seg. Social | 2,2 | 2,2 | 2,2 | 2,2 |
| Alquiler local | 0,7 | 0,7 | 0,7 | 0,7 |
| Conservación y Mto. | 0,3 | 0,3 | 0,3 | 0,3 |
| Electricidad | 0,2 | 0,2 | 0,2 | 0,2 |
| Teléfono | 0,8 | 0,8 | 0,8 | 0,8 |
| Asesoría Laboral | 0,1 | 0,1 | 0,1 | 0,1 |
| Gastos Financieros | 1,2 | 1,2 | 1,2 | 1,2 |
| Marketing Digital | 1,1 | 1,1 | 1,1 | 1,1 |
| Cuota préstamo | 0,6 | 0,6 | 0,6 | 0,6 |
| Imprevistos | 0,5 | 0,5 | 0,5 | 0,5 |
| TOTAL | 12,5 | 12,5 | 12,5 | 12,5 |

Pagos Fijos Anuales (abril):
- IVA trimestral: 3,9 | IRPF trimestral: 2,8

Compras previstas:
| | ENERO | FEBRERO | MARZO | ABRIL |
|--|-------|---------|-------|-------|
| COMPRAS | 10,2 | 9,0 | 8,2 | 5,4 |

Condiciones pago: 50% contado, resto en 2 pagos iguales a 30 y 60 días.

DESGLOSE PAGOS COMPRAS FUTURAS:
| COMPRAS | PAGOS | Enero | Febrero | Marzo | Abril | Mayo |
|---------|-------|-------|---------|-------|-------|------|
| Enero | 10,2 | 5,1 | 2,6 | 2,6 | — | — |
| Febrero | 9,0 | — | 4,5 | 2,3 | 2,3 | — |
| Marzo | 8,2 | — | — | 4,1 | 2,1 | 2,1 |
| Abril | 5,4 | — | — | — | 2,7 | 1,4 |
| TOTAL | | 5,1 | 7,1 | 9,0 | 7,1 | 3,5 |

Ventas previstas:
| | ENERO | FEBRERO | MARZO | ABRIL |
|--|-------|---------|-------|-------|
| VENTAS | 30,0 | 21,6 | 19,2 | 10,8 |

Cobro: 60% contado, resto en 2 cobros iguales a 30 y 60 días.

DESGLOSE COBROS VENTAS FUTURAS:
| VENTAS | COBROS | Enero | Febrero | Marzo | Abril | Mayo |
|--------|--------|-------|---------|-------|-------|------|
| Enero | 30,0 | 18,0 | 6,0 | 6,0 | — | — |
| Febrero | 21,6 | — | 13,0 | 4,3 | 4,3 | — |
| Marzo | 19,2 | — | — | 11,5 | 3,8 | 3,8 |
| Abril | 10,8 | — | — | — | 6,5 | 2,2 |
| TOTAL | | 18,0 | 19,0 | 21,8 | 14,6 | 6,0 |

CUADRO RESUMEN TESORERÍA:
| CONCEPTO | ENERO | FEBRERO | MARZO | ABRIL |
|----------|-------|---------|-------|-------|
| 1. Pagos fijos mensuales | 12,5 | 12,5 | 12,5 | 12,5 |
| 2. Pagos fijos anuales | — | — | — | 6,7 |
| 3. Pagos oper. último mes | 0,7 | 1,9 | 4,7 | — |
| 4. Pagos oper. meses ant. | — | — | — | — |
| 5. Pagos compras futuras | 5,1 | 7,1 | 9,0 | 7,1 |
| TOTAL SALIDAS | 18,3 | 21,5 | 26,2 | 26,3 |
| 6. Cobros ventas último mes | 4,8 | 2,6 | 4,5 | — |
| 7. Cobros ventas meses ant. | — | — | — | — |
| 8. Cobros ventas futuras | 18,0 | 19,0 | 21,8 | 14,6 |
| TOTAL ENTRADAS | 22,8 | 21,6 | 26,3 | 14,6 |
| 9. Disponible inicial | 6,0 | 10,5 | 10,6 | 10,7 |
| SALDO PREVISTO | 10,5 | 10,6 | 10,7 | -1,0 |

⚠️ ALERTA: En abril el saldo se vuelve negativo (-1.000€). Se recomienda negociar línea de crédito o adelantar cobros.`,


  // =====================================================================
  // SESIÓN 21 - ANÁLISIS FONDO DE MANIOBRA Y PUNTO DE EQUILIBRIO
  // =====================================================================
  21: `SESIÓN 21 – ANÁLISIS DEL FONDO DE MANIOBRA Y PUNTO DE EQUILIBRIO

A. FONDO DE MANIOBRA NECESARIO (proyección al 31/03):

| CONCEPTO | 31 Dic | 31 Ene | 28 Feb | 31 Mar |
|----------|--------|--------|--------|--------|
| Existencias (media) | 26.580 | 28.800 | 29.700 | 32.700 |
| Media de Clientes | | 11.640 | 8.900 | 7.200 |
| (-) Media Proveedores | | (9.180) | (8.500) | (7.800) |

Fondo de Maniobra Necesario = Existencias + Clientes - Proveedores = 32.700 + 7.200 - 7.800 = 32.100€

B. FONDO DE MANIOBRA REAL (31/03):
Pasivo No Corriente: 42.360€
(-) Activo No Corriente: 25.660€
= Fondo de Maniobra Real: 16.700€

C. CONCLUSIONES:
- NECESITA un Fondo de Maniobra de: 32.100€
- TIENE un Fondo de Maniobra de: 16.700€
- HAY QUE AUMENTAR el Fondo de Maniobra en: 15.400€

---

DETERMINACIÓN DEL CAPITAL NECESARIO (al 31/03):

| CONCEPTO | IMPORTE |
|----------|---------|
| A. Necesita un Activo No Corriente de | 25.660€ |
| B. Necesita un Fondo de Maniobra de | 32.100€ |
| C. Necesita un Pasivo No Corriente de (A+B) | 57.760€ |
| D. Deudas a Largo Plazo | 3.760€ |
| E. Necesita unos Fondos Propios de (C-D) | 54.000€ |
| F. Tiene unas Reservas de | 5.340€ |
| G. Necesitaría un Capital de (E-F) | 48.660€ |

CONCLUSIÓN:
- Necesita un Capital de: 48.660€
- Tiene un Capital de: 24.000€
- Hay que AUMENTAR el Capital en: 24.660€ (o buscar financiación alternativa)

---

COSTES FIJOS Y VARIABLES (ejercicio clasificación):

| GASTO | F/V |
|-------|-----|
| Alquileres | FIJO |
| Personal de fábrica | VARIABLE |
| Seguros | FIJO |
| Intereses | FIJO |
| Gastos de embalaje | VARIABLE |
| Impuestos municipales | FIJO |
| Compras materias primas | VARIABLE |
| Comisiones de ventas | VARIABLE |
| Personal administración | FIJO |

---

CÁLCULO DEL UMBRAL DE RENTABILIDAD (PUNTO MUERTO):

ACTIVIDAD COMERCIAL (Artesanía):
- Precio de venta unitario: 48€
- Coste variable unitario: 28,50€
- Costes fijos mensuales: 2.400€
- Margen por unidad = 48 - 28,50 = 19,50€
- U.R. = 2.400 / 19,50 = 123 unidades/mes

ACTIVIDAD INDUSTRIAL (Calzado):
- Precio de venta unitario: 90€
- Coste variable unitario: 57€
- Costes fijos mensuales: 2.400€
- Margen por unidad = 90 - 57 = 33€
- U.R. = 2.400 / 33 = 73 unidades/mes

Para obtener un beneficio de 18.000€ (solo actividad comercial):
(2.400 + 18.000) / 19,50 = 1.046 unidades

Para obtener un beneficio de 18.000€ (solo actividad industrial):
(2.400 + 18.000) / 33 = 618 unidades

---

APALANCAMIENTO OPERATIVO:

NexaCraft quiere aumentar producción en 200 unidades/mes (calzado):

OPCIÓN A: Invertir en maquinaria (Costes Fijos suben a 3.900€):
- Ingresos: 200 × 90€ = 18.000€
- Costes Fijos: 3.900€
- Coste Variable: 57€ × 200 = 11.400€
- Beneficio: 2.700€

OPCIÓN B: Contratar más trabajadores (CV unitario sube a 61,20€):
- Ingresos: 200 × 90€ = 18.000€
- Costes Fijos: 2.400€
- Coste Variable: 61,20€ × 200 = 12.240€
- Beneficio: 3.360€

→ OPCIÓN B más rentable a corto plazo (beneficio +660€ superior)
→ OPCIÓN A más escalable a largo plazo (mayor margen unitario si volumen crece)`,


  // =====================================================================
  // SESIÓN 22 - ANÁLISIS ECONÓMICO-FINANCIERO
  // =====================================================================
  22: `SESIÓN 22 – ANÁLISIS ECONÓMICO Y FINANCIERO DE NEXACRAFT DESIGN, S.L.

I. CONCLUSIONES SOBRE EL ANÁLISIS ECONÓMICO

1. ANÁLISIS DE RENTABILIDAD DE LOS FONDOS PROPIOS:
   Beneficio Neto / Fondos Propios × 100
   = 750 / 30.090 × 100 = 2,49%
   Tendencia: ¿Aumenta o disminuye? → Evaluar con datos trimestrales

2. ANÁLISIS DEL BENEFICIO BRUTO:
   2.1. Ventas: ¿Mejora el volumen? → Sí, ventas crecientes
        ¿Mejora la forma de cobro? → Más cobros al contado
        Precios similares a competencia.
        En resumen: Saben vender en NexaCraft.

   2.2. Existencias: Van aumentando cada vez más → RIESGO de sobre-stock
        Rotación existencias = Coste ventas / Existencias medias

   2.3. Compras: Volumen adecuado al mayor volumen de ventas
        Precios normales (no ha habido oportunidades especiales)
        En resumen: Saben comprar en NexaCraft.

   2.4. Conclusiones Beneficio Bruto:
        - ¿En qué mes es más elevado? → Analizar por trimestre
        - ¿En qué mes es mayor la Rotación de Existencias?
        - Dedicarse más a la actividad industrial (mayor margen) vs comercial

3. ANÁLISIS DE LOS GASTOS GENERALES:
   - ¿Aumentan de diciembre a marzo? → Sí
   - ¿Qué cuentas producen el aumento? → Gastos financieros (falta de liquidez)
   - Gastos aconsejables reducir:
     a) Disminuir compras (ajustar al volumen real de ventas)
     b) Dedicarse más a la actividad comercial (menor inversión en circulante)
     c) Conseguir mejores condiciones de pago de proveedores
     d) Aumentar el Capital
     e) Buscar financiación a largo plazo

---

II. CONCLUSIONES SOBRE EL ANÁLISIS FINANCIERO

1. SOLVENCIA:
   Ratio Solvencia = Activo Total / Pasivo Exigible
   = 71.980 / 37.606 = 1,91 → SOLVENTE (>1,5 óptimo)

2. TESORERÍA:
   Ratio Tesorería = (Realizable + Disponible) / Pasivo Corriente
   = (15.893 + 6.619) / 37.606 = 0,60 → INSUFICIENTE (<1,0)

3. LIQUIDEZ:
   Ratio Liquidez = Activo Corriente / Pasivo Corriente
   = 46.785 / 37.606 = 1,24 → JUSTA (óptimo: 1,5-2,0)
   
   ¿Puede hacer frente a los pagos todos los meses próximos? → NO en abril
   ¿Qué hacer? → Anticipar cobros de clientes, negociar descuentos de efectos

4. ENDEUDAMIENTO:
   Ratio Endeudamiento = Pasivo Exigible / Patrimonio Neto
   = 37.606 / 30.090 = 1,25 → ALTO (óptimo: <0,6)

5. GARANTÍA:
   Ratio Garantía = Activo Real / Pasivo Exigible
   = 71.980 / 37.606 = 1,91 → BUENA

6. AUTONOMÍA FINANCIERA:
   Ratio Autonomía = Patrimonio Neto / Activo Total
   = 30.090 / 71.980 = 0,42 → MODERADA

7. FONDO DE MANIOBRA:
   FM Necesario: 32.100€ | FM Real: 9.179€ → MUY INSUFICIENTE
   Hay que aumentar el FM en 22.921€

8. INDEPENDENCIA FINANCIERA:
   Fondos Propios / Pasivo Total = 30.090 / 71.980 = 0,42
   → Dependencia moderada-alta de financiación ajena

---

III. PLAN DE ACCIÓN RECOMENDADO:

1. CORTO PLAZO (0-3 meses):
   - Negociar línea de crédito para cubrir déficit de abril
   - Acelerar cobros de clientes (descuento por pronto pago)
   - Reducir stock de mercaderías artesanía (promociones)

2. MEDIO PLAZO (3-12 meses):
   - Ampliación de capital: 24.660€ adicionales
   - Reestructurar deuda de CP a LP
   - Optimizar rotación de existencias (just-in-time)

3. LARGO PLAZO (>12 meses):
   - Diversificar canales de venta (e-commerce)
   - Analizar rentabilidad por producto (ABC Costing)
   - Implantar sistema ERP para control de gestión en tiempo real
   - Certificación ESG para acceder a financiación sostenible`,

};

export default SESSION_OCR_CONTENT;
