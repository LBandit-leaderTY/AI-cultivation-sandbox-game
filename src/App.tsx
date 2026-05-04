import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ThemeSelect from './pages/ThemeSelect';
import CharacterCreate from './pages/CharacterCreate';
import Game from './pages/Game';
import Settings from './pages/Settings';
import SaveLoad from './pages/SaveLoad';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/theme" element={<ThemeSelect />} />
        <Route path="/saves" element={<SaveLoad />} />
        <Route path="/character" element={<CharacterCreate />} />
        <Route path="/game" element={<Game />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;