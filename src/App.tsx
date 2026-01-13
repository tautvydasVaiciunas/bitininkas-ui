import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Hives from "./pages/Hives";
import HiveDetail from "./pages/HiveDetail";
import Tasks from "./pages/Tasks";
import TaskDetail from "./pages/TaskDetail";
import TaskRun from "./pages/TaskRun";
import TaskPreview from "./pages/TaskPreview";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import ReportsHives from "./pages/reports/ReportsHives";
import ReportsAssignments from "./pages/reports/ReportsAssignments";
import AdminUsers from "./pages/admin/Users";
import AdminGroups from "./pages/admin/Groups";
import AdminSteps from "./pages/admin/Steps";
import AdminTasks from "./pages/admin/Tasks";
import AdminTemplates from "./pages/admin/Templates";
import AdminNews from "./pages/admin/News";
import AdminStoreProducts from "./pages/admin/StoreProducts";
import StoreOrders from "./pages/admin/StoreOrders";
import StoreOrderDetails from "./pages/admin/StoreOrderDetails";
import { AdminStoreLayout } from "./pages/admin/AdminStoreLayout";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminEmailTest from "./pages/admin/EmailTest";
import StoreHome from "./pages/store/StoreHome";
import StoreProductDetail from "./pages/store/StoreProductDetail";
import StoreCart from "./pages/store/StoreCart";
import StoreCheckout from "./pages/store/StoreCheckout";
import StoreSuccess from "./pages/store/StoreSuccess";
import StoreMyOrders from "./pages/store/StoreMyOrders";
import NotFound from "./pages/NotFound";
import SupportChat from "./pages/SupportChat";
import HelpFaq from "./pages/HelpFaq";
import { appRoutes } from "@/lib/routes";

if (typeof (QueryClient as any).prototype.defaultQueryOptions !== "function") {
  (QueryClient as any).prototype.defaultQueryOptions = function (options?: object) {
    const defaults = (this as any).options?.defaultOptions ?? {};
    return {
      ...defaults,
      ...options,
    };
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
      refetchOnWindowFocus: false,
    },
  },
});

const RedirectToNews = () => <Navigate to={appRoutes.news} replace />;
const RedirectToNewsDetail = () => {
  const { id } = useParams<{ id?: string }>();
  return id ? <Navigate to={appRoutes.newsDetail(id)} replace /> : <Navigate to={appRoutes.news} replace />;
};

const RedirectToHives = () => <Navigate to={appRoutes.hives} replace />;
const RedirectToHivesDetail = () => {
  const { id } = useParams<{ id?: string }>();
  return id ? <Navigate to={appRoutes.hiveDetail(id)} replace /> : <Navigate to={appRoutes.hives} replace />;
};

const RedirectToTasks = () => <Navigate to={appRoutes.tasks} replace />;
const RedirectToTaskDetail = () => {
  const { id } = useParams<{ id?: string }>();
  return id ? <Navigate to={appRoutes.taskDetail(id)} replace /> : <Navigate to={appRoutes.tasks} replace />;
};

const RedirectToTaskPreview = () => {
  const { assignmentId } = useParams<{ assignmentId?: string }>();
  return assignmentId
    ? <Navigate to={appRoutes.taskPreview(assignmentId)} replace />
    : <Navigate to={appRoutes.tasks} replace />;
};

const RedirectToTaskRun = () => {
  const { id } = useParams<{ id?: string }>();
  return id ? <Navigate to={appRoutes.taskRun(id)} replace /> : <Navigate to={appRoutes.tasks} replace />;
};

const RedirectToSupport = () => <Navigate to={appRoutes.support} replace />;
const RedirectToProfile = () => <Navigate to={appRoutes.profile} replace />;
const RedirectToFaq = () => <Navigate to={appRoutes.faq} replace />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <CartProvider>
            <Routes>
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/forgot" element={<ForgotPassword />} />
                <Route path="/auth/reset" element={<ResetPassword />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Navigate to={appRoutes.news} replace />} />
                <Route path="/news" element={<RedirectToNews />} />
                <Route path={appRoutes.news} element={<News />} />
                <Route path="/news/:id" element={<RedirectToNewsDetail />} />
                <Route path={`${appRoutes.news}/:id`} element={<NewsDetail />} />
                <Route path="/parduotuve" element={<StoreHome />} />
                <Route path="/parduotuve/produktas/:slug" element={<StoreProductDetail />} />
                <Route path="/parduotuve/krepselis" element={<StoreCart />} />
                <Route path="/parduotuve/uzsakymas" element={<StoreCheckout />} />
                <Route path="/parduotuve/sekme" element={<StoreSuccess />} />
                <Route path="/parduotuve/uzsakymai" element={<StoreMyOrders />} />
                <Route path="/hives" element={<RedirectToHives />} />
                <Route path="/avilai" element={<RedirectToHives />} />
                <Route path={appRoutes.hives} element={<Hives />} />
                <Route path="/hives/:id" element={<RedirectToHivesDetail />} />
                <Route path="/avilai/:id" element={<RedirectToHivesDetail />} />
                <Route path={`${appRoutes.hives}/:id`} element={<HiveDetail />} />
                <Route path="/tasks" element={<RedirectToTasks />} />
                <Route path={appRoutes.tasks} element={<Tasks />} />
                <Route path="/tasks/:id" element={<RedirectToTaskDetail />} />
                <Route path={`${appRoutes.tasks}/:id`} element={<TaskDetail />} />
                <Route path="/tasks/:assignmentId/preview" element={<RedirectToTaskPreview />} />
                <Route path={`${appRoutes.tasks}/:assignmentId/preview`} element={<TaskPreview />} />
                <Route path="/tasks/:id/run" element={<RedirectToTaskRun />} />
                <Route path={`${appRoutes.tasks}/:id/run`} element={<TaskRun />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<RedirectToProfile />} />
                <Route path={appRoutes.profile} element={<Profile />} />
                <Route path="/messages" element={<RedirectToSupport />} />
                <Route path="/support" element={<RedirectToSupport />} />
                <Route path={appRoutes.support} element={<SupportChat />} />
                <Route path="/duk" element={<HelpFaq />} />
                <Route path="/faq" element={<RedirectToFaq />} />
                <Route path="/reports" element={<Navigate to="/reports/hives" replace />} />
                <Route path="/reports/hives" element={<ReportsHives />} />
                <Route path="/reports/assignments" element={<ReportsAssignments />} />
                <Route
                  element={
                    <ProtectedRoute allowedRoles={["admin", "manager"]} redirectTo="/" />
                  }
                >
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/groups" element={<AdminGroups />} />
                  <Route path="/admin/steps" element={<AdminSteps />} />
                  <Route path="/admin/tasks" element={<AdminTasks />} />
                  <Route path="/admin/templates" element={<AdminTemplates />} />
                  <Route path="/admin/news" element={<AdminNews />} />
                  <Route path="/admin/support" element={<AdminSupport />} />
                  <Route path="/admin/email-test" element={<AdminEmailTest />} />
                  <Route path="/admin/store" element={<AdminStoreLayout />}>
                    <Route path="products" element={<AdminStoreProducts />} />
                    <Route path="orders" element={<StoreOrders />} />
                    <Route path="orders/:id" element={<StoreOrderDetails />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </CartProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
