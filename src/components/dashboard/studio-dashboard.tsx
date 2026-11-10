"use client";

import {
  type AgAiHarnessSetup,
  type AgAiPromptStarter,
  type AgCoreDefaultRegistry,
  type AgStudioApi,
  type AgStudioMode,
  type AgWidgetsConfig,
  AgStudioAiModule,
  createAiHarness,
  directLlmRunner,
  studioTheme,
} from "ag-studio";
import { AgStudio, AgStudioProvider, createWidgets } from "ag-studio-react";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { DashboardData } from "@/lib/dashboards/types";
import { claudeAdapter } from "./claude-adapter";
import { type BonoRegistry, PoolMeterWidget } from "./pool-meter-widget";
import { dataSources, initialReport } from "./reports";

// The nonprofit and sponsor dashboards: AG Studio with Bono's data, theme, a
// custom pool-meter widget and an AI assistant. Studio's data engine runs in
// the browser over the rows the server already scoped to this organization.

const PAGES = {
  nonprofit: [
    { id: "overview", label: "Overview" },
    { id: "gifts", label: "Every gift" },
  ],
  sponsor: [
    { id: "overview", label: "Overview" },
    { id: "boosts", label: "Boost results" },
  ],
} as const;

const STARTERS: Record<DashboardData["kind"], AgAiPromptStarter[]> = {
  nonprofit: [
    { label: "Who gives most?", prompt: "Who are my top 3 donors, and how much has each given?" },
    { label: "How much did matching add?", prompt: "How much did sponsor matches add on top of direct donations, in total and by sponsor?" },
    { label: "Chart gifts by donor", prompt: "Add a bar chart of total donations by donor to this page." },
  ],
  sponsor: [
    { label: "Where did my matches go?", prompt: "Which nonprofits received the most from my matches?" },
    { label: "How much pool is left?", prompt: "How much is left across my matching pools, and which campaign has the most?" },
    { label: "Chart matches by nonprofit", prompt: "Add a column chart of matched amounts by nonprofit to this page." },
  ],
};

// Bono's look: black and white like the rest of the app, its own font, and a
// monochrome chart palette (inverted in dark mode) so charts stay calm.
const theme = studioTheme
  .withParams(
    {
      accentColor: "#18181b",
      fontFamily: "inherit",
      borderRadius: 8,
      chartPaletteFills1Color: "#18181b",
      chartPaletteFills2Color: "#71717a",
      chartPaletteFills3Color: "#a1a1aa",
      chartPaletteFills4Color: "#3f3f46",
      chartPaletteFills5Color: "#d4d4d8",
      chartPaletteFills6Color: "#52525b",
    },
    "light",
  )
  .withParams(
    {
      accentColor: "#fafafa",
      chartPaletteFills1Color: "#fafafa",
      chartPaletteFills2Color: "#a1a1aa",
      chartPaletteFills3Color: "#71717a",
      chartPaletteFills4Color: "#d4d4d8",
      chartPaletteFills5Color: "#52525b",
      chartPaletteFills6Color: "#e4e4e7",
    },
    "dark",
  );

// The glossary the Bono agent can look things up in, so answers use Bono's real rules.
const GLOSSARY = {
  matching:
    "A sponsor funds a pool and sets a ratio (1:1 doubles a gift), a cap per gift, dates and which nonprofits or cause it covers. " +
    "When a supporter's donation fits an active campaign with pool left, Bono pays the match to the nonprofit with PayPal Payouts, once per donation.",
  donations: "Donations go straight from the supporter to the nonprofit's own PayPal account. Bono never holds donation money.",
  boosts: "A sponsor pays a fixed fee to boost a nonprofit's post for some days: it ranks higher in feeds and is always labeled 'Boosted by'.",
  badges:
    "Supporter tiers per nonprofit over the last 12 months: Rising (1st gift), Emerging (3 gifts or $100), Established (6 or $500), " +
    "Champion (12 or $1,000). Sponsors: Supporter, Partner ($250), Champion Partner ($1,000), from matches and boosts.",
} as const;

export default function StudioDashboard({ data, licenseKey }: { data: DashboardData; licenseKey: string | undefined }) {
  const studioRef = useRef<AgStudio>(null);
  const [mode, setMode] = useState<AgStudioMode>("view");
  const [page, setPage] = useState("overview");
  const dark = usePrefersDark();

  const sources = useMemo(() => dataSources(data), [data]);
  const initialState = useMemo(() => initialReport(data.kind), [data.kind]);
  const widgets = useMemo(
    () => (defaults: AgWidgetsConfig<AgCoreDefaultRegistry>) =>
      // Studio's props are typed for its default registry; the pool meter widens it.
      createWidgets<BonoRegistry>({
        additionalTypes: [
          {
            id: "pool-meter",
            label: "Pool meter",
            dataMapping: {
              used: { type: "field", supportedRoles: ["numeric"], requires: { cardinality: "one" }, required: true, aiDescription: "Amount of the pool used" },
              pool: { type: "field", supportedRoles: ["numeric"], requires: { cardinality: "one" }, required: true, aiDescription: "Total pool" },
            },
            form: (params) => params.createDefaults({ dataMappingItems: [{ key: "used", label: "Used" }, { key: "pool", label: "Pool" }] }),
            comp: PoolMeterWidget,
            defaultSize: { width: 360, height: 220 },
            minSize: { width: 220, height: 140 },
          },
        ],
        menu: [...(defaults.menu ?? []), { label: "Bono", widgetIds: ["pool-meter"] }],
      }) as unknown as AgWidgetsConfig,
    [],
  );

  const ai = useMemo<AgAiHarnessSetup>(
    () =>
      ({ api }) =>
        createAiHarness(api as AgStudioApi, ({ builtIn, tools: { studio, delegateTo, renameThread } }) => {
          const glossary = (api as AgStudioApi).defineAiTool({
            name: "explain_bono_terms",
            description: "Look up how Bono works (matching, donations, boosts, badges) before explaining a term to the user.",
            params: (s) => s.object({ topic: s.enum(Object.keys(GLOSSARY) as (keyof typeof GLOSSARY)[]) }),
            execute: ({ topic }, ctx) => ctx.success(GLOSSARY[topic]),
          });
          return {
            primary: "bono",
            promptStarters: STARTERS[data.kind],
            agents: [
              // Bono's own agent fronts the chat: it answers questions from the data itself,
              // and hands dashboard building to Studio's built-in team (lead and its specialists).
              directLlmRunner({
                id: "bono",
                name: "Bono assistant",
                description: "Answers questions about this organization's giving data.",
                adapter: claudeAdapter,
                maxTurns: 12,
                instructions: () =>
                  `You help a ${data.kind} called ${data.orgName} understand its giving on Bono. ` +
                  "For questions, look at the schema, run a query and answer in one to three short sentences with the numbers. " +
                  "Use explain_bono_terms when the user asks what something means. " +
                  "When the user wants to add, change or remove widgets or pages, delegate to the lead agent with a clear description of the request. " +
                  "Never invent numbers: if a query returns nothing, say so.",
                tools: () => [
                  studio.viewSchema(),
                  studio.viewPage(),
                  studio.executeQuery(),
                  studio.addPageFilter(),
                  studio.removePageFilter(),
                  glossary,
                  delegateTo(["lead"]),
                  renameThread(),
                ],
              }),
              ...Object.values(builtIn).map((definition) => directLlmRunner({ ...definition, adapter: claudeAdapter, maxTurns: 25 })),
            ],
          };
        }),
    [data.kind, data.orgName],
  );

  function showPage(id: string) {
    const api = studioRef.current?.api;
    if (!api) return;
    api.setState({ ...api.getState(), selectedPageId: id });
    setPage(id);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Dashboard pages" className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          {PAGES[data.kind].map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={page === p.id}
              onClick={() => showPage(p.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium focus:outline-2 focus:outline-zinc-900 dark:focus:outline-white ${
                page === p.id ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100" : "text-zinc-700 hover:text-zinc-900 dark:text-zinc-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setMode(mode === "view" ? "edit" : "view")}
          aria-pressed={mode === "edit"}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900 dark:focus:outline-white dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {mode === "view" ? "Customize & ask AI" : "Done"}
        </button>
      </div>
      <div className="ag-theme-mode h-[calc(100dvh-14rem)] min-h-[640px] overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800" data-ag-theme-mode={dark ? "dark" : "light"}>
        <AgStudioProvider licenseKey={licenseKey} modules={[AgStudioAiModule]}>
          <AgStudio
            ref={studioRef}
            style={{ height: "100%", width: "100%" }}
            theme={theme}
            data={sources}
            initialState={initialState}
            widgets={widgets}
            mode={mode}
            ai={ai}
          />
        </AgStudioProvider>
      </div>
    </div>
  );
}

const darkQuery = "(prefers-color-scheme: dark)";
function subscribeToDark(onChange: () => void) {
  const query = window.matchMedia(darkQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Follows the system light/dark setting, like the rest of Bono. */
function usePrefersDark() {
  return useSyncExternalStore(subscribeToDark, () => window.matchMedia(darkQuery).matches, () => false);
}
