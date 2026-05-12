import { AVALES_KNOWLEDGE_BASE } from "./knowledge-avales";

export type FormField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "date";
  options?: string[];
  /** Sugerencias para autocompletado (datalist) */
  suggestions?: string[];
  placeholder?: string;
  required?: boolean;
  /** Texto de ayuda mostrado bajo el campo */
  help?: string;
  /** Regex de validación (para text) */
  pattern?: string;
  /** Mensaje de error si pattern falla */
  patternMessage?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
};

export type AgentTemplate = {
  id: string;
  name: string;
  description: string;
  docType: string;
  systemPrompt: string;
  knowledgeBase: string;
  formSchema: FormField[];
};

const AVALES_PROMPT = `Eres un letrado especializado en avales internacionales en CaixaBank. Tu trabajo es validar textos de avales y contragarantías internacionales conforme al manual interno de la entidad, identificar reservas, recomendaciones y advertencias, y generar borradores de documentos jurídicos correctos.

Reglas de actuación:
- Aplica con rigor las normas del manual (especialmente la Norma 74 y el régimen de reservas estándar y no estándar).
- Distingue claramente: garantía directa, contragarantía emitida, contragarantía recibida, double fronting, banco confirmador, crédito documentario, letter of indemnity.
- Identifica las reservas aplicables (legislación extranjera, nulidad de la obligación garantizada, cesión libre, valoración/documentación subjetiva, evergreen, etc.) y para cada una indica si es salvable, si requiere carta de exoneración, o si está cubierta por póliza estándar.
- Si faltan datos esenciales (legislación, idioma, vigencia, importe, partes), márcalos claramente como "DATO PENDIENTE" en lugar de inventarlos.
- Redacta en castellano formal jurídico salvo que el formulario indique inglés.
- En el informe utiliza secciones claras: Tipo de operación, Partes, Reservas, Recomendaciones, Advertencias, Nivel de riesgo orientativo.
- En el documento generado produce un borrador limpio listo para enviar a backoffice/cliente.`;

export const AVALES_TEMPLATE: AgentTemplate = {
  id: "tpl-avales-internacionales",
  name: "Avales Internacionales",
  description: "Validación y generación de avales y contragarantías internacionales según el manual de CaixaBank.",
  docType: "avales_internacionales",
  systemPrompt: AVALES_PROMPT,
  knowledgeBase: AVALES_KNOWLEDGE_BASE,
  formSchema: [
    {
      name: "posicion_caixabank",
      label: "Posición de CaixaBank",
      type: "select",
      required: true,
      options: [
        "Garantía directa",
        "Contragarantía emitida",
        "Contragarantía recibida",
        "Double fronting",
        "Banco confirmador",
        "Crédito documentario",
        "Letter of indemnity (pérdida de B/L)",
      ],
    },
    { name: "ordenante", label: "Ordenante / Cliente avalado", type: "text", required: true, minLength: 2, maxLength: 200, help: "Nombre completo o razón social del cliente avalado." },
    { name: "beneficiario", label: "Beneficiario", type: "text", required: true, minLength: 2, maxLength: 200, help: "Persona o entidad a favor de la cual se emite el aval." },
    { name: "banco_local", label: "Banco local (si aplica)", type: "text", maxLength: 200, help: "Banco emisor en el país del beneficiario en operaciones indirectas." },
    { name: "banco_contragarante", label: "Banco contragarante (si aplica)", type: "text", maxLength: 200 },
    {
      name: "importe",
      label: "Importe",
      type: "text",
      placeholder: "100.000,00",
      pattern: "^[0-9]{1,3}(?:[.\\s][0-9]{3})*(?:,[0-9]{1,2})?$|^[0-9]+(?:\\.[0-9]{1,2})?$",
      patternMessage: "Introduce un importe numérico (ej. 100.000,00 o 100000.00).",
      help: "Sólo dígitos y separadores. No incluyas el símbolo de moneda.",
      required: true,
    },
    {
      name: "moneda",
      label: "Moneda",
      type: "select",
      required: true,
      options: ["EUR", "USD", "GBP", "CHF", "JPY", "CNY", "MXN", "BRL", "AED", "SAR", "Otra"],
    },
    {
      name: "legislacion",
      label: "Legislación aplicable",
      type: "text",
      placeholder: "Española / URDG 758 / Ley extranjera...",
      suggestions: [
        "Española",
        "URDG 758 (CCI)",
        "ISP98",
        "UCP 600",
        "Inglesa",
        "Francesa",
        "Alemana",
        "Estado de Nueva York (EE.UU.)",
      ],
      help: "Si es ley extranjera, indícalo expresamente: aplica reserva.",
      required: true,
    },
    { name: "idioma", label: "Idioma del aval", type: "select", required: true, options: ["Castellano", "Inglés", "Francés", "Alemán", "Portugués", "Otro"] },
    {
      name: "vigencia",
      label: "Fecha de vencimiento",
      type: "date",
      help: "Si el aval es de duración indefinida, déjalo vacío e indícalo en notas.",
    },
    { name: "evergreen", label: "¿Cláusula evergreen?", type: "select", required: true, options: ["No", "Sí - prórrogas tácitas", "Sí - extensión a petición del beneficiario"] },
    { name: "objeto", label: "Objeto / finalidad de la garantía", type: "textarea", required: true, minLength: 5, maxLength: 1000, placeholder: "Ej. garantía de licitación, ejecución de contrato, devolución de anticipos..." },
    { name: "texto_aval", label: "Texto del aval/contragarantía a revisar", type: "textarea", required: true, minLength: 30, maxLength: 20000, placeholder: "Pega aquí el texto completo del documento", help: "Mínimo 30 caracteres. Pega el texto íntegro para una validación fiable." },
    { name: "notas", label: "Notas adicionales", type: "textarea", maxLength: 2000 },
  ],
};

const GENERIC_PROMPT = `Eres un asistente jurídico que ayuda a redactar y validar documentos jurídicos. Aplica el conocimiento proporcionado, sé riguroso y nunca inventes datos: marca como "DATO PENDIENTE" lo que falte. Devuelve siempre un informe + un documento listo para usar.`;

export const GENERIC_TEMPLATE: AgentTemplate = {
  id: "tpl-generico",
  name: "Agente jurídico genérico",
  description: "Plantilla en blanco para crear tu propio agente.",
  docType: "generico",
  systemPrompt: GENERIC_PROMPT,
  knowledgeBase: "",
  formSchema: [
    {
      name: "tipo_documento",
      label: "Tipo de documento",
      type: "text",
      required: true,
      minLength: 3,
      maxLength: 120,
      suggestions: [
        "Contrato de prestación de servicios",
        "Contrato de compraventa",
        "Acuerdo de confidencialidad (NDA)",
        "Carta de intenciones",
        "Poder notarial",
        "Reclamación extrajudicial",
        "Demanda civil",
      ],
    },
    { name: "partes", label: "Partes intervinientes", type: "textarea", required: true, minLength: 5, maxLength: 1000, help: "Una parte por línea: nombre, NIF/CIF y rol." },
    { name: "objeto", label: "Objeto / finalidad", type: "textarea", required: true, minLength: 5, maxLength: 1000 },
    { name: "datos_clave", label: "Datos clave (importes, fechas, plazos...)", type: "textarea", maxLength: 2000 },
    { name: "texto_base", label: "Texto base (opcional)", type: "textarea", maxLength: 20000 },
    { name: "notas", label: "Instrucciones adicionales para el agente", type: "textarea", maxLength: 2000 },
  ],
};

export const TEMPLATES: AgentTemplate[] = [AVALES_TEMPLATE, GENERIC_TEMPLATE];

export function getFormSchemaForDocType(docType: string): FormField[] {
  if (docType === "avales_internacionales") return AVALES_TEMPLATE.formSchema;
  return GENERIC_TEMPLATE.formSchema;
}
