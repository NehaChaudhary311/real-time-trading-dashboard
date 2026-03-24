interface DashboardProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export default function Dashboard({ sidebar, children }: DashboardProps) {
  return (
    <div className="app-body">
      <aside className="sidebar">{sidebar}</aside>
      <main className="main-area">{children}</main>
    </div>
  );
}
