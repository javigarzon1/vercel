import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getFormSchemaForDocType, type FormField } from "@/lib/agent-templates";
import { runAgent } from "@/server/run-agent.functions";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Download, Copy, History } from "lucide-react";

type Agent = {
  id: string;
  name: string;
  description: string | null;
  doc_type: string;
  system_prompt: string;
  knowledge_base: string | null;
};

type Validation = {
  id: string;
  created_at: string;
  report_md: string | null;
  generated_doc_md: string | null;
  input_data: Record<string, unknown>;
};

export const Route = createFileRoute("/agents/$agentId")({
  component: UseAgent,
});

function UseAgent() {
  const { agentId } = Route.useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [history, setHistory] = useState<Validation[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ report: string; document: string } | null>(null);
  const [tab, setTab] = useState<"report" | "document">("report");

  useEffect(() => {
    void load();
  }, [agentId]);

  const load = async () => {
    const { data: a, error } = await supabase
      .from("agents")
      .select("id, name, description, doc_type, system_prompt, knowledge_base")
      .eq("id", agentId)
      .single();
    if (error || !a) {
      toast.error("Agente no encontrado");
      navigate({ to: "/agents" });
      return;
    }
    setAgent(a);
    const { data: vs } = await supabase
      .from("validations")
      .select("id, created_at, report_md, generated_doc_md, input_data")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(10);
    setHistory((vs ?? []) as Validation[]);
  };

  const schema: FormField[] = agent ? getFormSchemaForDocType(agent.doc_type) : [];

  const validateField = (f: FormField, value: string): string | null => {
    const v = (value ?? "").trim();
    if (f.required && !v) return "Este campo es obligatorio.";
    if (!v) return null;
    if (f.minLength && v.length < f.minLength) return `Mínimo ${f.minLength} caracteres.`;
    if (f.maxLength && v.length > f.maxLength) return `Máximo ${f.maxLength} caracteres.`;
    if (f.pattern && !new RegExp(f.pattern).test(v)) return f.patternMessage ?? "Formato no válido.";
    if (f.type === "date" && v) {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return "Fecha no válida.";
    }
    if (f.type === "select" && f.options && !f.options.includes(v)) return "Selecciona una opción válida.";
    return null;
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = (f: FormField, value: string) => {
    setFormData((prev) => ({ ...prev, [f.name]: value }));
    setErrors((prev) => {
      const err = validateField(f, value);
      const next = { ...prev };
      if (err) next[f.name] = err;
      else delete next[f.name];
      return next;
    });
  };

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;

    const newErrors: Record<string, string> = {};
    for (const f of schema) {
      const err = validateField(f, formData[f.name] ?? "");
      if (err) newErrors[f.name] = err;
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Revisa los campos marcados antes de continuar.");
      return;
    }

    setBusy(true);
    setResult(null);
    try {
      const data = await runAgent({
        data: {
          systemPrompt: agent.system_prompt,
          knowledgeBase: agent.knowledge_base,
          formData,
          agentName: agent.name,
          docType: agent.doc_type,
        },
      });
      const r = { report: data.report, document: data.document };
      setResult(r);
      setTab("report");
      await supabase.from("validations").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        agent_id: agent.id,
        input_data: formData,
        report_md: r.report,
        generated_doc_md: r.document,
      });
      void load();
      toast.success("Listo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al ejecutar el agente");
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = (title: string, content: string) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, margin, margin);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(content.replace(/[#*`>]/g, ""), maxWidth);
    let y = margin + 24;
    const pageH = doc.internal.pageSize.getHeight() - margin;
    for (const ln of lines as string[]) {
      if (y > pageH) {
        doc.addPage();
        y = margin;
      }
      doc.text(ln, margin, y);
      y += 14;
    }
    doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  };

  const copy = async (txt: string) => {
    await navigator.clipboard.writeText(txt);
    toast.success("Copiado");
  };

  if (!agent) return null;

  return (
    <AppShell>
      <Link to="/agents" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Mis agentes
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{agent.name}</h1>
          {agent.description && <p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <form onSubmit={run} className="space-y-4 rounded-lg border bg-card p-5 h-fit">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Datos del caso</h2>
          {schema.map((f) => {
            const value = formData[f.name] ?? "";
            const err = errors[f.name];
            const listId = f.suggestions?.length ? `${f.name}-list` : undefined;
            const showCount = f.type === "textarea" && f.maxLength;
            const inputType = f.type === "number" ? "number" : f.type === "date" ? "date" : "text";
            return (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={f.name}>
                  {f.label}
                  {f.required && <span className="text-destructive"> *</span>}
                </Label>
                {f.type === "textarea" ? (
                  <Textarea
                    id={f.name}
                    rows={4}
                    required={f.required}
                    placeholder={f.placeholder}
                    maxLength={f.maxLength}
                    minLength={f.minLength}
                    value={value}
                    onChange={(e) => setField(f, e.target.value)}
                    aria-invalid={!!err}
                    className={err ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                ) : f.type === "select" ? (
                  <select
                    id={f.name}
                    required={f.required}
                    value={value}
                    onChange={(e) => setField(f, e.target.value)}
                    aria-invalid={!!err}
                    className={`flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-xs ${err ? "border-destructive" : "border-input"}`}
                  >
                    <option value="">— Seleccionar —</option>
                    {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <>
                    <Input
                      id={f.name}
                      type={inputType}
                      required={f.required}
                      placeholder={f.placeholder}
                      maxLength={f.maxLength}
                      minLength={f.minLength}
                      min={f.min}
                      max={f.max}
                      pattern={f.pattern}
                      list={listId}
                      autoComplete="off"
                      value={value}
                      onChange={(e) => setField(f, e.target.value)}
                      aria-invalid={!!err}
                      className={err ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {listId && (
                      <datalist id={listId}>
                        {f.suggestions!.map((s) => <option key={s} value={s} />)}
                      </datalist>
                    )}
                  </>
                )}
                <div className="flex items-start justify-between gap-2 text-xs">
                  <span className={err ? "text-destructive" : "text-muted-foreground"}>
                    {err ?? f.help ?? ""}
                  </span>
                  {showCount && (
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {value.length}/{f.maxLength}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <Button type="submit" className="w-full" disabled={busy || Object.keys(errors).length > 0}>
            <Sparkles className="mr-2 h-4 w-4" />
            {busy ? "Analizando..." : "Ejecutar agente"}
          </Button>
        </form>

        <div className="rounded-lg border bg-card p-5">
          {!result && !busy && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <Sparkles className="mb-2 h-6 w-6 text-primary/60" />
              Rellena el formulario y ejecuta el agente para obtener un informe y un borrador del documento.
            </div>
          )}
          {busy && (
            <div className="flex h-full min-h-64 items-center justify-center text-sm text-muted-foreground">
              El agente está analizando el caso...
            </div>
          )}
          {result && (
            <div>
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex gap-1">
                  <button
                    onClick={() => setTab("report")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "report" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                  >
                    Informe
                  </button>
                  <button
                    onClick={() => setTab("document")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "document" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                  >
                    Documento
                  </button>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copy(tab === "report" ? result.report : result.document)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      downloadPdf(tab === "report" ? "Informe de validación" : "Documento generado", tab === "report" ? result.report : result.document)
                    }
                  >
                    <Download className="mr-1.5 h-4 w-4" /> PDF
                  </Button>
                </div>
              </div>
              <article className="prose prose-sm mt-4 max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground">
                <ReactMarkdown>{tab === "report" ? result.report : result.document}</ReactMarkdown>
              </article>
            </div>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <History className="h-4 w-4" /> Historial reciente
          </h2>
          <ul className="mt-3 space-y-2">
            {history.map((v) => (
              <li key={v.id}>
                <button
                  onClick={() =>
                    setResult({ report: v.report_md ?? "", document: v.generated_doc_md ?? "" })
                  }
                  className="w-full rounded-md border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-primary/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {String(v.input_data?.["ordenante"] ?? v.input_data?.["tipo_documento"] ?? "Validación")}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
