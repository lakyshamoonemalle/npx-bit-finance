import { useState } from 'react';
import ProjectPage from './app/pages/project/ProjectPage';
import PeoplePage from './app/pages/people/PeoplePage';
import Sidebar, { type PageKey } from './shared/components/Sidebar';

function App() {
  const [page, setPage] = useState<PageKey>('projects');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#121214' }}>
      <Sidebar active={page} onNavigate={setPage} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {page === 'projects' ? <ProjectPage /> : <PeoplePage />}
      </div>
    </div>
  );
}

export default App;
