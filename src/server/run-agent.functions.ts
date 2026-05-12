import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const runAgentInputSchema = z.object({
  systemPrompt: z.string().min(1).max(50000),
  knowledgeBase: z.string().max(200000).nullable(),
  formData: z.record(z.string().max(100), z.string().max(50000)),
  agentName: z.string().min(1).max(200),
  docType: z.string().min(1).max(100),
});

export const runAgent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => runAgentInputSchema.parse(input))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const { systemPrompt, knowledgeBase, formData, agentName, docType } = data;

    const sysParts = [
      systemPrompt,
      knowledgeBase
        ? `\n\n=== BASE DE CONOCIMIENTO (consultar para fundamentar las respuestas) ===\n${knowledgeBase}\n=== FIN DE BASE DE CONOCIMIENTO ===`
        : "",
      `\n\nEres "${agentName ?? "Agente Jurídico"}". Devuelves SIEMPRE el resultado llamando a la función \`emit_result\`. NO escribas texto fuera de la función.`,
    ].join("");

    const userParts = [
      `Tipo de documento: ${docType ?? "general"}`,
      `Datos del caso (formulario):`,
      "```json",
      JSON.stringify(formData, null, 2),
      "```",
      "",
      "Genera:",
      "1. Un INFORME de validación detallado en markdown, fundamentado en la base de conocimiento, indicando: tipo de operación detectada, reservas aplicables, recomendaciones, advertencias y nivel de riesgo.",
      "2. Un DOCUMENTO jurídico (borrador del aval / contragarantía / carta / informe según corresponda) listo para usar, con los datos del formulario incorporados, en markdown.",
    ].join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sysParts },
          { role: "user", content: userParts },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_result",
              description: "Emite el informe de validación y el documento jurídico generado.",
              parameters: {
                type: "object",
                properties: {
                  report: {
                    type: "string",
                    description: "Informe de validación en markdown.",
                  },
                  document: {
                    type: "string",
                    description: "Documento jurídico borrador en markdown.",
                  },
                },
                required: ["report", "document"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_result" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Has alcanzado el límite de peticiones, intenta de nuevo en un momento.");
      }
      if (response.status === 402) {
        throw new Error("Sin créditos disponibles. Añade fondos en Settings > Workspace > Usage.");
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("Error del modelo IA");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    if (!args) {
      console.error("No tool call in response", JSON.stringify(aiData).slice(0, 500));
      throw new Error("Respuesta inválida del modelo");
    }
    const parsed = typeof args === "string" ? JSON.parse(args) : args;

    return { report: parsed.report as string, document: parsed.document as string };
  });
