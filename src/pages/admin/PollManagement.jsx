import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

const Container = styled.div`
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  padding: 20px;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  color: #e6edf3;
  margin-bottom: 20px;
  font-size: 20px;
  display: flex;
  align-items: center;
  
  i {
    margin-right: 10px;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  color: #c9d1d9;
`;

const Input = styled.input`
  padding: 10px 15px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #e6edf3;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #ff725a;
  }
`;

const TextArea = styled.textarea`
  padding: 10px 15px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #e6edf3;
  font-size: 14px;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #ff725a;
  }
`;

const Select = styled.select`
  padding: 10px 15px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #e6edf3;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #ff725a;
  }
`;

const Button = styled.button`
  padding: 10px 20px;
  background: #ff725a;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  align-self: flex-start;
  
  &:hover {
    background: #e65a45;
  }
  
  &:disabled {
    background: #6e4039;
    cursor: not-allowed;
  }
`;

const OptionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
`;

const OptionRow = styled.div`
  display: flex;
  gap: 10px;
`;

const PollList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const PollCard = styled.div`
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 15px;
  position: relative;
  
  h3 {
    margin: 0 0 10px;
    color: #e6edf3;
    font-size: 18px;
  }
  
  p {
    margin: 0 0 15px;
    color: #c9d1d9;
    font-size: 14px;
  }
`;

const PollOptions = styled.div`
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #30363d;
`;

const CardActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 15px;
`;

const ActionButton = styled.button`
  padding: 6px 12px;
  background: ${props => props.$danger ? '#e41e3f' : '#0d419d'};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.$danger ? '#c41733' : '#0a3580'};
  }
`;

const Badge = styled.span`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: white;
  background: ${props => {
    switch(props.$type) {
      case 'active': return '#4cd964';
      case 'ended': return '#ff3b30';
      case 'scheduled': return '#007aff';
      default: return '#8e8e93';
    }
  }};
  margin-left: 10px;
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
`;

const DateTimeContainer = styled.div`
  display: flex;
  gap: 10px;
`;

const RewardBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: white;
  background: #ff725a;
  margin-left: 10px;
  
  i {
    margin-right: 4px;
    font-size: 10px;
  }
`;

const PollManagement = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState('options');
  const [options, setOptions] = useState(['', '']);
  const [allowUserOptions, setAllowUserOptions] = useState(false);
  const [resultsVisibility, setResultsVisibility] = useState('instant');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [rewardAmount, setRewardAmount] = useState(0);
  
  useEffect(() => {
    fetchPolls();
  }, []);
  
  const fetchPolls = async () => {
    try {
      setLoading(true);
      const pollsQuery = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(pollsQuery);
      
      const pollsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setPolls(pollsData);
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddOption = () => {
    setOptions([...options, '']);
  };
  
  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };
  
  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formTitle.trim()) {
      alert('Poll title is required');
      return;
    }
    
    if (formType === 'options' && options.some(option => !option.trim())) {
      alert('All options must be filled');
      return;
    }
    
    try {
      const pollData = {
        title: formTitle,
        description: formDescription,
        type: formType,
        status: 'active',
        createdAt: serverTimestamp(),
        responses: 0,
        rewardAmount: parseInt(rewardAmount) || 0,
        resultsVisibility: resultsVisibility
      };
      
      if (formType === 'options') {
        pollData.options = options.filter(opt => opt.trim());
        pollData.allowUserOptions = allowUserOptions;
      }
      
      if (resultsVisibility === 'scheduled' && scheduledDate && scheduledTime) {
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        pollData.resultsVisibleDate = scheduledDateTime;
      }
      
      if (endDate && endTime) {
        const endDateTime = new Date(`${endDate}T${endTime}`);
        pollData.endDate = endDateTime;
        
        // Set to ended if end date is in the past
        if (endDateTime < new Date()) {
          pollData.status = 'ended';
        }
      }
      
      console.log("Creating poll with data:", pollData);
      
      await addDoc(collection(db, 'polls'), pollData);
      
      // Reset form
      setFormTitle('');
      setFormDescription('');
      setFormType('options');
      setOptions(['', '']);
      setAllowUserOptions(false);
      setResultsVisibility('instant');
      setScheduledDate('');
      setScheduledTime('');
      setEndDate('');
      setEndTime('');
      setRewardAmount(0);
      
      fetchPolls();
    } catch (error) {
      console.error('Error creating poll:', error);
      alert('Failed to create poll: ' + error.message);
    }
  };
  
  const handleDeletePoll = async (id) => {
    if (!window.confirm('Are you sure you want to delete this poll?')) return;
    
    try {
      await deleteDoc(doc(db, 'polls', id));
      fetchPolls();
    } catch (error) {
      console.error('Error deleting poll:', error);
      alert('Failed to delete poll: ' + error.message);
    }
  };
  
  const handleEndPoll = async (id) => {
    if (!window.confirm('Are you sure you want to end this poll?')) return;
    
    try {
      await updateDoc(doc(db, 'polls', id), {
        status: 'ended',
        endDate: new Date()
      });
      fetchPolls();
    } catch (error) {
      console.error('Error ending poll:', error);
      alert('Failed to end poll: ' + error.message);
    }
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };
  
  return (
    <div>
      <Container>
        <Title>
          <i className="bi bi-plus-circle"></i> Create New Poll
        </Title>
        
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Poll Title</Label>
            <Input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Enter poll title"
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Description (Optional)</Label>
            <TextArea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Enter poll description"
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Poll Type</Label>
            <Select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
            >
              <option value="options">Multiple Choice</option>
              <option value="text">Free Text</option>
            </Select>
          </FormGroup>
          
          {formType === 'options' && (
            <>
              <FormGroup>
                <Label>Poll Options</Label>
                <OptionsContainer>
                  {options.map((option, index) => (
                    <OptionRow key={index}>
                      <Input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        required
                      />
                      {options.length > 2 && (
                        <Button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          style={{ background: '#e41e3f', padding: '10px' }}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      )}
                    </OptionRow>
                  ))}
                  <Button
                    type="button"
                    onClick={handleAddOption}
                    style={{ background: '#0d419d' }}
                  >
                    Add Option
                  </Button>
                </OptionsContainer>
              </FormGroup>
              
              <CheckboxContainer>
                <input
                  type="checkbox"
                  id="allowUserOptions"
                  checked={allowUserOptions}
                  onChange={(e) => setAllowUserOptions(e.target.checked)}
                />
                <Label htmlFor="allowUserOptions">Allow users to add their own options</Label>
              </CheckboxContainer>
            </>
          )}
          
          <FormGroup>
            <Label>Results Visibility</Label>
            <Select
              value={resultsVisibility}
              onChange={(e) => setResultsVisibility(e.target.value)}
            >
              <option value="instant">Show results instantly</option>
              <option value="after_vote">Show after user votes</option>
              <option value="after_end">Show only after poll ends</option>
              <option value="scheduled">Show at scheduled time</option>
              <option value="admin_only">Admin only (never public)</option>
            </Select>
          </FormGroup>
          
          {resultsVisibility === 'scheduled' && (
            <FormGroup>
              <Label>When to make results public</Label>
              <DateTimeContainer>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                />
              </DateTimeContainer>
            </FormGroup>
          )}
          
          <FormGroup>
            <Label>Poll End Date/Time (Optional)</Label>
            <DateTimeContainer>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </DateTimeContainer>
          </FormGroup>
          
          <FormGroup>
            <Label>Reward Amount (RIPPLEX tokens)</Label>
            <Input
              type="number"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
              placeholder="Enter reward amount"
            />
          </FormGroup>
          
          <Button type="submit">Create Poll</Button>
        </Form>
      </Container>
      
      <Container>
        <Title>
          <i className="bi bi-bar-chart-line"></i> Manage Polls
        </Title>
        
        {loading ? (
          <div>Loading polls...</div>
        ) : polls.length === 0 ? (
          <div>No polls found. Create your first poll above.</div>
        ) : (
          <PollList>
            {polls.map(poll => (
              <PollCard key={poll.id}>
                <h3>
                  {poll.title}
                  <Badge $type={poll.status}>{poll.status.charAt(0).toUpperCase() + poll.status.slice(1)}</Badge>
                  {poll.rewardAmount > 0 && (
                    <RewardBadge>
                      <i className="bi bi-coin"></i> {poll.rewardAmount} RIPPLEX
                    </RewardBadge>
                  )}
                </h3>
                <p>{poll.description || 'No description'}</p>
                <div>
                  <strong>Type:</strong> {poll.type === 'options' ? 'Multiple Choice' : 'Free Text'}
                </div>
                <div>
                  <strong>Responses:</strong> {poll.responses || 0}
                </div>
                <div>
                  <strong>Results Visibility:</strong> {poll.resultsVisibility.replace(/_/g, ' ')}
                  {poll.resultsVisibility === 'scheduled' && poll.resultsVisibleDate && 
                    ` (${formatDate(poll.resultsVisibleDate)})`}
                </div>
                {poll.endDate && (
                  <div>
                    <strong>End Date:</strong> {formatDate(poll.endDate)}
                  </div>
                )}
                {poll.type === 'options' && (
                  <PollOptions>
                    <strong>Options:</strong>
                    <ul>
                      {poll.options.map((option, index) => (
                        <li key={index}>{option}</li>
                      ))}
                    </ul>
                  </PollOptions>
                )}
                <CardActions>
                  {poll.status === 'active' && (
                    <ActionButton onClick={() => handleEndPoll(poll.id)}>
                      End Poll
                    </ActionButton>
                  )}
                  <ActionButton $danger onClick={() => handleDeletePoll(poll.id)}>
                    Delete
                  </ActionButton>
                </CardActions>
              </PollCard>
            ))}
          </PollList>
        )}
      </Container>
    </div>
  );
};

export default PollManagement; 