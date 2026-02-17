import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { WorkflowStart } from './pages/WorkflowStart';
import { Chat } from './pages/Chat';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/workflow/:workflowId" element={<WorkflowStart />} />
        <Route path="/chat/:sessionId" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
