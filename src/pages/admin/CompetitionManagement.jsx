import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { format } from 'date-fns';
import AdminLayout from '../../components/admin/AdminLayout';
import { Container, Row, Col, Spinner, Button, Form } from 'react-bootstrap';
import { Tabs, Tab } from 'react-bootstrap';
import { PlusCircle, Trash, Trophy } from 'react-bootstrap-icons';

const PageContainer = styled.div`
  animation: fadeIn 0.5s ease;
  position: relative;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  /* Hide any global competition title that might be coming from parent components */
  & > h1:first-of-type,
  & > div:first-of-type > h1,
  .competition-header,
  .tf-page-title,
  [class*="page-title"],
  .tf-center {
    display: none !important;
  }
  
  /* Add some extra CSS to ensure top level titles are hidden */
  ~ h2, ~ h3, ~ div > h2, ~ div > h3 {
    display: none !important;
  }
  
  body div:has([data-text*="POSEIDON"], p:contains("POSEIDON"), h1:contains("POSEIDON"), h2:contains("POSEIDON"), div:contains("POSEIDON")) {
    visibility: hidden;
    height: 0;
    overflow: hidden;
    margin: 0;
    padding: 0;
  }
`;

const Card = styled.div`
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
  
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
  }
  
  input, select, textarea {
    width: 100%;
    padding: 10px 15px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 4px;
    color: #e6edf3;
    font-size: 15px;
    
    &:focus {
      outline: none;
      border-color: #ff725a;
    }
  }
  
  textarea {
    min-height: 100px;
    resize: vertical;
  }
`;

const ErrorMessage = styled.div`
  color: #ff3b30;
  font-size: 14px;
  margin-top: 5px;
`;

const RewardItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  background: #1e242e;
  border-radius: 4px;
  padding: 10px;
  
  .reward-details {
    flex: 1;
  }
  
  .rank {
    font-weight: 500;
  }
  
  .amount {
    color: #ff725a;
  }
  
  button {
    background: none;
    border: none;
    color: #ff3b30;
    cursor: pointer;
    
    &:hover {
      color: #ff6b60;
    }
  }
`;

const CompetitionList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 25px;
  margin-top: 20px;
`;

const CompetitionCard = styled.div`
  background: #161b22;
  border-radius: 12px;
  border: 1px solid #30363d;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  
  /* Competition title banner at the top */
  .competition-banner {
    width: 100%;
    padding: 20px;
    background: linear-gradient(to bottom, #1e242e, #161b22);
    border-bottom: 1px solid #30363d;
    
    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 15px;
      
      .trophy {
        color: #ffcc00;
        min-width: 28px;
        filter: drop-shadow(0 0 3px rgba(255, 204, 0, 0.3));
      }
      
      h3 {
        font-size: 22px;
        font-weight: 700;
        margin: 0;
        color: #ff725a;
        text-shadow: 0 0 10px rgba(255, 114, 90, 0.3);
        letter-spacing: 0.5px;
      }
    }
    
    .coin-info {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 15px;
      background: rgba(30, 36, 46, 0.6);
      padding: 8px 12px;
      border-radius: 8px;
      
      .symbol {
        font-size: 16px;
        font-weight: 600;
        color: white;
      }
    }
    
    .description {
      font-size: 14px;
      color: #8b949e;
      line-height: 1.4;
      margin-bottom: 15px;
    }
    
    .features {
      background: rgba(30, 36, 46, 0.4);
      border-radius: 8px;
      padding: 12px;
      
      .features-title {
        font-size: 13px;
        font-weight: 600;
        color: #8b949e;
        margin: 0 0 8px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .feature-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        
        .feature-tag {
          background: rgba(255, 114, 90, 0.15);
          border: 1px solid rgba(255, 114, 90, 0.3);
          color: #ff725a;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 500;
        }
      }
    }
  }
  
  /* Competition body with dates and rewards */
  .competition-body {
    padding: 20px;
    flex-grow: 1;
    
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #8b949e;
      margin: 0 0 12px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .dates-section {
      margin-bottom: 20px;
      
      .date-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 14px;
        
        .label {
          color: #8b949e;
          font-weight: 500;
        }
        
        .value {
          color: #e6edf3;
          font-weight: 500;
        }
      }
    }
    
    .rewards-section {
      .reward-item {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        margin-bottom: 8px;
        
        .rank {
          color: #e6edf3;
        }
        
        .amount {
          color: #ff725a;
          font-weight: 600;
        }
      }
    }
  }
  
  /* Competition footer with status and actions */
  .competition-footer {
    padding: 15px 20px;
    border-top: 1px solid #30363d;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 25px;
  border-bottom: 1px solid #30363d;
  gap: 30px;
  
  .nav-tabs {
    border: none;
    margin-bottom: 0;
    display: flex;
  }
  
  .nav-item {
    margin-right: 30px;
    
    button {
      border: none !important;
      background: none !important;
      color: #8b949e;
      font-size: 15px;
      font-weight: 500;
      padding: 12px 5px;
      margin-right: 0;
      position: relative;
      
      &.active {
        color: #e6edf3 !important;
        background: none !important;
        
        &:after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #ff725a;
          border-radius: 2px;
        }
      }
      
      &:hover {
        color: #e6edf3;
        border-color: transparent;
      }
    }
  }
`;

const ActionButtonContainer = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto;
`;

const ActionButton = styled(Button)`
  background-color: #ff725a;
  border-color: #ff725a;
  padding: 10px 20px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  
  &:hover {
    background-color: #e6644f;
    border-color: #e6644f;
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    font-size: 18px;
  }
`;

const PageTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: #e6edf3;
`;

const ActiveBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(76, 217, 100, 0.15);
  color: #4cd964;
  text-transform: capitalize;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  
  background: ${props => 
    props.status === 'active' ? 'rgba(76, 217, 100, 0.2)' : 
    props.status === 'upcoming' ? 'rgba(0, 122, 255, 0.2)' : 
    'rgba(255, 59, 48, 0.2)'
  };
  
  color: ${props => 
    props.status === 'active' ? '#4cd964' : 
    props.status === 'upcoming' ? '#007aff' : 
    '#ff3b30'
  };
  
  text-transform: capitalize;
`;

const DeleteButton = styled.button`
  background-color: transparent;
  border: 1px solid #ff3b30;
  border-radius: 6px;
  color: #ff3b30;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  transition: all 0.2s;
  cursor: pointer;
  
  &:hover {
    background-color: rgba(255, 59, 48, 0.1);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    font-size: 14px;
  }
`;

const TabNav = styled.div`
  display: flex;
  border-bottom: 1px solid #30363d;
  margin-bottom: 25px;
`;

const TabButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.isActive ? '#e6edf3' : '#8b949e'};
  font-size: 15px;
  font-weight: 500;
  padding: 12px 16px;
  position: relative;
  cursor: pointer;
  
  &:after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: #ff725a;
    border-radius: 2px;
    opacity: ${props => props.isActive ? 1 : 0};
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    color: #e6edf3;
  }
`;

// Add a floating action button for creating competitions
const FloatingActionButton = styled.button`
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #ff725a;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(255, 114, 90, 0.3);
  cursor: pointer;
  z-index: 100;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 20px rgba(255, 114, 90, 0.4);
  }
  
  svg {
    font-size: 24px;
  }
`;

// Improve the empty state UI
const EmptyState = styled.div`
  text-align: center;
  padding: 60px 40px;
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  margin: 40px auto;
  max-width: 500px;
  
  svg {
    font-size: 48px;
    color: #30363d;
    margin-bottom: 20px;
  }
  
  h3 {
    font-size: 20px;
    color: #e6edf3;
    margin-bottom: 10px;
  }
  
  p {
    color: #8b949e;
    margin-bottom: 25px;
    line-height: 1.5;
  }
`;

const CompetitionManagement = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    coinSymbol: '',
    coinLogoUrl: '',
    totalPrize: '',
    participants: 0,
    features: []
  });
  
  const [rewardForm, setRewardForm] = useState({
    rank: '',
    amount: ''
  });
  
  const [rewards, setRewards] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [featureInput, setFeatureInput] = useState('');
  
  useEffect(() => {
    fetchCompetitions();
  }, []);
  
  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const competitionSnapshot = await getDocs(collection(db, 'competitions'));
      const competitionList = competitionSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log(`Competition ${doc.id} data:`, data);
        console.log(`Features array for ${doc.id}:`, data.features);
        
        // Ensure features is always an array
        if (!data.features) {
          data.features = [];
        }
        
        return {
          id: doc.id,
          ...data
        };
      });
      setCompetitions(competitionList);
    } catch (error) {
      console.error("Error fetching competitions:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error for this field if exists
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: null });
    }
  };
  
  const handleRewardFormChange = (e) => {
    const { name, value } = e.target;
    setRewardForm({ ...rewardForm, [name]: value });
  };
  
  const addReward = () => {
    if (!rewardForm.rank || !rewardForm.amount) {
      return;
    }
    
    const newReward = {
      id: Date.now().toString(),
      rank: rewardForm.rank,
      amount: rewardForm.amount
    };
    
    setRewards([...rewards, newReward]);
    
    // Reset reward form
    setRewardForm({
      rank: '',
      amount: ''
    });
  };
  
  const removeReward = (index) => {
    setRewards(rewards.filter((_, i) => i !== index));
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (!formData.coinSymbol) newErrors.coinSymbol = 'Coin symbol is required';
    if (!formData.coinLogoUrl) newErrors.coinLogoUrl = 'Coin logo URL is required';
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      const competitionData = {
        ...formData,
        createdAt: serverTimestamp(),
        status: 'active',
        rewards: rewards
      };
      
      console.log("Saving competition data:", competitionData);
      
      await addDoc(collection(db, 'competitions'), competitionData);
      
      // Reset form & fetch updated list
      setFormData({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        coinSymbol: '',
        coinLogoUrl: '',
        totalPrize: '',
        participants: 0,
        features: []
      });
      
      setRewards([]);
      
      fetchCompetitions();
      setActiveTab('list');
      
    } catch (error) {
      console.error("Error creating competition:", error);
      setFormErrors({ submit: 'Error creating competition. Please try again.' });
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return dateString;
    }
  };
  
  const determineStatus = (startDate, endDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now < start) return 'upcoming';
    if (now > end) return 'ended';
    return 'active';
  };
  
  const deleteCompetition = async (competitionId) => {
    if (!window.confirm('Are you sure you want to delete this competition? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'competitions', competitionId));
      setCompetitions(competitions.filter(comp => comp.id !== competitionId));
    } catch (error) {
      console.error('Error deleting competition:', error);
      alert('Failed to delete competition. Please try again.');
    }
  };
  
  return (
    <AdminLayout title="Trading Competitions">
      <PageContainer>
        <TabNav>
          <TabButton 
            isActive={activeTab === 'list'} 
            onClick={() => setActiveTab('list')}
          >
            All Competitions
          </TabButton>
          <TabButton 
            isActive={activeTab === 'add'} 
            onClick={() => setActiveTab('add')}
          >
            Create New Competition
          </TabButton>
          
          {activeTab === 'list' && (
            <ActionButtonContainer style={{ marginLeft: 'auto' }}>
              <ActionButton onClick={() => setActiveTab('add')}>
                <PlusCircle /> Create Competition
              </ActionButton>
            </ActionButtonContainer>
          )}
        </TabNav>
        
        {activeTab === 'list' && (
          <Card>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2">Loading competitions...</p>
              </div>
            ) : competitions.length === 0 ? (
              <EmptyState>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <h3>No Competitions Found</h3>
                <p>Create your first trading competition to engage users and boost trading activity on your platform.</p>
                <ActionButton onClick={() => setActiveTab('add')}>
                  <PlusCircle /> Create First Competition
                </ActionButton>
              </EmptyState>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                  <ActionButton onClick={() => setActiveTab('add')}>
                    <PlusCircle /> Create New Competition
                  </ActionButton>
                </div>
                <CompetitionList>
                  {competitions.map(competition => {
                    const status = determineStatus(competition.startDate, competition.endDate);
                    
                    return (
                      <CompetitionCard key={competition.id}>
                        {/* Competition Banner With Title */}
                        <div className="competition-banner">
                          <div className="title-row">
                            <Trophy className="trophy" size={24} />
                            <h3>{competition.title || 'Trading Competition'}</h3>
                          </div>
                          
                          <div className="coin-info">
                            {competition.coinLogoUrl && (
                              <img 
                                src={competition.coinLogoUrl} 
                                alt={competition.coinSymbol} 
                                style={{ 
                                  width: '24px', 
                                  height: '24px', 
                                  borderRadius: '50%',
                                  marginRight: '8px' 
                                }} 
                              />
                            )}
                            <span className="symbol">{competition.coinSymbol || 'TOKEN'}</span>
                          </div>
                          
                          {competition.description && (
                            <p className="description">{competition.description}</p>
                          )}
                          
                          {/* Debugging info */}
                          <div style={{ fontSize: '10px', color: '#666', marginBottom: '5px' }}>
                            Features array: {JSON.stringify(competition.features)}
                          </div>
                          
                          {(competition.features && competition.features.length > 0) && (
                            <div className="features">
                              <div className="features-title">Key Features</div>
                              <div className="feature-list">
                                {competition.features.map((feature, index) => (
                                  <div className="feature-tag" key={index}>{feature}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Competition Body */}
                        <div className="competition-body">
                          <div className="dates-section">
                            <h4 className="section-title">Competition Dates</h4>
                            <div className="date-item">
                              <span className="label">Start Date:</span>
                              <span className="value">{formatDate(competition.startDate)}</span>
                            </div>
                            <div className="date-item">
                              <span className="label">End Date:</span>
                              <span className="value">{formatDate(competition.endDate)}</span>
                            </div>
                          </div>
                          
                          <div className="rewards-section">
                            <h4 className="section-title">Reward Distribution</h4>
                            {competition.rewards && competition.rewards.length > 0 ? (
                              competition.rewards.map((reward, index) => (
                                <div className="reward-item" key={index}>
                                  <span className="rank">{reward.rank}</span>
                                  <span className="amount">{reward.amount} USDT</span>
                                </div>
                              ))
                            ) : (
                              <div className="reward-item">
                                <span className="rank">No rewards defined</span>
                                <span className="amount">-</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Competition Footer */}
                        <div className="competition-footer">
                          <StatusBadge status={status}>{status}</StatusBadge>
                          <DeleteButton onClick={() => deleteCompetition(competition.id)}>
                            <Trash size={14} /> Delete
                          </DeleteButton>
                        </div>
                      </CompetitionCard>
                    );
                  })}
                </CompetitionList>
                <FloatingActionButton onClick={() => setActiveTab('add')} title="Create Competition">
                  <PlusCircle />
                </FloatingActionButton>
              </>
            )}
          </Card>
        )}
        
        {activeTab === 'add' && (
          <Card>
            <h3 className="mb-4">Create New Competition</h3>
            
            <Form>
              <Row>
                <Col md={6}>
                  <FormGroup>
                    <label>Competition Title</label>
                    <input 
                      type="text" 
                      name="title" 
                      value={formData.title} 
                      onChange={handleFormChange} 
                      placeholder="Enter competition title"
                    />
                    {formErrors.title && <ErrorMessage>{formErrors.title}</ErrorMessage>}
                  </FormGroup>
                </Col>
                
                <Col md={6}>
                  <FormGroup>
                    <label>Coin Symbol</label>
                    <input 
                      type="text" 
                      name="coinSymbol" 
                      value={formData.coinSymbol} 
                      onChange={handleFormChange} 
                      placeholder="Enter coin symbol (e.g. BTC)"
                    />
                    {formErrors.coinSymbol && <ErrorMessage>{formErrors.coinSymbol}</ErrorMessage>}
                  </FormGroup>
                </Col>
              </Row>
              
              <FormGroup>
                <label>Coin Logo URL</label>
                <input 
                  type="text" 
                  name="coinLogoUrl" 
                  value={formData.coinLogoUrl} 
                  onChange={handleFormChange} 
                  placeholder="Enter URL for coin logo image"
                />
                {formErrors.coinLogoUrl && <ErrorMessage>{formErrors.coinLogoUrl}</ErrorMessage>}
              </FormGroup>
              
              <FormGroup>
                <label>Description</label>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleFormChange} 
                  placeholder="Enter competition description"
                />
                {formErrors.description && <ErrorMessage>{formErrors.description}</ErrorMessage>}
              </FormGroup>
              
              <FormGroup>
                <label>Key Features</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input 
                    type="text" 
                    value={featureInput} 
                    onChange={(e) => setFeatureInput(e.target.value)} 
                    placeholder="Add competition feature (e.g. Daily rewards, Exclusive token etc.)"
                    style={{ flex: 1 }}
                  />
                  <Button 
                    variant="primary"
                    onClick={() => {
                      if (featureInput.trim()) {
                        const feature = featureInput.trim();
                        const currentFeatures = Array.isArray(formData.features) ? formData.features : [];
                        const updatedFeatures = [...currentFeatures, feature];
                        
                        console.log("Adding feature:", feature);
                        console.log("Current features:", currentFeatures);
                        console.log("Updated features:", updatedFeatures);
                        
                        setFormData({
                          ...formData,
                          features: updatedFeatures
                        });
                        setFeatureInput('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                
                {formData.features && formData.features.length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '6px', 
                    background: 'rgba(30, 36, 46, 0.4)', 
                    padding: '10px', 
                    borderRadius: '4px', 
                    marginTop: '10px' 
                  }}>
                    {formData.features.map((feature, index) => (
                      <div key={index} style={{ 
                        background: 'rgba(255, 114, 90, 0.15)', 
                        border: '1px solid rgba(255, 114, 90, 0.3)', 
                        color: '#ff725a', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {feature}
                        <button 
                          onClick={() => {
                            setFormData({
                              ...formData,
                              features: formData.features.filter((_, i) => i !== index)
                            });
                          }}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#ff725a', 
                            padding: '0', 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: 'pointer' 
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </FormGroup>
              
              <Row>
                <Col md={6}>
                  <FormGroup>
                    <label>Start Date</label>
                    <input 
                      type="datetime-local" 
                      name="startDate" 
                      value={formData.startDate} 
                      onChange={handleFormChange} 
                    />
                    {formErrors.startDate && <ErrorMessage>{formErrors.startDate}</ErrorMessage>}
                  </FormGroup>
                </Col>
                
                <Col md={6}>
                  <FormGroup>
                    <label>End Date</label>
                    <input 
                      type="datetime-local" 
                      name="endDate" 
                      value={formData.endDate} 
                      onChange={handleFormChange} 
                    />
                    {formErrors.endDate && <ErrorMessage>{formErrors.endDate}</ErrorMessage>}
                  </FormGroup>
                </Col>
              </Row>
              
              <Row>
                <Col md={6}>
                  <FormGroup>
                    <label>Total Prize Pool (USDT)</label>
                    <input 
                      type="number" 
                      name="totalPrize" 
                      value={formData.totalPrize} 
                      onChange={handleFormChange} 
                      placeholder="Enter total prize amount"
                    />
                    {formErrors.totalPrize && <ErrorMessage>{formErrors.totalPrize}</ErrorMessage>}
                  </FormGroup>
                </Col>
              </Row>
              
              <Card style={{ background: '#1e242e', padding: '20px' }}>
                <h4 className="mb-3">Reward Distribution</h4>
                
                <Row>
                  <Col md={5}>
                    <FormGroup>
                      <label>Rank</label>
                      <input 
                        type="text" 
                        name="rank" 
                        value={rewardForm.rank} 
                        onChange={handleRewardFormChange} 
                        placeholder="e.g. 1st Place, Top 3, etc."
                      />
                    </FormGroup>
                  </Col>
                  
                  <Col md={5}>
                    <FormGroup>
                      <label>Reward Amount (USDT)</label>
                      <input 
                        type="number" 
                        name="amount" 
                        value={rewardForm.amount} 
                        onChange={handleRewardFormChange} 
                        placeholder="Enter reward amount"
                      />
                    </FormGroup>
                  </Col>
                  
                  <Col md={2} className="d-flex align-items-end">
                    <Button 
                      variant="primary" 
                      onClick={addReward} 
                      className="w-100 mb-3"
                    >
                      Add
                    </Button>
                  </Col>
                </Row>
                
                {rewards.length > 0 && (
                  <div className="mt-3">
                    <h5>Rewards</h5>
                    {rewards.map((reward, index) => (
                      <RewardItem key={index}>
                        <div className="reward-details">
                          <span className="rank">{reward.rank}</span>: 
                          <span className="amount"> {reward.amount} USDT</span>
                        </div>
                        <button onClick={() => removeReward(index)}>
                          <Trash />
                        </button>
                      </RewardItem>
                    ))}
                  </div>
                )}
              </Card>
              
              <ButtonContainer className="mt-4">
                <Button variant="secondary" onClick={() => setActiveTab('list')}>
                  Cancel
                </Button>
                
                <ActionButton onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : 'Create Competition'}
                </ActionButton>
              </ButtonContainer>
            </Form>
          </Card>
        )}
      </PageContainer>
    </AdminLayout>
  );
};

export default CompetitionManagement; 