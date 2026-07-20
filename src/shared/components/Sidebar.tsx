export type PageKey = 'projects' | 'people';

type SidebarProps = {
  active: PageKey;
  onNavigate: (page: PageKey) => void;
};

const ProjectsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const PeopleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const NAV_ITEMS: { key: PageKey; label: string; Icon: () => React.JSX.Element }[] = [
  { key: 'projects', label: 'Projects', Icon: ProjectsIcon },
  { key: 'people', label: 'People', Icon: PeopleIcon },
];

const Sidebar = ({ active, onNavigate }: SidebarProps) => (
  <nav
    style={{
      width: 240,
      flexShrink: 0,
      background: '#16161a',
      borderRight: '1px solid #2e2e34',
      minHeight: '100vh',
      padding: '24px 16px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      textAlign: 'left',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}
  >
    {/* Brand */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 24px' }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#6c47ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: 15,
          flexShrink: 0,
        }}
      >
        N
      </div>
      <span style={{ color: '#e7e7ea', fontWeight: 600, fontSize: 16 }}>NPX Innovation</span>
    </div>

    {/* Nav items */}
    {NAV_ITEMS.map(({ key, label, Icon }) => {
      const isActive = active === key;
      return (
        <button
          key={key}
          type="button"
          onClick={() => onNavigate(key)}
          aria-current={isActive ? 'page' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            background: isActive ? '#6c47ff' : 'transparent',
            color: isActive ? '#fff' : '#9b9ba3',
            border: 'none',
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <Icon />
          {label}
        </button>
      );
    })}
  </nav>
);

export default Sidebar;
