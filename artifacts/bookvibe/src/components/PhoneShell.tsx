import { ReactNode } from "react";

export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <div className="phone-shell">
        {children}
      </div>
    </div>
  );
}
