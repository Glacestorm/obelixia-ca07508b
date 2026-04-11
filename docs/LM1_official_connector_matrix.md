# LM1 — Official Connector Matrix

## Fecha: 2026-04-11

| artifact_type | official_channel | organism | auth_required | certificate_required | direct_connector_possible | implemented_now | channel_type | remaining_blockers |
|---------------|-----------------|----------|---------------|---------------------|--------------------------|----------------|-------------|-------------------|
| AFI Alta/Baja/Variación | Sistema RED / SILTRA | TGSS | Autorización RED | Certificado electrónico | **No** | Handoff + parser | `assisted_handoff` | Credencial RED, WinSuite32, formato FAN |
| TA2 | Sistema RED / SILTRA | TGSS | Autorización RED | Certificado electrónico | **No** | Handoff + parser | `assisted_handoff` | Credencial RED, WinSuite32 |
| Bases cotización | Sistema RED / SILTRA | TGSS | Autorización RED | Certificado electrónico | **No** | Handoff + parser | `assisted_handoff` | Credencial RED, WinSuite32 |
| RLC | Sistema RED | TGSS | Autorización RED | Certificado electrónico | **No** | Handoff + parser | `assisted_handoff` | Credencial RED |
| RNT | Sistema RED | TGSS | Autorización RED | Certificado electrónico | **No** | Handoff + parser | `assisted_handoff` | Credencial RED |
| CRA | Sistema RED | TGSS | Autorización RED | Certificado electrónico | **No** | Handoff + parser | `assisted_handoff` | Credencial RED |
| Contrato alta | Contrat@ web/XML | SEPE | Autorización Contrat@ | Certificado/DNIe | **Parcial** (WS XML) | Handoff XML + parser | `assisted_handoff` | Credencial Contrat@ |
| Contrato baja | Contrat@ web/XML | SEPE | Autorización Contrat@ | Certificado/DNIe | **Parcial** (WS XML) | Handoff XML + parser | `assisted_handoff` | Credencial Contrat@ |
| Certificado empresa | Certific@2 | SEPE | Autorización Contrat@ | Certificado digital | **No** | Handoff + parser | `assisted_handoff` | Sin API pública |
| Modelo 111 (mensual) | Sede Electrónica AEAT | AEAT | Certificado/Cl@ve | Certificado electrónico | **No** | Formato BOE + handoff | `assisted_handoff` | Certificado, formato BOE |
| Modelo 111 (trimestral) | Sede Electrónica AEAT | AEAT | Certificado/Cl@ve | Certificado electrónico | **No** | Formato BOE + handoff | `assisted_handoff` | Certificado, formato BOE |
| Modelo 190 (anual) | Sede Electrónica AEAT | AEAT | Certificado/Cl@ve | Certificado electrónico | **No** | Formato BOE + handoff | `assisted_handoff` | Certificado, formato BOE |

## Leyenda

- **direct_connector_possible**: `No` = no existe API REST/SOAP accesible; `Parcial` = existe protocolo pero sin credenciales
- **implemented_now**: tipo de implementación actual (handoff, parser, formato)
- **channel_type**: `assisted_handoff` = el operador ejecuta el envío manualmente siguiendo instrucciones del sistema
