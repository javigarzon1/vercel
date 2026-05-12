import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TEMPLATES, AVALES_TEMPLATE, GENERIC_TEMPLATE } from "@/lib/agent-templates";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

type Search = { template?: string };

export const Route = createFileRoute("/agents/new")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    template: typeof s.template === "string" ? s.template : undefined,
  }),
  component: NewAgent,
});

function NewAgent() {
  const navigate = useNavigate();
  const { template } = Route.useSearch();

  const tpl = TEMPLATES.find((t) => t.id === template) ?? GENERIC_TEMPLATE;

  const [name, setName] = useState(tpl.name);
  const [description, setDescription] = useState(tpl.description);
  const [docType, setDocType] = useState(tpl.docType);
  const [systemPrompt, setSystemPrompt] = useState(tpl.systemPrompt);
  const [knowledgeBase, setKnowledgeBase] = useState(tpl.knowledgeBase);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase
      .from("agents")
      .insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        name: name.trim(),
        description: description.trim() || null,
        doc_type: docType,
        system_prompt: systemPrompt,
        knowledge_base: knowledgeBase || null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Agente creado");
    navigate({ to: "/agents/$agentId", params: { agentId: data.id } });
  };

  return (
    <AppShell>
      <Link to="/agents" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Crear agente</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Empieza desde una plantilla o personaliza el prompt y la base de conocimiento.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setName(t.name);
              setDescription(t.description);
              setDocType(t.docType);
              setSystemPrompt(t.systemPrompt);
              setKnowledgeBase(t.knowledgeBase);
            }}
            className={`rounded-md border px-3 py-1.5 text-xs ${
              docType === t.docType ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-5 rounded-lg border bg-card p-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre del agente</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Descripción</Label>
          <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="docType">Tipo de documento</Label>
          <select
            id="docType"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            <option value={AVALES_TEMPLATE.docType}>Avales internacionales (formulario especializado)</option>
            <option value={GENERIC_TEMPLATE.docType}>Genérico (formulario general)</option>
          </select>
          <p className="text-xs text-muted-foreground">Determina qué campos verá el formulario al usar el agente.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prompt">Prompt de sistema</Label>
          <Textarea id="prompt" required rows={8} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
          <p className="text-xs text-muted-foreground">Instrucciones que recibe el agente en cada ejecución.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kb">Base de conocimiento (opcional)</Label>
          <Textarea id="kb" rows={6} value={knowledgeBase} onChange={(e) => setKnowledgeBase(e.target.value)} placeholder="Pega aquí el manual o normativa que el agente debe consultar..." />
          <p className="text-xs text-muted-foreground">
            {knowledgeBase.length > 0 ? `${knowledgeBase.length.toLocaleString()} caracteres` : "El agente solo usará el prompt si lo dejas vacío."}
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Link to="/agents"><Button type="button" variant="outline">Cancelar</Button></Link>
          <Button type="submit" disabled={busy}>{busy ? "Creando..." : "Crear agente"}</Button>
        </div>
      </form>
    </AppShell>
  );
}
