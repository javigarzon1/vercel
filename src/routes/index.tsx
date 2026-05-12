import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Scale, Sparkles, FileCheck, FileText } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight">LexAgent</span>
          </div>
          <Link to="/agents">
            <Button>Entrar</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          Agentes de IA para tus documentos jurídicos
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Crea agentes especializados con tu propio manual de procedimientos. Rellena un formulario, obtén un informe de validación y un borrador del documento listo para usar.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link to="/agents">
            <Button size="lg">Empezar</Button>
          </Link>
        </div>

        <div className="mt-20 grid gap-6 text-left sm:grid-cols-3">
          <Feature icon={<Sparkles className="h-5 w-5" />} title="Crea tu agente">
            Define el prompt y carga tu manual como base de conocimiento.
          </Feature>
          <Feature icon={<FileCheck className="h-5 w-5" />} title="Valida con rigor">
            Detecta reservas, recomendaciones y advertencias según tus normas internas.
          </Feature>
          <Feature icon={<FileText className="h-5 w-5" />} title="Genera el borrador">
            Obtén el documento jurídico listo para enviar, descargable como PDF.
          </Feature>
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
