import { AuthProvider } from './contexts/AuthContext';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Trading from './components/Trading';
import Deposit from './pages/Deposit';
import Market from './pages/Market';
import Header from './components/header/Header';
import ForgotPassword from './pages/ForgotPassword';
import Login from './pages/Login';
import Register from './pages/Register';

// Admin components
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import PairManagement from './pages/admin/PairManagement';
import AllDeposits from './pages/admin/AllDeposits';
import UserDeposits from './pages/admin/UserDeposits';
import AllUsers from './pages/admin/AllUsers';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-wrapper">
          <Header />
          <Routes>
            {/* Main app routes */}
            <Route 
              path="/trading/:id" 
              element={
                <PrivateRoute>
                  <Trading />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/deposit" 
              element={
                <PrivateRoute>
                  <Deposit />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/market" 
              element={
                <PrivateRoute>
                  <Market />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/" 
              element={
                <PrivateRoute>
                  <Market />
                </PrivateRoute>
              } 
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Admin routes */}
            <Route 
              path="/admin/dashboard" 
              element={
                <PrivateRoute admin={true}>
                  <AdminLayout title="Admin Dashboard">
                    <Dashboard />
                  </AdminLayout>
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin/pair-management" 
              element={
                <PrivateRoute admin={true}>
                  <AdminLayout title="Pair Management">
                    <PairManagement />
                  </AdminLayout>
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin/deposits" 
              element={
                <PrivateRoute admin={true}>
                  <AdminLayout title="Deposit Management">
                    <AllDeposits />
                  </AdminLayout>
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin/deposits/:userId" 
              element={
                <PrivateRoute admin={true}>
                  <AdminLayout title="User Deposits">
                    <UserDeposits />
                  </AdminLayout>
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <PrivateRoute admin={true}>
                  <AdminLayout title="User Management">
                    <AllUsers />
                  </AdminLayout>
                </PrivateRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App; 