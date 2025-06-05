import React from 'react';

class NotionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Notion component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="notion-error-boundary">
          <h3>Something went wrong with the Notion component</h3>
          <button 
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="notion-button refresh"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export both default and named export for compatibility
export { NotionErrorBoundary };
export default NotionErrorBoundary; 