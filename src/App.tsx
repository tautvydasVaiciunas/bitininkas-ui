import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Hives from "./pages/Hives";
import HiveDetail from "./pages/HiveDetail";
import Tasks from "./pages/Tasks";
import TaskDetail from "./pages/TaskDetail";
import TaskRun from "./pages/TaskRun";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
import AdminUsers from "./pages/admin/Users";
import AdminGroups from "./pages/admin/Groups";
import AdminSteps from "./pages/admin/Steps";
import AdminTasks from "./pages/admin/Tasks";
import AdminTemplates from "./pages/admin/Templates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth/forgot" element={<ForgotPassword />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/hives" element={<Hives />} />
            <Route path="/hives/:id" element={<HiveDetail />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/tasks/:id/run" element={<TaskRun />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/groups" element={<AdminGroups />} />
            <Route path="/admin/steps" element={<AdminSteps />} />
            <Route path="/admin/tasks" element={<AdminTasks />} />
            <Route path="/admin/templates" element={<AdminTemplates />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
