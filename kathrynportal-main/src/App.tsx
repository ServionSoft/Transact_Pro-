import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PermissionRoute from "@/components/auth/PermissionRoute";
import DashboardPage from "@/pages/DashboardPage";
import ClientsPage from "@/pages/ClientsPage";
import ClientDetailPage from "@/pages/ClientDetailPage";
import AddClientPage from "@/pages/AddClientPage";
import EditClientPage from "@/pages/EditClientPage";
import ProjectsPage from "@/pages/ProjectsPage";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
import ProjectDeadlinesPrintPage from "@/pages/ProjectDeadlinesPrintPage";
import AddProjectPage from "@/pages/AddProjectPage";
import CalendarPage from "@/pages/CalendarPage";
import TasksPage from "@/pages/TasksPage";
import EmailPage from "@/pages/EmailPage";
import SettingsPage from "@/pages/SettingsPage";
import TeamMemberFormPage from "@/pages/TeamMemberFormPage";
import TeamMemberEditPage from "@/pages/TeamMemberEditPage";
import AcceptInvitePage from "@/pages/AcceptInvitePage";
import DocumentsPage from "@/pages/DocumentsPage";
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="transactpro-theme">
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route
              path="/clients"
              element={
                <PermissionRoute permission="clients.view">
                  <ClientsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/clients/new"
              element={
                <PermissionRoute permission="clients.create">
                  <AddClientPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/clients/:id"
              element={
                <PermissionRoute permission="clients.view">
                  <ClientDetailPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/clients/:id/edit"
              element={
                <PermissionRoute permission="clients.edit">
                  <EditClientPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <PermissionRoute permission="projects.view">
                  <ProjectsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/projects/new"
              element={
                <PermissionRoute permission="projects.create">
                  <AddProjectPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <PermissionRoute permission="projects.view">
                  <ProjectDetailPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/projects/:id/deadlines/print"
              element={
                <PermissionRoute permission="projects.view">
                  <ProjectDeadlinesPrintPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/projects/:id/edit"
              element={
                <PermissionRoute permission="projects.edit">
                  <AddProjectPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <PermissionRoute permission="documents.view">
                  <DocumentsPage />
                </PermissionRoute>
              }
            />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/email" element={<EmailPage />} />
            <Route
              path="/settings"
              element={
                <PermissionRoute permission="settings.access">
                  <SettingsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/settings/team-members/new"
              element={
                <PermissionRoute permission="settings.access">
                  <TeamMemberFormPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/settings/team-members/:id/edit"
              element={
                <PermissionRoute permission="settings.access">
                  <TeamMemberEditPage />
                </PermissionRoute>
              }
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
