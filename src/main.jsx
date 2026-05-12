import './styles/tailwind.css';
import { createRoot } from 'react-dom/client';
import TapnowApp from './legacy/TapnowStudio.jsx';

createRoot(document.getElementById('root')).render(<TapnowApp />);
