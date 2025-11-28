import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

export const ReportsTabs = () => (
  <div className="flex gap-2 border-b border-border/60 pb-3">
    <NavLink
      to="/reports/hives"
      className={({ isActive }) =>
        cn(
          "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
          isActive
            ? "bg-foreground text-white"
            : "bg-muted/40 text-muted-foreground hover:bg-muted/70",
        )
      }
    >
      Avilių užduotys
    </NavLink>
    <NavLink
      to="/reports/assignments"
      className={({ isActive }) =>
        cn(
          "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
          isActive
            ? "bg-foreground text-white"
            : "bg-muted/40 text-muted-foreground hover:bg-muted/70",
        )
      }
    >
      Užduočių analizė
    </NavLink>
    <NavLink
      to="/reports/calendar"
      className={({ isActive }) =>
        cn(
          "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
          isActive
            ? "bg-foreground text-white"
            : "bg-muted/40 text-muted-foreground hover:bg-muted/70",
        )
      }
      >
        Kalendorius
      </NavLink>
    <NavLink
      to="/reports/users"
      className={({ isActive }) =>
        cn(
          "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
          isActive
            ? "bg-foreground text-white"
            : "bg-muted/40 text-muted-foreground hover:bg-muted/70",
        )
      }
    >
      Vartotojų suvestinė
    </NavLink>
  </div>
);
