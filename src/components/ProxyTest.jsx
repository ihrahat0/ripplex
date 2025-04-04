import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { fetchViaProxy, fetchEvmTransactionsViaProxy, fetchSolanaTransactionsViaProxy } from '../services/proxyService';

const Container = styled.div`
  padding: 20px;
  background: #1a1c23;
  border-radius: 10px;
  margin: 20px;
`;

const Title = styled.h2`
  color: #e2e8f0;
  margin-bottom: 20px;
`;

const Button = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  margin-right: 10px;
  margin-bottom: 10px;
  cursor: pointer;
  
  &:hover {
    background: #2563eb;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ResultBox = styled.pre`
  background: #2d303e;
  padding: 15px;
  border-radius: 6px;
  color: #e2e8f0;
  overflow: auto;
  max-height: 400px;
  white-space: pre-wrap;
`;

const Status = styled.div`
  margin-top: 10px;
  padding: 8px;
  border-radius: 4px;
  background: ${props => props.success ? 'rgba(14, 203, 129, 0.1)' : 'rgba(246, 70, 93, 0.1)'};
  color: ${props => props.success ? '#0ECB81' : '#F6465D'};
`;

const ProxyTest = () => {
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const testHealthEndpoint = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await axios.get('/api/health');
      setTestResult(result.data);
      setError(null);
    } catch (err) {
      console.error('Health check error:', err);
      setError(`Error: ${err.message}`);
      setTestResult(null);
    } finally {
      setLoading(false);
    }
  };
  
  const testProxyEndpoint = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchViaProxy('/api/proxy-test');
      setTestResult(result);
      setError(null);
    } catch (err) {
      console.error('Proxy test error:', err);
      setError(`Error: ${err.message}`);
      setTestResult(null);
    } finally {
      setLoading(false);
    }
  };
  
  const testEvmProxy = async () => {
    setLoading(true);
    setError(null);
    try {
      // Test with Ethereum Vitalik's address
      const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      const chain = 'ethereum';
      
      const result = await fetchEvmTransactionsViaProxy(address, chain);
      setTestResult(result);
      setError(null);
    } catch (err) {
      console.error('EVM proxy test error:', err);
      setError(`Error: ${err.message}`);
      setTestResult(null);
    } finally {
      setLoading(false);
    }
  };
  
  const testSolanaProxy = async () => {
    setLoading(true);
    setError(null);
    try {
      // Test with a known Solana address
      const address = 'mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN';
      
      const result = await fetchSolanaTransactionsViaProxy(address);
      setTestResult(result);
      setError(null);
    } catch (err) {
      console.error('Solana proxy test error:', err);
      setError(`Error: ${err.message}`);
      setTestResult(null);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container>
      <Title>API Proxy Test</Title>
      
      <div>
        <Button onClick={testHealthEndpoint} disabled={loading}>
          Test Health Endpoint
        </Button>
        <Button onClick={testProxyEndpoint} disabled={loading}>
          Test Proxy Test Endpoint
        </Button>
        <Button onClick={testEvmProxy} disabled={loading}>
          Test EVM Proxy
        </Button>
        <Button onClick={testSolanaProxy} disabled={loading}>
          Test Solana Proxy
        </Button>
      </div>
      
      {loading && <Status>Loading...</Status>}
      
      {error && (
        <Status success={false}>
          {error}
        </Status>
      )}
      
      {testResult && (
        <>
          <Status success={true}>
            Success! Response received.
          </Status>
          <ResultBox>
            {JSON.stringify(testResult, null, 2)}
          </ResultBox>
        </>
      )}
    </Container>
  );
};

export default ProxyTest; 