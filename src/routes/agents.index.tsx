import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { TEMPLATES } from "@/lib/agent-templates";

export const Route = createFileRoute("/agents/")({
  component: AgentsList,
});

type Agent = {
  id: string;
  name: string;
  description: string | null;
  doc_type: string;
  created_at: string;
};

function AgentsList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("agents")
      .select("id, name, description, doc_type, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setAgents(data ?? []);
    setLoading(false);
  };

  const deleteAgent = async (id: string) => {
    if (!confirm("¿Eliminar este agente y su historial?")) return;
    const { error } = await supabase.from("agents").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Agente eliminado");
      void loadAgents();
    }
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mis agentes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agentes IA especializados en tus documentos jurídicos.
          </p>
        </div>
        <Link to="/agents/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Crear agente
          </Button>
        </Link>
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-muted-foreground">Cargando...</p>
      ) : agents.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed bg-card p-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 font-semibold">Aún no tienes agentes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Empieza desde una plantilla o crea uno desde cero.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            {TEMPLATES.map((t) => (
              <Link key={t.id} to="/agents/new" search={{ template: t.id }}>
                <Button variant="outline">{t.name}</Button>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {agents.map((a) => (
            <li key={a.id} className="group rounded-lg border bg-card p-5 transition-colors hover:border-primary/50">
              <div className="flex items-start justify-between gap-3">
                <Link to="/agents/$agentId" params={{ agentId: a.id }} className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">{a.name}</h3>
                  </div>
                  {a.description && <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{a.description}</p>}
                  <p className="mt-3 text-xs text-muted-foreground">{a.doc_type.replaceAll("_", " ")}</p>
                </Link>
                <button
                  onClick={() => deleteAgent(a.id)}
                  className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
