import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Cover from './pages/Cover';
import HostView from './pages/HostView';
import JoinView from './pages/JoinView';
import PlayerView from './pages/PlayerView';
import AdminView from './pages/AdminView';
import { SocketProvider } from './context/SocketContext';

function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <Routes>
          <Route path="/" element={<Cover />} />
          <Route path="/host" element={<HostView />} />
          <Route path="/join/:eventSlug" element={<JoinView />} />
          <Route path="/play/:sessionId" element={<PlayerView />} />
          <Route path="/admin" element={<AdminView />} />
        </Routes>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;
