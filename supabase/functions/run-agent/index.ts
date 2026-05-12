// Edge function: run-agent
// Receives { systemPrompt, knowledgeBase, formData, agentName } and returns
// { report, document } using Lovable AI Gateway.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { systemPrompt, knowledgeBase, formData, agentName, docType } = await req.json();

    if (!systemPrompt || !formData) {
      return new Response(JSON.stringify({ error: "Missing systemPrompt or formData" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        return new Response(
          JSON.stringify({ error: "Has alcanzado el límite de peticiones, intenta de nuevo en un momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Sin créditos disponibles. Añade fondos en Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Error del modelo IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    if (!args) {
      console.error("No tool call in response", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "Respuesta inválida del modelo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = typeof args === "string" ? JSON.parse(args) : args;

    return new Response(
      JSON.stringify({ report: parsed.report, document: parsed.document }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("run-agent error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
