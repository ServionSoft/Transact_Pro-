import { Link } from "react-router-dom";
import { ArrowRight, Clock, AlertTriangle, CheckCircle2, FolderKanban, Users, Calendar as CalendarIcon } from "lucide-react";
import { isTransactionProject, projectTypeLabel } from "@/data/mockData";
import { useAppStore } from "@/store/appStore";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const projects = useAppStore(s => s.projects);
  const transactionProjects = projects.filter(isTransactionProject);
  const clients = useAppStore(s => s.clients);
  const calendarEvents = useAppStore(s => s.calendarEvents);

  const statCards = [
    { label: "Active Projects", value: transactionProjects.filter(p => p.stage !== "Closed").length, icon: FolderKanban, color: "bg-primary text-primary-foreground" },
    { label: "Active Clients", value: clients.filter(c => c.status === "Active").length, icon: Users, color: "bg-accent text-accent-foreground" },
    { label: "Upcoming Deadlines", value: calendarEvents.filter(e => e.type === "deadline").length, icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
    { label: "Due This Week", value: 3, icon: Clock, color: "bg-info/10 text-info" },
  ];
  const todayTasks = transactionProjects
    .filter(p => p.stage !== "Closed" && p.nextStep)
    .slice(0, 6)
    .map(p => ({
      projectId: p.id,
      nextStep: p.nextStep,
      nextStepDate: p.nextStepDate,
      clientName: p.clientName,
      propertyAddress: p.propertyAddress,
      stage: p.stage,
    }));
  const upcomingDeadlines = calendarEvents
    .filter(e => e.type === "deadline")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Good morning, Kathryn" subtitle="Here's what needs your attention today." />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-lg p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted-foreground text-sm font-medium">{card.label}</span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-display font-bold text-foreground">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Steps */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-display font-semibold text-foreground">Today's Next Steps</h2>
            <Link to="/projects" className="text-sm text-accent hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {todayTasks.map((task, i) => (
              <motion.div
                key={task.projectId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/projects/${task.projectId}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.nextStep}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {task.clientName} • {task.propertyAddress}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={task.stage} type="stage" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{task.nextStepDate}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-display font-semibold text-foreground">Upcoming Deadlines</h2>
            <Link to="/calendar" className="text-sm text-accent hover:underline flex items-center gap-1">
              Calendar <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {upcomingDeadlines.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/projects/${event.projectId}`}
                  className="block px-6 py-4 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{event.propertyAddress}</p>
                  <p className="text-xs text-accent font-medium mt-1">{event.date}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Projects Quick Access */}
      <div className="mt-6 bg-card border border-border rounded-lg">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-semibold text-foreground">Active Projects</h2>
          <Link to="/projects" className="text-sm text-accent hover:underline flex items-center gap-1">
            All Projects <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-3 font-medium">Property</th>
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Stage</th>
                <th className="px-6 py-3 font-medium">Next Step</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactionProjects.filter(p => p.stage !== "Closed").map(project => (
                <tr key={project.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-6 py-3.5">
                    <Link to={`/projects/${project.id}`} className="text-sm font-medium text-foreground hover:text-accent">
                      {project.propertyAddress.split(",")[0]}
                    </Link>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{project.clientName}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{projectTypeLabel(project.type)}</td>
                  <td className="px-6 py-3.5"><StatusBadge status={project.stage} type="stage" /></td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground max-w-[200px] truncate">{project.nextStep}</td>
                  <td className="px-6 py-3.5">
                    <Link to={`/projects/${project.id}`} className="text-accent hover:underline text-sm">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
