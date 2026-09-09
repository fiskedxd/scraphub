import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/Profile';
import PublicProfilePage from './pages/PublicProfile';
import SearchPage from './pages/Search';
import SettingsPage from './pages/SettingsPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import Mita3DPage from './pages/TestMita';
import FacturesPage from './pages/Factures';
import NavBar from './components/NavBar';
import ChatPage from './pages/ChatPage';
import IntelligentPage from './pages/IntelligentSearch';
import LogsPage from './pages/Logs';
import SearcherPage from './pages/Searcher';
import GeoPage from './pages/GeoPage';
import AdminPage from './pages/AdminPage';
import PlansPage from './pages/Plans';
import ApiDocsPage from './pages/ApiDocs';
import BugReportPage from './pages/BugReport';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

function AppContent() {
  const { isBanned } = useAuth();

  useEffect(() => {
    const warning = 'WARNING DONT PASTE ANYTHING HERE - DO NOT COPY / PASTE CODE FROM UNKNOWN SOURCES';
    for (let i = 0; i < 500; i += 1) {
      console.warn(`%c${warning}`, 'font-size: 18px; color: orange; background: black; padding: 6px;');
    }
  }, []);

  if (isBanned) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="max-w-4xl text-sm leading-relaxed whitespace-pre-wrap font-mono">
{`⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠄⠂⠀⠁⠀⠀⠀⠀⠀⠀⠈⠈⠉⠁⠀⠒⠢⢄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡰⠁⠀⠀⣀⡴⠞⠋⠁⠀⠀⠀⠀⠀⠀⢀⡀⠀⠀⠀⠉⢄⠀⠀⠀⢀⠠⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠎⠀⠀⢀⣾⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣀⠈⠢⡀⠀⠀⠀⠳⡈⡔⡡⢎⡰⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡠⠃⠀⠀⢀⣠⣿⣶⣾⣿⣿⣿⣿⣿⣷⠶⡦⠃⠈⠱⡄⠈⢢⡀⠀⠀⠙⢆⠑⠊⠐⠡⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡐⠁⠀⣠⣶⣿⣿⣿⣿⣿⣽⣿⠿⠛⣯⠁⣤⡇⠀⠀⠀⢹⠀⠀⠳⣀⠀⠀⠈⠣⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⠒⠲⠒⠒⠒⠋⢀⣀⣼⣿⣿⠿⡟⢿⣿⣯⣷⣤⣾⣿⣾⣿⠀⠀⠀⠀⠨⡇⠀⢸⠘⣧⡀⠀⠀⠑⢄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡤⠤⠦⠐⠊⣹⣿⣿⣿⣿⣶⣿⣾⣿⡿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠐⡇⠀⠀⡇⢸⣧⠀⠀⠀⠈⠣⣄⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⡴⠒⠉⠁⠘⣦⣀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⠿⣿⣿⢿⣿⣿⣿⣇⠀⠀⠀⠀⣧⠀⠀⠃⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⢧⠀⠀⠀⠀⠘⢯⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢻⡄⠹⣿⣎⣹⣿⣿⣿⠀⠀⠀⠀⢹⠀⠀⣼⣿⣽⣷⠲⠤⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢡⠀⠀⠘⡆⠀⠀⢀⢄⣼⢿⣿⣿⣿⣿⠷⣻⣿⣿⣿⣿⡇⠻⣾⠛⢿⣿⡟⠛⣿⡄⠀⠀⠀⢸⡄⠀⣿⣿⣿⡿⣷⡄⠀⠀⠀⠀⢀⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠆⠀⠀⢻⠀⠀⡰⠛⠁⣸⣿⣿⣿⣿⡆⢁⣻⡿⢿⣿⣷⠀⠘⡜⠿⠋⠓⠀⣿⣇⠀⠀⠀⠀⡆⠀⢹⣿⣿⡷⢻⣿⠀⠀⠀⠀⠈⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⡄⠀⠈⣧⠀⠀⠀⠀⢹⣿⣿⣿⣿⣷⣿⢹⣿⡆⠉⠛⠷⠀⠀⠀⠁⠀⢀⣿⣿⠀⠀⠀⠀⢧⠀⢸⣿⣿⣧⠀⢹⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢱⠀⠀⠘⣧⠀⠀⠀⠘⣿⣿⣿⣿⣿⢿⠢⡛⢹⡄⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⠀⠀⠀⠀⠈⡆⢸⣿⣿⣿⡇⢸⡇⠀⠀⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣇⠀⠀⠘⢧⣀⠀⠀⢻⣿⣻⣿⣿⣷⡇⠀⠀⠀⢠⠔⣚⣡⡶⠀⠈⣼⣿⡟⠘⠀⠀⠀⠀⢱⢸⣿⣿⣿⣧⡞⠀⠀⠀⡘⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠠⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⡠⠀⠘⣆⠀⠀⠈⠻⣆⢄⠲⣙⢧⢻⣿⣿⣷⡐⢄⡀⠈⠻⡿⠟⠁⢀⣼⣿⡟⢠⡂⠀⠀⠀⠀⠘⡀⣿⣿⣿⡃⠀⠀⠀⢰⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢰⠣⢇⠳⣼⡄⠀⠀⠀⠘⢯⣚⠤⣃⣾⣿⣿⣿⣿⣶⣬⣑⣀⠀⠀⢀⣭⣿⡟⠀⢸⢡⡀⠀⠀⠀⠀⡇⢿⣿⣿⡟⠀⠀⠀⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠋⠀⠁⢹⠃⠀⠀⠀⠀⣠⣿⣼⣶⣿⣿⣿⣿⣿⣿⣿⣿⣛⣙⣾⡿⣿⡟⠀⠀⣿⠀⢧⠀⠀⠀⢰⠃⣸⣿⣿⠃⠀⠀⠠ T BANNI ⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⠀⠀⠀⠀⠊⣽⣿⣿⣿⣿⢿⣿⣿⣿⣿⣿⢿⣟⣿⣯⣿⡿⢡⠀⠀⠸⣄⠈⡇⠀⠀⣸⠀⣾⣿⠇⠀⠀⢀⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡠⠊⠀⠀⠀⠀⠀⣠⠿⣿⠟⠛⣰⣿⣿⣿⣿⣿⠾⠛⠋⢉⣩⣽⣏⠛⢦⡀⡰⠈⢳⡀⠀⢀⡏⣸⣿⣿⠀⠀⠀⢸⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢀⠔⠁⠀⠀⠀⠀⠀⠀⠁⠀⣃⢀⣤⡿⠟⣫⠟⡡⠀⢀⣴⣿⣿⣿⣿⣟⣦⠀⠙⢶⡀⠀⠹⣄⡎⣼⣿⣿⠇⠀⠀⠀⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⡔⠁⠀⠀⠀⢀⡤⠖⠒⠒⠒⠲⠄⠁⠙⣶⠟⠁⣀⣀⣴⣿⠿⣿⢿⣿⣿⣿⣿⣆⠱⡄⢳⡀⠀⣸⠸⠋⠉⠀⠀⠀⢀⡼⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⡠⠊⠀⠀⢀⣴⠚⠁⠀⠀⠀⠀⠀⢀⣀⣤⣼⠷⠚⠛⠉⠉⠀⠀⠀⠀⠀⠀⠈⠉⠛⠻⣦⣹⠀⡇⠀⡇⡃⠀⠀⠀⢀⡴⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣠⣾⣿⠁⠀⠀⣀⣠⡴⠶⠛⠉⠉⢠⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣻⢄⡇⢰⢁⠇⠀⠀⢀⣾⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣿⣿⣯⡴⠾⠛⠉⠁⠀⠀⠀⠀⠀⣸⣇⠐⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⠘⣧⠝⣸⠀⠀⠀⣸⠏⡘⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢻⠏⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⡇⣿⣎⠤⡀⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⠐⡼⢠⣿⣇⠃⠀⠀⢀⣿⠀⠀⠀⠀⠀⠀⠐⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢠⡟⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡴⢏⣼⠟⣙⡛⠶⣧⣴⣤⣂⠴⣀⠆⣄⠢⢄⡉⢆⡽⢃⢎⡇⡽⠀⠀⠀⡾⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠸⡇⠀⠀⠀⠀⠀⠀⠀⡀⡰⢎⣵⡟⠁⠈⠁⢳⡀⠀⠀⠉⠙⠲⠅⠺⠤⠛⠶⠿⠚⠋⢁⡼⠰⠁⠀⠀⢰⠁⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢻⣤⠠⡐⡀⠆⣌⢢⢱⣡⡿⠋⠀⠀⢸⠀⠀⠹⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡞⣠⠃⠀⠀⢠⠏⠀⠀⠀⠀⠀⠀⠈⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠹⢧⣇⣹⣸⣄⢿⡼⢿⡄⠀⠀⠀⢸⡀⠀⠀⠸⣇⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡼⠁⡉⠀⠀⠀⡈⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢄⠀⠀⠀⠉⠉⠉⠉⠉⠀⢸⡇⠀⠀⠀⢸⠅⠀⠀⠀⠈⠓⠀⠀⠀⠀⠀⠀⠀⠀⢴⠁⠀⡇⠀⠀⠀⢹⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢶⡹⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⡀⠀⠀⠀⠀⠘⣧⠀⠀⠀⠈⣧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠑⣄⠳⡀⠀⠀⠀⠳⡀⠐⡈⠤⢁⠀⠀⠀⠀⠀⠀⠃⠐⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠑⠤⡀⠀⠀⢹⡆⡁⠀⠀⢿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢦⠘⡄⠀⠀⠀⠙⠲⣥⢓⠠⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⢒
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⡄⠀⠀⢻⡄⠀⠀⠘⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢧⡘⠦⡀⠀⠀⠀⠈⠛⢤⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡄⢂⡾
⠀⠀⠀⠀⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡇⠀⠀⠀⣿⠀⠀⠀⢳⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠐⠮⣑⠢⣄⠀⠀⠀⠉⠢⣀⠀⠀⠀⠀⠄⠀⠀⠀⠀⠀⠀⠀⠀⠈⣴⢫⣿
⠀⠀⠀⠀⢀⠐⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⠀⠀⠐⡘⣧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⣇⣤⡖⠦⡀⠀⠀⠈⠢⡀⠀⠀⠐⠀⠀⠀⠀⠀⠀⠀⠀⠀⢞⡽⢞
⠀⠀⠀⡀⢂⠌⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⢀⠀⠀⠀⠘⢷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⠟⠋⠀⠙⢦⡘⠲⡄⠀⠀⠈⠢⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡀⢉⠘⠌
⠀⠀⢢⡑⢌⡐⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡇⢂⠀⠀⠀⠈⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠠⣽⠟⠁⠀⠀⠀⠀⠀⠉⢢⡘⢦⡀⠀⠀⠑⢄⠀⠀⠀⠀⠀⠦⡙⢧⠜⡠⡀⠄
⢀⠌⡰⢈⠆⡐⢂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⣷⠈⡀⠀⠀⠀⠹⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠊⣾⠋⠀⡴⠀⠀⠀⠀⠀⠀⠀⠙⢆⠙⣄⠀⠀⠀⠣⡀⠀⠀⠀⠀⠈⠀⠫⡴⣙⢮
⣎⢢⡑⢌⠢⢁⠆⡐⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣟⡄⠐⠀⠀⠀⠀⠐⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⢆⣿⠃⢀⠎⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢣⡈⢣⠀⠀⠀⠱⠀⠀⠀⠀⠀⠀⠀⠹⠙⠞
⢧⡒⡌⢢⠁⠆⡂⠔⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣇⡌⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⠎⣼⠃⡠⠊⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢳⡀⢣⠀⠀⠀⠱⡀⠀⠀⠀⠀⠀⠀⠀⠀
⢣⠳⡌⢅⠊⡔⢡⠈⠄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡎⠻⣟⣦⡁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠏⣼⠃⣠⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢧⠀⢇⠀⠀⠈⡅⠀⠀⠀⠀⠀⠀⠀⠀
⠀⢋⠜⣈⠒⡌⢢⢉⡐⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⠀⠙⣷⡻⣄⠁⡀⠀⠀⠀⠀⠀⠀⠀⡜⣴⠇⢀⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⡆⠸⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠈⠀⠱⣈⢇⡒⠌⣂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣧⡀⠈⢿⣯⡷⣤⠑⡈⢄⠀⠀⠀⡘⢰⡟⠀⣸⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡇⠀⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠐⠐⡎⠴⡁⠆⡄⠀⠀⠀⠀⠀⠀⠀⠀⢀⣸⠁⠙⠲⢄⡙⢿⣎⡳⢥⣆⠂⠤⢚⣰⣿⠀⢀⡟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡗⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠈⠱⢈⠒⠄⠀⠀⠀⠀⠀⠀⠀⣠⠞⠁⠀⠀⠀⠀⠙⢦⣙⠿⣷⣦⣶⣾⣿⣿⡇⠀⣼⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠇⠀⠂⠀⠀⠈⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠌⠂⠀⠀⠀⠀⠀⠀⠀⣴⠫⠀⠀⠀⠀⠀⢀⠀⠀⠉⠳⢽⣿⣿⣿⣿⣿⡇⣰⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⠀⠀⠀⡆⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⠏⠀⠀⠀⠀⠀⠐⠇⠊⠀⠀⠀⠀⠙⢻⢻⣿⣿⣷⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡄⢠⠃⠀⠀⢰⠇⠀⠀⠀⠀⡀⢀⡀⡀
⡀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠄⠀⠀⢠⣿⣶⣾⣶⣶⣶⣶⣶⣤⣄⡀⠀⠀⠀⠀⣨⢧⢋⣿⠁⡀⣀⣀⣤⣤⣤⣤⣤⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣣⢸⠀⠀⠀⡸⠀⠀⠠⠠⡑⢌⠣⡜⠡
⡓⠄⠂⠀⠀⠀⠀⠀⠀⠀⠀⡎⠀⠀⢠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⣔⡻⣙⢎⣿⢣⣽⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣦⣄⡀⠀⠀⠀⢀⡏⣤⠀⠀⠀⡅⠀⠀⠀⠀⠀⠀⠠⢀⠁
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣭⢎⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⡀⢀⡿⠀⡇⠀⠀⢠⠀⠀⠀⠀⠀⠀⠀⠁⢎⡒
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⠃⠀⢠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡙⡝⠁⢸⠁⠀⠀⢸⠀⠀⠀⠀⠀⠀⠀⠀⠀⠃
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⠀⠀⠙⠛⠛⠻⠿⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⠘⣠⠏⠀⠀⢠⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠣⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠉⠛⠛⠻⠿⠿⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡏⢸⠁⠀⠀⢀⠎⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢄⠠⠀⠀⠀⠀⠠⡄⠀⠀⠉⠉⠒⠂⠀⠀⠀⠠⠀⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠉⠛⠛⠛⠿⠿⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠇⡇⠀⠀⠀⡏⠀⠀⢀⢂⠡⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠌⡀⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢘⣿⣿⣿⣶⣶⣶⡤⠤⢤⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠉⠙⠛⠛⠛⠿⠿⠰⠀⠀⠀⣸⠃⠀⠀⢠⢊⠴⡁⠀⠀⠀⠀⠀⠀
⠀⠈⢆⡁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢈⣿⣿⣿⡳⠌⡌⠁⠐⠀⠠⣭⣏⠉⠈⠑⣲⡖⠤⠤⠤⢀⢀⡀⠀⠀⠀⠀⠀⠀⠀⠀⣰⠏⠀⡀⢠⠂⠎⢆⠡⠀⠀⠀⠀⠀⠀
⠀⠈⠄⠢⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢞⡿⣿⣧⡁⠀⠀⢀⠀⡐⢏⠏⠀⠀⠀⣿⢇⠀⠀⠀⠀⠀⠀⠉⠉⠑⠒⠒⠶⠶⣞⡡⢂⠣⠜⠁⠈⠀⠀⠀⠀⠀⠀⠀⠀⠀`}
          <div className="mt-6 text-center text-white/70">Ton compte a été banni. Si tu penses que c'est une erreur, contacte l'administrateur.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/bug-report" element={<BugReportPage />} />
        <Route path="/u/:username" element={<PublicProfilePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/docs" element={<ApiDocsPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/GeoPage" element={<GeoPage />} />
        <Route path="/mita" element={<Mita3DPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/intelligent" element={<IntelligentPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/factures" element={<FacturesPage />} />
        <Route path="/searcher" element={<SearcherPage />} />
        <Route path="/kazake/slyre/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}