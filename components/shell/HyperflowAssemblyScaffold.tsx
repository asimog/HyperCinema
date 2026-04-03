"use client";

import type { ReactNode } from "react";

export function HyperflowAssemblyScaffold(input: {
  leftRail?: ReactNode;
  rightRail?: ReactNode;
  children: ReactNode;
}) {
  const hasLeftRail = Boolean(input.leftRail);
  const hasRightRail = Boolean(input.rightRail);
  const layoutClassName = hasLeftRail && hasRightRail
    ? "hyperflow-layout hyperflow-layout--triple"
    : hasLeftRail || hasRightRail
      ? "hyperflow-layout hyperflow-layout--double"
      : "hyperflow-layout hyperflow-layout--main";

  return (
    <div className="hyperflow-shell">
      <div className="home-stage">
        <div className="home-stage-backdrop" aria-hidden="true" />
        <div className={`${layoutClassName} relative z-10`}>
          {hasLeftRail ? <aside className="hyperflow-left-rail">{input.leftRail}</aside> : null}
          <main className="hyperflow-main">{input.children}</main>
          {hasRightRail ? <aside className="hyperflow-right-rail">{input.rightRail}</aside> : null}
        </div>
      </div>
    </div>
  );
}
