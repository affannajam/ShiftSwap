import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FluidBackground from './FluidBackground';

function App() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ branchCode: '', roleType: '', email: '', password: '' });
  const [user, setUser] = useState(null);

  // --- NEW: Live Data States ---
  const [myShifts, setMyShifts] = useState([]);
  const [availableTrades, setAvailableTrades] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);

  // --- NEW: Fetch Data when Dashboard Loads ---
  const loadDashboardData = async () => {
    if (!user) return;
    try {
      if (user.is_manager === 1) {
        // Fetch Manager Data
        const res = await fetch(`http://localhost:3001/api/trades/pending/${user.branch_id}`);
        const data = await res.json();
        if (data.success) setPendingApprovals(data.trades);
      } else {
        // Fetch Employee Data
        const resShifts = await fetch(`http://localhost:3001/api/shifts/mine/${user.id}`);
        const dataShifts = await resShifts.json();
        if (dataShifts.success) setMyShifts(dataShifts.shifts);

        const resTrades = await fetch(`http://localhost:3001/api/trades/available/${user.branch_id}/${user.id}`);
        const dataTrades = await resTrades.json();
        if (dataTrades.success) setAvailableTrades(dataTrades.trades);
      }
    } catch (err) {
      console.error("Failed to load dashboard data");
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // --- NEW: Action Functions ---
  const requestSwap = async (shiftId) => {
    await fetch('http://localhost:3001/api/trades/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shiftId: shiftId, requesterId: user.id })
    });
    alert("Shift posted to the Trade Pool!");
    loadDashboardData(); // Refresh UI
  };

  const offerCover = async (tradeId) => {
    await fetch('http://localhost:3001/api/trades/offer', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradeId: tradeId, covererId: user.id })
    });
    alert("Offer sent to Manager for approval!");
    loadDashboardData(); // Refresh UI
  };

  const approveTrade = async (tradeId, shiftId, covererId) => {
    await fetch('http://localhost:3001/api/trades/approve', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradeId, shiftId, covererId })
    });
    alert("Trade Officially Approved!");
    loadDashboardData(); // Refresh UI
  };

  // --- EXISTING LOGIN LOGIC ---
  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);
  const handleLogout = () => { setUser(null); setStep(1); };

  const login = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) setUser(data.user);
      else alert(data.message);
    } catch (err) { alert('Backend not connected.'); }
  };

  const variants = {
    initial: { x: 50, opacity: 0, scale: 0.95 },
    animate: { x: 0, opacity: 1, scale: 1 },
    exit: { x: -50, opacity: 0, scale: 0.95 }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
      <FluidBackground />

      <AnimatePresence mode='wait'>
        {!user ? (
          /* ==================== LOGIN CARD ==================== */
          <motion.div key="login-card" className="liquid-glass" style={{ width: '400px', padding: '40px', position: 'relative', zIndex: 1 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px', letterSpacing: '1px', fontWeight: '800' }}>ShiftSwap</h2>
            <AnimatePresence mode='wait'>
              {step === 1 && (
                <motion.div key="step1" variants={variants} initial="initial" animate="animate" exit="exit">
                  <label style={{ fontSize: '14px', color: '#aaa' }}>Step 1: Organization Access</label>
                  <input className="glass-input" placeholder="Enter Branch Code" style={{ marginTop: '10px', marginBottom: '20px' }} value={formData.branchCode} onChange={e => setFormData({...formData, branchCode: e.target.value})} />
                  <button className="glass-btn" onClick={handleNext} disabled={!formData.branchCode}>Next</button>
                </motion.div>
              )}
              {step === 2 && (
                <motion.div key="step2" variants={variants} initial="initial" animate="animate" exit="exit">
                  <label style={{ fontSize: '14px', color: '#aaa' }}>Step 2: Select Role</label>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px', marginBottom: '20px' }}>
                    <button className="glass-btn" style={{ background: formData.roleType === 'Employee' ? '#ff4500' : 'rgba(255,255,255,0.05)' }} onClick={() => { setFormData({...formData, roleType: 'Employee'}); handleNext(); }}>Employee</button>
                    <button className="glass-btn" style={{ background: formData.roleType === 'Manager' ? '#dc143c' : 'rgba(255,255,255,0.05)' }} onClick={() => { setFormData({...formData, roleType: 'Manager'}); handleNext(); }}>Manager</button>
                  </div>
                  <p style={{ cursor: 'pointer', fontSize: '14px', color: '#666' }} onClick={handleBack}>← Back</p>
                </motion.div>
              )}
              {step === 3 && (
                <motion.div key="step3" variants={variants} initial="initial" animate="animate" exit="exit">
                  <label style={{ fontSize: '14px', color: '#aaa' }}>Step 3: Credentials</label>
                  <input className="glass-input" type="email" placeholder="Email" style={{ marginTop: '10px', marginBottom: '10px' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  <input className="glass-input" type="password" placeholder="Password" style={{ marginBottom: '20px' }} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  <button className="glass-btn" onClick={login}>Authenticate</button>
                  <p style={{ cursor: 'pointer', fontSize: '14px', color: '#666', marginTop: '15px' }} onClick={handleBack}>← Back</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* ==================== DASHBOARD VIEW ==================== */
          <motion.div key="dashboard-card" className="liquid-glass" style={{ width: '80%', maxWidth: '900px', padding: '40px', position: 'relative', zIndex: 1 }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800' }}>ShiftSwap Workspace</h1>
                <p style={{ margin: '5px 0 0 0', color: '#aaa', fontSize: '14px' }}>
                  Logged in as: <strong style={{ color: '#fff' }}>{user.first_name} {user.last_name}</strong> ({formData.roleType})
                </p>
              </div>
              <button className="glass-btn" style={{ width: 'auto', padding: '8px 20px', background: 'rgba(255,0,0,0.2)' }} onClick={handleLogout}>Logout</button>
            </div>

            {user.is_manager === 1 ? (
              /* --- MANAGER DASHBOARD --- */
              <div>
                <h3 style={{ color: '#dc143c', marginBottom: '15px' }}>🛠️ Manager Operations Portal</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4>Pending Shift Approvals</h4>
                    {pendingApprovals.length === 0 ? (
                      <p style={{ color: '#666', fontSize: '14px' }}>No active trade approvals queued for your branch.</p>
                    ) : (
                      pendingApprovals.map(trade => (
                        <div key={trade.trade_id} style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                          <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>{trade.shift_date.split('T')[0]} ({trade.start_time.substring(0,5)} - {trade.end_time.substring(0,5)})</p>
                          <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#aaa' }}>{trade.req_first} wants to swap with {trade.cov_first}</p>
                          <button className="glass-btn" style={{ padding: '8px', fontSize: '13px', background: '#28a745' }} onClick={() => approveTrade(trade.trade_id, trade.shift_id, trade.coverer_id)}>Approve Trade</button>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4>Roster Overview</h4>
                    <p style={{ color: '#666', fontSize: '14px' }}>Branch operational. Database active.</p>
                  </div>
                </div>
              </div>
            ) : (
              /* --- EMPLOYEE DASHBOARD --- */
              <div>
                <h3 style={{ color: '#ff4500', marginBottom: '15px' }}>📋 Associate Shift Portal</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4>My Schedule</h4>
                    {myShifts.length === 0 ? (
                      <p style={{ color: '#666', fontSize: '14px' }}>You have no upcoming shifts.</p>
                    ) : (
                      myShifts.map(shift => (
                        <div key={shift.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                          <div>
                            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{shift.shift_date.split('T')[0]}</span><br/>
                            <span style={{ fontSize: '12px', color: '#aaa' }}>{shift.start_time.substring(0,5)} - {shift.end_time.substring(0,5)}</span>
                          </div>
                          <button className="glass-btn" style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }} onClick={() => requestSwap(shift.id)}>Post to Trade</button>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4>Available Branch Shifts</h4>
                    {availableTrades.length === 0 ? (
                      <p style={{ color: '#666', fontSize: '14px' }}>No available swap shifts posted by coworkers today.</p>
                    ) : (
                      availableTrades.map(trade => (
                        <div key={trade.trade_id} style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                          <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>{trade.first_name} needs cover on {trade.shift_date.split('T')[0]}</p>
                          <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#aaa' }}>{trade.start_time.substring(0,5)} - {trade.end_time.substring(0,5)}</p>
                          <button className="glass-btn" style={{ padding: '6px', fontSize: '12px', background: '#007bff' }} onClick={() => offerCover(trade.trade_id)}>Offer to Cover</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;