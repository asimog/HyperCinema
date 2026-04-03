"use client";

import { InterfaceAdapterServiceManifest } from "@/packages/core/src/protocol";

interface AdapterBoxCardProps {
  service: InterfaceAdapterServiceManifest;
}

export function AdapterBoxCard({ service }: AdapterBoxCardProps) {
  function kindLabel(kind: string): string {
    if (kind === "hosted_checkout") return "hosted checkout";
    if (kind === "remotion") return "remotion cards";
    if (kind === "cards") return "cards deck";
    if (kind === "game_of_life") return "game of life";
    if (kind === "three_js") return "three.js";
    return kind;
  }

  return (
    <section className="hyperflow-card adapter-box-card">
      <div className="hyperflow-card-header">
        <div>
          <p className="eyebrow">Adapter Box</p>
          <h3>Plug this into any interface</h3>
        </div>
      </div>

      <p className="route-summary compact">
        {service.summary}
      </p>

      <div className="adapter-box-grid">
        <article className="rail-card">
          <p className="eyebrow">Create</p>
          <strong>{service.endpoints.createJob}</strong>
          <span>Manual SOL checkout plus MoonPay Commerce for the same packages.</span>
        </article>
        <article className="rail-card">
          <p className="eyebrow">x402</p>
          <strong>{service.endpoints.x402}</strong>
          <span>USDC settlement surface for agents and hosted interfaces.</span>
        </article>
        <article className="rail-card">
          <p className="eyebrow">Manifest</p>
          <strong>{service.endpoints.manifest}</strong>
          <span>Machine-readable service descriptor for embedders.</span>
        </article>
      </div>

      <div className="rail-card">
        <p className="eyebrow">CardsAgent</p>
        <strong>{service.cardsAgent.label}</strong>
        <span>Remotion-backed text and slide generation for anything that needs a card deck.</span>
        <div className="mini-list" style={{marginTop: 14}}>
          <article className="mini-item-card">
            <div>
              <span>{kindLabel(service.cardsAgent.kind)}</span>
              <strong>{service.cardsAgent.entrypoint}</strong>
            </div>
            <p className="route-summary compact">{service.cardsAgent.repoPath}</p>
          </article>
          <article className="mini-item-card">
            <div>
              <span>text</span>
              <strong>{service.cardsAgent.textEndpoint}</strong>
            </div>
            <p className="route-summary compact">Generates the card deck JSON used by the Remotion composition.</p>
          </article>
          <article className="mini-item-card">
            <div>
              <span>request</span>
              <strong>{service.cardsAgent.requestField}</strong>
            </div>
            <p className="route-summary compact">Optional payload field for title_page, end_page, game_of_life, or three_js.</p>
          </article>
          <article className="mini-item-card">
            <div>
              <span>render</span>
              <strong>{service.cardsAgent.renderEndpoint}</strong>
            </div>
            <p className="route-summary compact">Render-aware alias for the same deck payload.</p>
          </article>
        </div>
        <div className="mini-list" style={{marginTop: 14}}>
          {service.cardsAgent.compositions.map((composition) => (
            <article key={composition.id} className="mini-item-card">
              <div>
                <span>{kindLabel(composition.kind)}</span>
                <strong>{composition.label}</strong>
              </div>
              <p className="route-summary compact">{composition.summary}</p>
            </article>
          ))}
        </div>
        <div className="mini-list" style={{marginTop: 14}}>
          {service.cardsAgent.proposals.map((proposal) => (
            <article key={`${proposal.target}-${proposal.adapterId}`} className="mini-item-card">
              <div>
                <span>{proposal.target}</span>
                <strong>{proposal.label}</strong>
              </div>
              <p className="route-summary compact">{proposal.reason}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="mini-list">
        {service.adapters.map((adapter) => (
          <article key={adapter.id} className="mini-item-card">
            <div>
              <span>{kindLabel(adapter.kind)}</span>
              <strong>
                {adapter.label} / {adapter.currency}
              </strong>
            </div>
            <p className="route-summary compact">{adapter.endpoint}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
