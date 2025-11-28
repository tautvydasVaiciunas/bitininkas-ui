import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

const reportTabs = [
  { to: "/reports/hives", label: "Avilių užduotys" },
  { to: "/reports/assignments", label: "Užduočių analizė" },
];

export const ReportsTabs = () => {
  return (
    <div className="mb-6">
      <nav aria-label="Ataskaitų skyriai" className="inline-flex gap-2 rounded-md border border-border bg-muted p-1">
        {reportTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
