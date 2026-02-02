/**
 * PGCAccountTree - Árbol interactivo del Plan General Contable 2007
 * Selector de cuentas con estructura jerárquica
 */

import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Search, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// PGC 2007 Structure
const PGC_2007_STRUCTURE = {
  // Grupo 1 - Financiación básica
  '1': {
    name: 'Financiación básica',
    accounts: {
      '10': { name: 'Capital', accounts: {
        '100': { name: 'Capital social' },
        '101': { name: 'Fondo social' },
        '102': { name: 'Capital' },
        '103': { name: 'Socios por desembolsos no exigidos' },
        '104': { name: 'Socios por aportaciones no dinerarias pendientes' },
        '108': { name: 'Acciones o participaciones propias en situaciones especiales' },
        '109': { name: 'Acciones o participaciones propias para reducción de capital' }
      }},
      '11': { name: 'Reservas y otros instrumentos de patrimonio', accounts: {
        '110': { name: 'Prima de emisión o asunción' },
        '111': { name: 'Otros instrumentos de patrimonio neto' },
        '112': { name: 'Reserva legal' },
        '113': { name: 'Reservas voluntarias' },
        '114': { name: 'Reservas especiales' },
        '115': { name: 'Reservas por pérdidas y ganancias actuariales' },
        '118': { name: 'Aportaciones de socios o propietarios' },
        '119': { name: 'Diferencias por ajuste del capital a euros' }
      }},
      '12': { name: 'Resultados pendientes de aplicación', accounts: {
        '120': { name: 'Remanente' },
        '121': { name: 'Resultados negativos de ejercicios anteriores' },
        '129': { name: 'Resultado del ejercicio' }
      }},
      '13': { name: 'Subvenciones, donaciones y ajustes por cambio de valor', accounts: {
        '130': { name: 'Subvenciones oficiales de capital' },
        '131': { name: 'Donaciones y legados de capital' },
        '132': { name: 'Otras subvenciones, donaciones y legados' },
        '133': { name: 'Ajustes por valoración en activos financieros' },
        '134': { name: 'Operaciones de cobertura' },
        '135': { name: 'Diferencias de conversión' },
        '136': { name: 'Ajustes por valoración en activos no corrientes' },
        '137': { name: 'Ingresos fiscales a distribuir' }
      }},
      '14': { name: 'Provisiones', accounts: {
        '140': { name: 'Provisión por retribuciones a largo plazo' },
        '141': { name: 'Provisión para impuestos' },
        '142': { name: 'Provisión para otras responsabilidades' },
        '143': { name: 'Provisión por desmantelamiento' },
        '145': { name: 'Provisión para actuaciones medioambientales' }
      }},
      '15': { name: 'Deudas a largo plazo con características especiales', accounts: {
        '150': { name: 'Acciones o participaciones a largo plazo consideradas como pasivos' }
      }},
      '16': { name: 'Deudas a largo plazo con partes vinculadas', accounts: {
        '160': { name: 'Deudas a largo plazo con entidades de crédito vinculadas' },
        '161': { name: 'Proveedores de inmovilizado a largo plazo, partes vinculadas' },
        '162': { name: 'Acreedores por arrendamiento financiero a largo plazo' },
        '163': { name: 'Otras deudas a largo plazo con partes vinculadas' }
      }},
      '17': { name: 'Deudas a largo plazo por préstamos recibidos', accounts: {
        '170': { name: 'Deudas a largo plazo con entidades de crédito' },
        '171': { name: 'Deudas a largo plazo' },
        '172': { name: 'Deudas a largo plazo transformables en subvenciones' },
        '173': { name: 'Proveedores de inmovilizado a largo plazo' },
        '174': { name: 'Acreedores por arrendamiento financiero a largo plazo' },
        '175': { name: 'Efectos a pagar a largo plazo' },
        '176': { name: 'Pasivos por derivados financieros a largo plazo' },
        '177': { name: 'Obligaciones y bonos' },
        '178': { name: 'Obligaciones y bonos convertibles' },
        '179': { name: 'Deudas representadas en otros valores negociables' }
      }},
      '18': { name: 'Pasivos por fianzas, garantías y otros conceptos a largo plazo', accounts: {
        '180': { name: 'Fianzas recibidas a largo plazo' },
        '181': { name: 'Anticipos recibidos por ventas o prestaciones de servicios a largo plazo' },
        '185': { name: 'Depósitos recibidos a largo plazo' }
      }},
      '19': { name: 'Situaciones transitorias de financiación', accounts: {
        '190': { name: 'Acciones o participaciones emitidas' },
        '192': { name: 'Suscriptores de acciones' },
        '194': { name: 'Capital emitido pendiente de inscripción' },
        '195': { name: 'Acciones o participaciones emitidas consideradas como pasivos' }
      }}
    }
  },
  // Grupo 2 - Activo no corriente
  '2': {
    name: 'Activo no corriente',
    accounts: {
      '20': { name: 'Inmovilizaciones intangibles', accounts: {
        '200': { name: 'Investigación' },
        '201': { name: 'Desarrollo' },
        '202': { name: 'Concesiones administrativas' },
        '203': { name: 'Propiedad industrial' },
        '204': { name: 'Fondo de comercio' },
        '205': { name: 'Derechos de traspaso' },
        '206': { name: 'Aplicaciones informáticas' },
        '209': { name: 'Anticipos para inmovilizaciones intangibles' }
      }},
      '21': { name: 'Inmovilizaciones materiales', accounts: {
        '210': { name: 'Terrenos y bienes naturales' },
        '211': { name: 'Construcciones' },
        '212': { name: 'Instalaciones técnicas' },
        '213': { name: 'Maquinaria' },
        '214': { name: 'Utillaje' },
        '215': { name: 'Otras instalaciones' },
        '216': { name: 'Mobiliario' },
        '217': { name: 'Equipos para procesos de información' },
        '218': { name: 'Elementos de transporte' },
        '219': { name: 'Otro inmovilizado material' }
      }},
      '22': { name: 'Inversiones inmobiliarias', accounts: {
        '220': { name: 'Inversiones en terrenos y bienes naturales' },
        '221': { name: 'Inversiones en construcciones' }
      }},
      '23': { name: 'Inmovilizaciones materiales en curso', accounts: {
        '230': { name: 'Adaptación de terrenos y bienes naturales' },
        '231': { name: 'Construcciones en curso' },
        '232': { name: 'Instalaciones técnicas en montaje' },
        '233': { name: 'Maquinaria en montaje' },
        '237': { name: 'Equipos para procesos de información en montaje' },
        '239': { name: 'Anticipos para inmovilizaciones materiales' }
      }},
      '24': { name: 'Inversiones financieras a largo plazo en partes vinculadas', accounts: {
        '240': { name: 'Participaciones a largo plazo en partes vinculadas' },
        '241': { name: 'Valores representativos de deuda a largo plazo de partes vinculadas' },
        '242': { name: 'Créditos a largo plazo a partes vinculadas' },
        '249': { name: 'Desembolsos pendientes sobre participaciones a largo plazo' }
      }},
      '25': { name: 'Otras inversiones financieras a largo plazo', accounts: {
        '250': { name: 'Inversiones financieras a largo plazo en instrumentos de patrimonio' },
        '251': { name: 'Valores representativos de deuda a largo plazo' },
        '252': { name: 'Créditos a largo plazo' },
        '253': { name: 'Créditos a largo plazo por enajenación de inmovilizado' },
        '254': { name: 'Créditos a largo plazo al personal' },
        '255': { name: 'Activos por derivados financieros a largo plazo' },
        '258': { name: 'Imposiciones a largo plazo' },
        '259': { name: 'Desembolsos pendientes sobre participaciones a largo plazo' }
      }},
      '26': { name: 'Fianzas y depósitos constituidos a largo plazo', accounts: {
        '260': { name: 'Fianzas constituidas a largo plazo' },
        '265': { name: 'Depósitos constituidos a largo plazo' }
      }},
      '28': { name: 'Amortización acumulada del inmovilizado', accounts: {
        '280': { name: 'Amortización acumulada del inmovilizado intangible' },
        '281': { name: 'Amortización acumulada del inmovilizado material' },
        '282': { name: 'Amortización acumulada de las inversiones inmobiliarias' }
      }},
      '29': { name: 'Deterioro de valor de activos no corrientes', accounts: {
        '290': { name: 'Deterioro de valor del inmovilizado intangible' },
        '291': { name: 'Deterioro de valor del inmovilizado material' },
        '292': { name: 'Deterioro de valor de las inversiones inmobiliarias' },
        '293': { name: 'Deterioro de valor de participaciones a largo plazo en partes vinculadas' },
        '294': { name: 'Deterioro de valor de valores representativos de deuda a largo plazo de partes vinculadas' },
        '295': { name: 'Deterioro de valor de créditos a largo plazo a partes vinculadas' },
        '296': { name: 'Deterioro de valor de participaciones a largo plazo' },
        '297': { name: 'Deterioro de valor de valores representativos de deuda a largo plazo' },
        '298': { name: 'Deterioro de valor de créditos a largo plazo' }
      }}
    }
  },
  // Grupo 3 - Existencias
  '3': {
    name: 'Existencias',
    accounts: {
      '30': { name: 'Comerciales', accounts: {
        '300': { name: 'Mercaderías A' },
        '301': { name: 'Mercaderías B' }
      }},
      '31': { name: 'Materias primas', accounts: {
        '310': { name: 'Materias primas A' },
        '311': { name: 'Materias primas B' }
      }},
      '32': { name: 'Otros aprovisionamientos', accounts: {
        '320': { name: 'Elementos y conjuntos incorporables' },
        '321': { name: 'Combustibles' },
        '322': { name: 'Repuestos' },
        '325': { name: 'Materiales diversos' },
        '326': { name: 'Embalajes' },
        '327': { name: 'Envases' },
        '328': { name: 'Material de oficina' }
      }},
      '33': { name: 'Productos en curso', accounts: {
        '330': { name: 'Productos en curso A' },
        '331': { name: 'Productos en curso B' }
      }},
      '34': { name: 'Productos semiterminados', accounts: {
        '340': { name: 'Productos semiterminados A' },
        '341': { name: 'Productos semiterminados B' }
      }},
      '35': { name: 'Productos terminados', accounts: {
        '350': { name: 'Productos terminados A' },
        '351': { name: 'Productos terminados B' }
      }},
      '36': { name: 'Subproductos, residuos y materiales recuperados', accounts: {
        '360': { name: 'Subproductos A' },
        '365': { name: 'Residuos A' },
        '368': { name: 'Materiales recuperados A' }
      }},
      '39': { name: 'Deterioro de valor de las existencias', accounts: {
        '390': { name: 'Deterioro de valor de las mercaderías' },
        '391': { name: 'Deterioro de valor de las materias primas' },
        '392': { name: 'Deterioro de valor de otros aprovisionamientos' },
        '393': { name: 'Deterioro de valor de los productos en curso' },
        '394': { name: 'Deterioro de valor de los productos semiterminados' },
        '395': { name: 'Deterioro de valor de los productos terminados' },
        '396': { name: 'Deterioro de valor de los subproductos, residuos y materiales recuperados' }
      }}
    }
  },
  // Grupo 4 - Acreedores y deudores
  '4': {
    name: 'Acreedores y deudores por operaciones comerciales',
    accounts: {
      '40': { name: 'Proveedores', accounts: {
        '400': { name: 'Proveedores' },
        '401': { name: 'Proveedores, efectos comerciales a pagar' },
        '403': { name: 'Proveedores, empresas del grupo' },
        '404': { name: 'Proveedores, empresas asociadas' },
        '405': { name: 'Proveedores, otras partes vinculadas' },
        '406': { name: 'Envases y embalajes a devolver a proveedores' },
        '407': { name: 'Anticipos a proveedores' }
      }},
      '41': { name: 'Acreedores varios', accounts: {
        '410': { name: 'Acreedores por prestaciones de servicios' },
        '411': { name: 'Acreedores, efectos comerciales a pagar' }
      }},
      '43': { name: 'Clientes', accounts: {
        '430': { name: 'Clientes' },
        '431': { name: 'Clientes, efectos comerciales a cobrar' },
        '432': { name: 'Clientes, operaciones de factoring' },
        '433': { name: 'Clientes, empresas del grupo' },
        '434': { name: 'Clientes, empresas asociadas' },
        '435': { name: 'Clientes, otras partes vinculadas' },
        '436': { name: 'Clientes de dudoso cobro' },
        '437': { name: 'Envases y embalajes a devolver por clientes' },
        '438': { name: 'Anticipos de clientes' }
      }},
      '44': { name: 'Deudores varios', accounts: {
        '440': { name: 'Deudores' },
        '441': { name: 'Deudores, efectos comerciales a cobrar' },
        '446': { name: 'Deudores de dudoso cobro' }
      }},
      '46': { name: 'Personal', accounts: {
        '460': { name: 'Anticipos de remuneraciones' },
        '465': { name: 'Remuneraciones pendientes de pago' },
        '466': { name: 'Remuneraciones mediante sistemas de aportación definida pendientes de pago' }
      }},
      '47': { name: 'Administraciones Públicas', accounts: {
        '470': { name: 'Hacienda Pública, deudora por diversos conceptos' },
        '471': { name: 'Organismos de la Seguridad Social, deudores' },
        '472': { name: 'Hacienda Pública, IVA soportado' },
        '473': { name: 'Hacienda Pública, retenciones y pagos a cuenta' },
        '474': { name: 'Activos por impuesto diferido' },
        '475': { name: 'Hacienda Pública, acreedora por conceptos fiscales' },
        '476': { name: 'Organismos de la Seguridad Social, acreedores' },
        '477': { name: 'Hacienda Pública, IVA repercutido' },
        '479': { name: 'Pasivos por diferencias temporarias imponibles' }
      }},
      '48': { name: 'Ajustes por periodificación', accounts: {
        '480': { name: 'Gastos anticipados' },
        '485': { name: 'Ingresos anticipados' }
      }},
      '49': { name: 'Deterioro de valor de créditos comerciales', accounts: {
        '490': { name: 'Deterioro de valor de créditos por operaciones comerciales' },
        '493': { name: 'Deterioro de valor de créditos por operaciones comerciales con partes vinculadas' },
        '499': { name: 'Provisión para operaciones comerciales' }
      }}
    }
  },
  // Grupo 5 - Cuentas financieras
  '5': {
    name: 'Cuentas financieras',
    accounts: {
      '50': { name: 'Empréstitos, deudas con características especiales y otras emisiones análogas a corto plazo', accounts: {
        '500': { name: 'Obligaciones y bonos a corto plazo' },
        '501': { name: 'Obligaciones y bonos convertibles a corto plazo' },
        '502': { name: 'Acciones o participaciones a corto plazo consideradas como pasivos' },
        '505': { name: 'Deudas representadas en otros valores negociables a corto plazo' },
        '506': { name: 'Intereses a corto plazo de empréstitos y otras emisiones análogas' },
        '507': { name: 'Dividendos de acciones o participaciones consideradas como pasivos a corto plazo' },
        '509': { name: 'Valores negociables amortizados' }
      }},
      '51': { name: 'Deudas a corto plazo con partes vinculadas', accounts: {
        '510': { name: 'Deudas a corto plazo con entidades de crédito vinculadas' },
        '511': { name: 'Proveedores de inmovilizado a corto plazo, partes vinculadas' },
        '512': { name: 'Acreedores por arrendamiento financiero a corto plazo, partes vinculadas' },
        '513': { name: 'Otras deudas a corto plazo con partes vinculadas' },
        '514': { name: 'Intereses a corto plazo de deudas con partes vinculadas' }
      }},
      '52': { name: 'Deudas a corto plazo por préstamos recibidos y otros conceptos', accounts: {
        '520': { name: 'Deudas a corto plazo con entidades de crédito' },
        '521': { name: 'Deudas a corto plazo' },
        '522': { name: 'Deudas a corto plazo transformables en subvenciones' },
        '523': { name: 'Proveedores de inmovilizado a corto plazo' },
        '524': { name: 'Acreedores por arrendamiento financiero a corto plazo' },
        '525': { name: 'Efectos a pagar a corto plazo' },
        '526': { name: 'Dividendo activo a pagar' },
        '527': { name: 'Intereses a corto plazo de deudas con entidades de crédito' },
        '528': { name: 'Intereses a corto plazo de deudas' },
        '529': { name: 'Provisiones a corto plazo' }
      }},
      '53': { name: 'Inversiones financieras a corto plazo en partes vinculadas', accounts: {
        '530': { name: 'Participaciones a corto plazo en partes vinculadas' },
        '531': { name: 'Valores representativos de deuda a corto plazo de partes vinculadas' },
        '532': { name: 'Créditos a corto plazo a partes vinculadas' },
        '533': { name: 'Intereses a corto plazo de valores representativos de deuda de partes vinculadas' },
        '534': { name: 'Intereses a corto plazo de créditos a partes vinculadas' },
        '535': { name: 'Dividendo a cobrar de inversiones financieras en partes vinculadas' },
        '539': { name: 'Desembolsos pendientes sobre participaciones a corto plazo en partes vinculadas' }
      }},
      '54': { name: 'Otras inversiones financieras a corto plazo', accounts: {
        '540': { name: 'Inversiones financieras a corto plazo en instrumentos de patrimonio' },
        '541': { name: 'Valores representativos de deuda a corto plazo' },
        '542': { name: 'Créditos a corto plazo' },
        '543': { name: 'Créditos a corto plazo por enajenación de inmovilizado' },
        '544': { name: 'Créditos a corto plazo al personal' },
        '545': { name: 'Dividendo a cobrar' },
        '546': { name: 'Intereses a corto plazo de valores representativos de deuda' },
        '547': { name: 'Intereses a corto plazo de créditos' },
        '548': { name: 'Imposiciones a corto plazo' },
        '549': { name: 'Desembolsos pendientes sobre participaciones a corto plazo' }
      }},
      '55': { name: 'Otras cuentas no bancarias', accounts: {
        '550': { name: 'Titular de la explotación' },
        '551': { name: 'Cuenta corriente con socios y administradores' },
        '552': { name: 'Cuenta corriente con otras personas y entidades vinculadas' },
        '553': { name: 'Cuentas corrientes en fusiones y escisiones' },
        '554': { name: 'Cuenta corriente con uniones temporales de empresas' },
        '555': { name: 'Partidas pendientes de aplicación' },
        '556': { name: 'Desembolsos exigidos sobre participaciones' },
        '557': { name: 'Dividendo activo a cuenta' },
        '558': { name: 'Socios por desembolsos exigidos' },
        '559': { name: 'Derivados financieros a corto plazo' }
      }},
      '56': { name: 'Fianzas y depósitos recibidos y constituidos a corto plazo', accounts: {
        '560': { name: 'Fianzas recibidas a corto plazo' },
        '561': { name: 'Depósitos recibidos a corto plazo' },
        '565': { name: 'Fianzas constituidas a corto plazo' },
        '566': { name: 'Depósitos constituidos a corto plazo' }
      }},
      '57': { name: 'Tesorería', accounts: {
        '570': { name: 'Caja, euros' },
        '571': { name: 'Caja, moneda extranjera' },
        '572': { name: 'Bancos e instituciones de crédito c/c vista, euros' },
        '573': { name: 'Bancos e instituciones de crédito c/c vista, moneda extranjera' },
        '574': { name: 'Bancos e instituciones de crédito, cuentas de ahorro, euros' },
        '575': { name: 'Bancos e instituciones de crédito, cuentas de ahorro, moneda extranjera' },
        '576': { name: 'Inversiones a corto plazo de gran liquidez' }
      }},
      '59': { name: 'Deterioro de valor de inversiones financieras a corto plazo', accounts: {
        '593': { name: 'Deterioro de valor de participaciones a corto plazo en partes vinculadas' },
        '594': { name: 'Deterioro de valor de valores representativos de deuda a corto plazo de partes vinculadas' },
        '595': { name: 'Deterioro de valor de créditos a corto plazo a partes vinculadas' },
        '596': { name: 'Deterioro de valor de participaciones a corto plazo' },
        '597': { name: 'Deterioro de valor de valores representativos de deuda a corto plazo' },
        '598': { name: 'Deterioro de valor de créditos a corto plazo' }
      }}
    }
  },
  // Grupo 6 - Compras y gastos
  '6': {
    name: 'Compras y gastos',
    accounts: {
      '60': { name: 'Compras', accounts: {
        '600': { name: 'Compras de mercaderías' },
        '601': { name: 'Compras de materias primas' },
        '602': { name: 'Compras de otros aprovisionamientos' },
        '606': { name: 'Descuentos sobre compras por pronto pago' },
        '607': { name: 'Trabajos realizados por otras empresas' },
        '608': { name: 'Devoluciones de compras y operaciones similares' },
        '609': { name: 'Rappels por compras' }
      }},
      '61': { name: 'Variación de existencias', accounts: {
        '610': { name: 'Variación de existencias de mercaderías' },
        '611': { name: 'Variación de existencias de materias primas' },
        '612': { name: 'Variación de existencias de otros aprovisionamientos' }
      }},
      '62': { name: 'Servicios exteriores', accounts: {
        '620': { name: 'Gastos en investigación y desarrollo del ejercicio' },
        '621': { name: 'Arrendamientos y cánones' },
        '622': { name: 'Reparaciones y conservación' },
        '623': { name: 'Servicios de profesionales independientes' },
        '624': { name: 'Transportes' },
        '625': { name: 'Primas de seguros' },
        '626': { name: 'Servicios bancarios y similares' },
        '627': { name: 'Publicidad, propaganda y relaciones públicas' },
        '628': { name: 'Suministros' },
        '629': { name: 'Otros servicios' }
      }},
      '63': { name: 'Tributos', accounts: {
        '630': { name: 'Impuesto sobre beneficios' },
        '631': { name: 'Otros tributos' },
        '633': { name: 'Ajustes negativos en la imposición sobre beneficios' },
        '634': { name: 'Ajustes negativos en la imposición indirecta' },
        '636': { name: 'Devolución de impuestos' },
        '638': { name: 'Ajustes positivos en la imposición sobre beneficios' },
        '639': { name: 'Ajustes positivos en la imposición indirecta' }
      }},
      '64': { name: 'Gastos de personal', accounts: {
        '640': { name: 'Sueldos y salarios' },
        '641': { name: 'Indemnizaciones' },
        '642': { name: 'Seguridad Social a cargo de la empresa' },
        '643': { name: 'Retribuciones a largo plazo mediante sistemas de aportación definida' },
        '644': { name: 'Retribuciones a largo plazo mediante sistemas de prestación definida' },
        '645': { name: 'Retribuciones al personal mediante instrumentos de patrimonio' },
        '649': { name: 'Otros gastos sociales' }
      }},
      '65': { name: 'Otros gastos de gestión', accounts: {
        '650': { name: 'Pérdidas de créditos comerciales incobrables' },
        '651': { name: 'Resultados de operaciones en común' },
        '659': { name: 'Otras pérdidas en gestión corriente' }
      }},
      '66': { name: 'Gastos financieros', accounts: {
        '660': { name: 'Gastos financieros por actualización de provisiones' },
        '661': { name: 'Intereses de obligaciones y bonos' },
        '662': { name: 'Intereses de deudas' },
        '663': { name: 'Pérdidas por valoración de instrumentos financieros' },
        '664': { name: 'Gastos por dividendos de acciones o participaciones consideradas como pasivos' },
        '665': { name: 'Intereses por descuento de efectos y operaciones de factoring' },
        '666': { name: 'Pérdidas en participaciones y valores representativos de deuda' },
        '667': { name: 'Pérdidas de créditos no comerciales' },
        '668': { name: 'Diferencias negativas de cambio' },
        '669': { name: 'Otros gastos financieros' }
      }},
      '67': { name: 'Pérdidas procedentes de activos no corrientes', accounts: {
        '670': { name: 'Pérdidas procedentes del inmovilizado intangible' },
        '671': { name: 'Pérdidas procedentes del inmovilizado material' },
        '672': { name: 'Pérdidas procedentes de las inversiones inmobiliarias' },
        '673': { name: 'Pérdidas procedentes de participaciones a largo plazo en partes vinculadas' },
        '675': { name: 'Pérdidas por operaciones con obligaciones propias' },
        '678': { name: 'Gastos excepcionales' }
      }},
      '68': { name: 'Dotaciones para amortizaciones', accounts: {
        '680': { name: 'Amortización del inmovilizado intangible' },
        '681': { name: 'Amortización del inmovilizado material' },
        '682': { name: 'Amortización de las inversiones inmobiliarias' }
      }},
      '69': { name: 'Pérdidas por deterioro y otras dotaciones', accounts: {
        '690': { name: 'Pérdidas por deterioro del inmovilizado intangible' },
        '691': { name: 'Pérdidas por deterioro del inmovilizado material' },
        '692': { name: 'Pérdidas por deterioro de las inversiones inmobiliarias' },
        '693': { name: 'Pérdidas por deterioro de existencias' },
        '694': { name: 'Pérdidas por deterioro de créditos por operaciones comerciales' },
        '695': { name: 'Dotación a la provisión por operaciones comerciales' },
        '696': { name: 'Pérdidas por deterioro de participaciones y valores representativos de deuda a largo plazo' },
        '697': { name: 'Pérdidas por deterioro de créditos a largo plazo' },
        '698': { name: 'Pérdidas por deterioro de participaciones y valores representativos de deuda a corto plazo' },
        '699': { name: 'Pérdidas por deterioro de créditos a corto plazo' }
      }}
    }
  },
  // Grupo 7 - Ventas e ingresos
  '7': {
    name: 'Ventas e ingresos',
    accounts: {
      '70': { name: 'Ventas de mercaderías, de producción propia, de servicios, etc.', accounts: {
        '700': { name: 'Ventas de mercaderías' },
        '701': { name: 'Ventas de productos terminados' },
        '702': { name: 'Ventas de productos semiterminados' },
        '703': { name: 'Ventas de subproductos y residuos' },
        '704': { name: 'Ventas de envases y embalajes' },
        '705': { name: 'Prestaciones de servicios' },
        '706': { name: 'Descuentos sobre ventas por pronto pago' },
        '708': { name: 'Devoluciones de ventas y operaciones similares' },
        '709': { name: 'Rappels sobre ventas' }
      }},
      '71': { name: 'Variación de existencias', accounts: {
        '710': { name: 'Variación de existencias de productos en curso' },
        '711': { name: 'Variación de existencias de productos semiterminados' },
        '712': { name: 'Variación de existencias de productos terminados' },
        '713': { name: 'Variación de existencias de subproductos, residuos y materiales recuperados' }
      }},
      '73': { name: 'Trabajos realizados para la empresa', accounts: {
        '730': { name: 'Trabajos realizados para el inmovilizado intangible' },
        '731': { name: 'Trabajos realizados para el inmovilizado material' },
        '732': { name: 'Trabajos realizados en inversiones inmobiliarias' },
        '733': { name: 'Trabajos realizados para el inmovilizado material en curso' }
      }},
      '74': { name: 'Subvenciones, donaciones y legados', accounts: {
        '740': { name: 'Subvenciones, donaciones y legados a la explotación' },
        '746': { name: 'Subvenciones, donaciones y legados de capital transferidos al resultado del ejercicio' },
        '747': { name: 'Otras subvenciones, donaciones y legados transferidos al resultado del ejercicio' }
      }},
      '75': { name: 'Otros ingresos de gestión', accounts: {
        '751': { name: 'Resultados de operaciones en común' },
        '752': { name: 'Ingresos por arrendamientos' },
        '753': { name: 'Ingresos de propiedad industrial cedida en explotación' },
        '754': { name: 'Ingresos por comisiones' },
        '755': { name: 'Ingresos por servicios al personal' },
        '759': { name: 'Ingresos por servicios diversos' }
      }},
      '76': { name: 'Ingresos financieros', accounts: {
        '760': { name: 'Ingresos de participaciones en instrumentos de patrimonio' },
        '761': { name: 'Ingresos de valores representativos de deuda' },
        '762': { name: 'Ingresos de créditos' },
        '763': { name: 'Beneficios por valoración de instrumentos financieros' },
        '765': { name: 'Descuentos sobre compras por pronto pago' },
        '766': { name: 'Beneficios en participaciones y valores representativos de deuda' },
        '768': { name: 'Diferencias positivas de cambio' },
        '769': { name: 'Otros ingresos financieros' }
      }},
      '77': { name: 'Beneficios procedentes de activos no corrientes', accounts: {
        '770': { name: 'Beneficios procedentes del inmovilizado intangible' },
        '771': { name: 'Beneficios procedentes del inmovilizado material' },
        '772': { name: 'Beneficios procedentes de las inversiones inmobiliarias' },
        '773': { name: 'Beneficios procedentes de participaciones a largo plazo en partes vinculadas' },
        '774': { name: 'Beneficios por diferencia negativa en combinaciones de negocios' },
        '775': { name: 'Beneficios por operaciones con obligaciones propias' },
        '778': { name: 'Ingresos excepcionales' }
      }},
      '79': { name: 'Excesos y aplicaciones de provisiones', accounts: {
        '790': { name: 'Reversión del deterioro del inmovilizado intangible' },
        '791': { name: 'Reversión del deterioro del inmovilizado material' },
        '792': { name: 'Reversión del deterioro de las inversiones inmobiliarias' },
        '793': { name: 'Reversión del deterioro de existencias' },
        '794': { name: 'Reversión del deterioro de créditos por operaciones comerciales' },
        '795': { name: 'Exceso de provisiones' },
        '796': { name: 'Reversión del deterioro de participaciones y valores representativos de deuda a largo plazo' },
        '797': { name: 'Reversión del deterioro de créditos a largo plazo' },
        '798': { name: 'Reversión del deterioro de participaciones y valores representativos de deuda a corto plazo' },
        '799': { name: 'Reversión del deterioro de créditos a corto plazo' }
      }}
    }
  }
};

interface AccountNode {
  code: string;
  name: string;
  children?: AccountNode[];
}

interface PGCAccountTreeProps {
  onSelect: (code: string, name: string) => void;
  selectedCode?: string;
  className?: string;
}

export function PGCAccountTree({ onSelect, selectedCode, className }: PGCAccountTreeProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['1', '2', '3', '4', '5', '6', '7']));

  // Build tree structure
  const buildTree = (structure: Record<string, any>, parentCode = ''): AccountNode[] => {
    return Object.entries(structure).map(([code, data]) => {
      if (typeof data === 'object' && 'name' in data) {
        const node: AccountNode = {
          code,
          name: data.name
        };
        if ('accounts' in data) {
          node.children = buildTree(data.accounts, code);
        }
        return node;
      }
      return { code, name: data as string };
    });
  };

  const treeData = useMemo(() => buildTree(PGC_2007_STRUCTURE), []);

  // Filter tree based on search
  const filterTree = (nodes: AccountNode[], term: string): AccountNode[] => {
    if (!term) return nodes;
    
    return nodes.reduce<AccountNode[]>((acc, node) => {
      const matchesSearch = 
        node.code.toLowerCase().includes(term.toLowerCase()) ||
        node.name.toLowerCase().includes(term.toLowerCase());
      
      const filteredChildren = node.children ? filterTree(node.children, term) : [];
      
      if (matchesSearch || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children
        });
      }
      
      return acc;
    }, []);
  };

  const filteredData = useMemo(() => filterTree(treeData, searchTerm), [treeData, searchTerm]);

  // Auto-expand when searching
  React.useEffect(() => {
    if (searchTerm) {
      const allCodes = new Set<string>();
      const collectCodes = (nodes: AccountNode[]) => {
        nodes.forEach(node => {
          allCodes.add(node.code);
          if (node.children) collectCodes(node.children);
        });
      };
      collectCodes(filteredData);
      setExpandedNodes(allCodes);
    }
  }, [searchTerm, filteredData]);

  const toggleExpand = (code: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const renderNode = (node: AccountNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.code);
    const isSelected = selectedCode === node.code;
    const isLeaf = node.code.length >= 3;

    return (
      <div key={node.code}>
        <div
          className={cn(
            "flex items-center gap-1 py-1 px-2 rounded cursor-pointer hover:bg-muted/50 transition-colors",
            isSelected && "bg-primary/10 border border-primary/30",
            level === 0 && "font-semibold text-primary"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(node.code);
            }
            if (isLeaf) {
              onSelect(node.code, node.name);
            }
          }}
        >
          {hasChildren ? (
            <button 
              className="p-0.5 hover:bg-muted rounded"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.code);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
          
          <span className={cn(
            "font-mono text-xs px-1.5 py-0.5 rounded",
            level === 0 ? "bg-primary/20 text-primary" : "bg-muted"
          )}>
            {node.code}
          </span>
          
          <span className={cn(
            "text-sm flex-1 truncate",
            isLeaf && "text-foreground",
            !isLeaf && "text-muted-foreground"
          )}>
            {node.name}
          </span>
          
          {isSelected && (
            <Check className="h-4 w-4 text-primary" />
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Search */}
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cuenta PGC..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 text-sm"
        />
      </div>
      
      {/* Tree */}
      <ScrollArea className="flex-1 border rounded-lg">
        <div className="p-2">
          {filteredData.map(node => renderNode(node))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default PGCAccountTree;
