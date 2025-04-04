import React from 'react';

function MyTest() {
  return (
    <div style={{
      backgroundColor: '#121212',
      color: 'white',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px'
    }}>
      <div style={{
        backgroundColor: '#1c1c28',
        padding: '40px',
        borderRadius: '20px',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        <h1>Test Page Working!</h1>
        <p>If you can see this, React is rendering correctly.</p>
        <div style={{marginTop: '30px'}}>
          <a 
            href="/register" 
            style={{
              backgroundColor: '#6578ff',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '10px',
              textDecoration: 'none',
              display: 'inline-block',
              marginRight: '20px'
            }}
          >
            Go to Register
          </a>
          <a 
            href="/login" 
            style={{
              backgroundColor: '#6578ff',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '10px',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            Go to Login
          </a>
        </div>
      </div>
    </div>
  );
}

export default MyTest; 