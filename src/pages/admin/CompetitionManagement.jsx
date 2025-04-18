import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { format } from 'date-fns';

const PageContainer = styled.div`
  animation: fadeIn 0.5s ease;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const TabContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;

const Tab = styled.button`
  padding: 10px 20px;
  background: ${props => props.active ? '#ff725a' : '#1e242e'};
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.active ? '#ff725a' : '#2c3646'};
  }
`;

const Card = styled.div`
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

const InputRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 15px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Button = styled.button`
  padding: 10px 20px;
  background: ${props => props.secondary ? '#2c3646' : '#ff725a'};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background: ${props => props.secondary ? '#394457' : '#ff8a75'};
  }
  
  &:disabled {
    background: #2c3646;
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const CompetitionCard = styled.div`
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  
  .header {
    padding: 15px;
    background: #1e242e;
    border-bottom: 1px solid #30363d;
    
    .coin {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      
      img {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        object-fit: cover;
      }
      
      .symbol {
        font-size: 16px;
        font-weight: 500;
      }
    }
    
    .title {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }
    
    .subtitle {
      font-size: 14px;
      color: #8b949e;
      margin: 5px 0 0;
    }
  }
  
  .body {
    padding: 15px;
    
    .dates {
      margin-bottom: 15px;
      
      .date-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
        font-size: 14px;
        
        .label {
          color: #8b949e;
        }
        
        .value {
          color: #e6edf3;
        }
      }
    }
    
    .rewards {
      .title {
        font-size: 14px;
        font-weight: 500;
        color: #8b949e;
        margin-bottom: 10px;
      }
      
      .reward-item {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        margin-bottom: 5px;
        
        .rank {
          color: #e6edf3;
        }
        
        .amount {
          color: #ff725a;
        }
      }
    }
  }
  
  .footer {
    padding: 15px;
    border-top: 1px solid #30363d;
    display: flex;
    justify-content: space-between;
    
    .status {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 15px;
      font-size: 12px;
      background: ${props => props.status === 'active' ? 'rgba(76, 217, 100, 0.2)' : 'rgba(255, 59, 48, 0.2)'};
      color: ${props => props.status === 'active' ? '#4cd964' : '#ff3b30'};
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  
  h3 {
    margin-bottom: 10px;
    color: #e6edf3;
  }
  
  p {
    color: #8b949e;
    margin-bottom: 20px;
  }
`;

const CompetitionManagement = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    coinSymbol: '',
    coinLogoUrl: '',
    startDate: '',
    endDate: '',
    rewardsDistributionDate: '',
    rewards: []
  });
  
  // Reward form
  const [rewardForm, setRewardForm] = useState({
    rank: '',
    description: '',
    amount: ''
  });
  
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    fetchCompetitions();
  }, []);
  
  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const competitionSnapshot = await getDocs(collection(db, 'competitions'));
      const competitionList = competitionSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCompetitions(competitionList);
    } catch (error) {
      console.error("Error fetching competitions:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear error for this field if exists
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
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
      description: rewardForm.description || `${rewardForm.rank} Place`,
      amount: rewardForm.amount
    };
    
    setForm({
      ...form,
      rewards: [...form.rewards, newReward]
    });
    
    // Reset reward form
    setRewardForm({
      rank: '',
      description: '',
      amount: ''
    });
  };
  
  const removeReward = (id) => {
    setForm({
      ...form,
      rewards: form.rewards.filter(reward => reward.id !== id)
    });
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!form.title) newErrors.title = 'Title is required';
    if (!form.subtitle) newErrors.subtitle = 'Subtitle is required';
    if (!form.coinSymbol) newErrors.coinSymbol = 'Coin symbol is required';
    if (!form.coinLogoUrl) newErrors.coinLogoUrl = 'Coin logo URL is required';
    if (!form.startDate) newErrors.startDate = 'Start date is required';
    if (!form.endDate) newErrors.endDate = 'End date is required';
    if (!form.rewardsDistributionDate) newErrors.rewardsDistributionDate = 'Rewards distribution date is required';
    if (form.rewards.length === 0) newErrors.rewards = 'At least one reward is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      const competitionData = {
        ...form,
        createdAt: serverTimestamp(),
        status: 'active'
      };
      
      await addDoc(collection(db, 'competitions'), competitionData);
      
      // Reset form & fetch updated list
      setForm({
        title: '',
        subtitle: '',
        coinSymbol: '',
        coinLogoUrl: '',
        startDate: '',
        endDate: '',
        rewardsDistributionDate: '',
        rewards: []
      });
      
      fetchCompetitions();
      setActiveTab('list');
      
    } catch (error) {
      console.error("Error creating competition:", error);
      setErrors({ submit: 'Error creating competition. Please try again.' });
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
    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to delete this competition? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Delete the competition document from Firestore
      await deleteDoc(doc(db, 'competitions', competitionId));
      
      // Update the local state to reflect the deletion
      setCompetitions(competitions.filter(comp => comp.id !== competitionId));
      
      alert('Competition deleted successfully');
    } catch (error) {
      console.error('Error deleting competition:', error);
      alert('Failed to delete competition. Please try again.');
    }
  };
  
  return (
    <PageContainer>
      <TabContainer>
        <Tab 
          active={activeTab === 'list'} 
          onClick={() => setActiveTab('list')}
        >
          Competition List
        </Tab>
        <Tab 
          active={activeTab === 'add'} 
          onClick={() => setActiveTab('add')}
        >
          Add Competition
        </Tab>
      </TabContainer>
      
      {activeTab === 'list' && (
        <>
          <Card>
            <h2>Competition Management</h2>
            <p>Manage all competitions from here. Create new ones or modify existing competitions.</p>
            <ButtonContainer>
              <Button onClick={() => setActiveTab('add')}>
                <i className="bi bi-plus"></i> Add New Competition
              </Button>
            </ButtonContainer>
          </Card>
          
          {loading ? (
            <p>Loading competitions...</p>
          ) : competitions.length > 0 ? (
            <CompetitionList>
              {competitions.map(competition => {
                const status = determineStatus(competition.startDate, competition.endDate);
                
                return (
                  <CompetitionCard key={competition.id} status={status}>
                    <div className="header">
                      <div className="coin">
                        <img src={competition.coinLogoUrl} alt={competition.coinSymbol} />
                        <span className="symbol">{competition.coinSymbol}</span>
                      </div>
                      <h3 className="title">{competition.title}</h3>
                      <p className="subtitle">{competition.subtitle}</p>
                    </div>
                    <div className="body">
                      <div className="dates">
                        <div className="date-item">
                          <span className="label">Start Date:</span>
                          <span className="value">{formatDate(competition.startDate)}</span>
                        </div>
                        <div className="date-item">
                          <span className="label">End Date:</span>
                          <span className="value">{formatDate(competition.endDate)}</span>
                        </div>
                        <div className="date-item">
                          <span className="label">Rewards Distribution:</span>
                          <span className="value">{formatDate(competition.rewardsDistributionDate)}</span>
                        </div>
                      </div>
                      <div className="rewards">
                        <p className="title">Reward Breakdown</p>
                        {competition.rewards.slice(0, 3).map(reward => (
                          <div className="reward-item" key={reward.id}>
                            <span className="rank">{reward.description}</span>
                            <span className="amount">{reward.amount} USDT</span>
                          </div>
                        ))}
                        {competition.rewards.length > 3 && (
                          <div className="reward-item">
                            <span className="rank">And more...</span>
                            <span className="amount">{competition.rewards.length - 3} more rewards</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="footer">
                      <span className="status">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                      <ButtonContainer>
                        <Button secondary>
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button secondary onClick={() => deleteCompetition(competition.id)}>
                          <i className="bi bi-trash"></i>
                        </Button>
                      </ButtonContainer>
                    </div>
                  </CompetitionCard>
                );
              })}
            </CompetitionList>
          ) : (
            <EmptyState>
              <h3>No Competitions Yet</h3>
              <p>There are no competitions created yet. Get started by adding your first competition.</p>
              <Button onClick={() => setActiveTab('add')}>
                <i className="bi bi-plus"></i> Add New Competition
              </Button>
            </EmptyState>
          )}
        </>
      )}
      
      {activeTab === 'add' && (
        <Card>
          <h2>Create New Competition</h2>
          <p>Fill out the form below to create a new competition.</p>
          
          <FormGroup>
            <label>Competition Title</label>
            <input 
              type="text" 
              name="title"
              value={form.title}
              onChange={handleFormChange}
              placeholder="e.g. OSCAR Competition"
            />
            {errors.title && <ErrorMessage>{errors.title}</ErrorMessage>}
          </FormGroup>
          
          <FormGroup>
            <label>Competition Subtitle</label>
            <input 
              type="text" 
              name="subtitle"
              value={form.subtitle}
              onChange={handleFormChange}
              placeholder="e.g. Top 100 users who deposit the highest amount"
            />
            {errors.subtitle && <ErrorMessage>{errors.subtitle}</ErrorMessage>}
          </FormGroup>
          
          <InputRow>
            <FormGroup>
              <label>Coin Symbol</label>
              <input 
                type="text" 
                name="coinSymbol"
                value={form.coinSymbol}
                onChange={handleFormChange}
                placeholder="e.g. OSCAR"
              />
              {errors.coinSymbol && <ErrorMessage>{errors.coinSymbol}</ErrorMessage>}
            </FormGroup>
            
            <FormGroup>
              <label>Coin Logo URL</label>
              <input 
                type="text" 
                name="coinLogoUrl"
                value={form.coinLogoUrl}
                onChange={handleFormChange}
                placeholder="https://example.com/coin-logo.png"
              />
              {errors.coinLogoUrl && <ErrorMessage>{errors.coinLogoUrl}</ErrorMessage>}
            </FormGroup>
          </InputRow>
          
          <h3>Competition Schedule</h3>
          
          <InputRow>
            <FormGroup>
              <label>Start Date</label>
              <input 
                type="date" 
                name="startDate"
                value={form.startDate}
                onChange={handleFormChange}
              />
              {errors.startDate && <ErrorMessage>{errors.startDate}</ErrorMessage>}
            </FormGroup>
            
            <FormGroup>
              <label>End Date</label>
              <input 
                type="date" 
                name="endDate"
                value={form.endDate}
                onChange={handleFormChange}
              />
              {errors.endDate && <ErrorMessage>{errors.endDate}</ErrorMessage>}
            </FormGroup>
          </InputRow>
          
          <FormGroup>
            <label>Rewards Distribution Date</label>
            <input 
              type="date" 
              name="rewardsDistributionDate"
              value={form.rewardsDistributionDate}
              onChange={handleFormChange}
            />
            {errors.rewardsDistributionDate && <ErrorMessage>{errors.rewardsDistributionDate}</ErrorMessage>}
          </FormGroup>
          
          <h3>Reward Breakdown</h3>
          <p>Add rewards for each place in the competition.</p>
          
          {errors.rewards && <ErrorMessage>{errors.rewards}</ErrorMessage>}
          
          <Card style={{ background: '#1e242e', marginBottom: '20px' }}>
            <InputRow>
              <FormGroup>
                <label>Rank</label>
                <input 
                  type="text" 
                  name="rank"
                  value={rewardForm.rank}
                  onChange={handleRewardFormChange}
                  placeholder="e.g. 1st, 2nd, 3rd, etc."
                />
              </FormGroup>
              
              <FormGroup>
                <label>Description (optional)</label>
                <input 
                  type="text" 
                  name="description"
                  value={rewardForm.description}
                  onChange={handleRewardFormChange}
                  placeholder="e.g. First Place, Top 5, etc."
                />
              </FormGroup>
            </InputRow>
            
            <InputRow>
              <FormGroup>
                <label>Amount (USDT)</label>
                <input 
                  type="text" 
                  name="amount"
                  value={rewardForm.amount}
                  onChange={handleRewardFormChange}
                  placeholder="e.g. 1000"
                />
              </FormGroup>
              
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button onClick={addReward}>Add Reward</Button>
              </div>
            </InputRow>
          </Card>
          
          {form.rewards.length > 0 && (
            <Card style={{ background: '#1e242e', marginBottom: '20px' }}>
              <h4>Added Rewards</h4>
              {form.rewards.map(reward => (
                <RewardItem key={reward.id}>
                  <div className="reward-details">
                    <div className="rank">{reward.description || reward.rank}</div>
                    <div className="amount">{reward.amount} USDT</div>
                  </div>
                  <button onClick={() => removeReward(reward.id)}>
                    <i className="bi bi-trash"></i>
                  </button>
                </RewardItem>
              ))}
            </Card>
          )}
          
          {errors.submit && <ErrorMessage>{errors.submit}</ErrorMessage>}
          
          <ButtonContainer>
            <Button onClick={handleSubmit}>
              <i className="bi bi-plus-circle"></i> Create Competition
            </Button>
            <Button secondary onClick={() => setActiveTab('list')}>
              Cancel
            </Button>
          </ButtonContainer>
        </Card>
      )}
    </PageContainer>
  );
};

export default CompetitionManagement; 