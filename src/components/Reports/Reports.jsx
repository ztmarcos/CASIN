import { useState } from 'react';
import './Reports.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const REPORT_TYPES = ['Financial', 'Performance', 'Sales', 'Inventory', 'Customer'];

const SAMPLE_REPORTS = [
  {
    id: 1,
    title: 'Q1 Financial Summary',
    type: 'Financial',
    month: 'March',
    date: '2024-03-15',
    status: 'completed',
    author: 'John Doe',
    summary: 'Quarterly financial report detailing revenue, expenses, and profit margins.'
  },
  {
    id: 2,
    title: 'Employee Performance Review',
    type: 'Performance',
    month: 'February',
    date: '2024-02-28',
    status: 'pending',
    author: 'Jane Smith',
    summary: 'Annual employee performance evaluation and metrics analysis.'
  },
  {
    id: 3,
    title: 'Monthly Sales Report',
    type: 'Sales',
    month: 'March',
    date: '2024-03-01',
    status: 'in_progress',
    author: 'Mike Johnson',
    summary: 'Monthly sales figures and trend analysis across all product categories.'
  }
];

export default function Reports() {
  const [viewMode, setViewMode] = useState('table');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const filteredReports = SAMPLE_REPORTS.filter(report => {
    if (selectedMonth && report.month !== selectedMonth) return false;
    if (selectedType && report.type !== selectedType) return false;
    return true;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'pending': return 'status-pending';
      case 'in_progress': return 'status-progress';
      default: return '';
    }
  };

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h2>Reports</h2>
        <div className="reports-controls">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              ▦ Table
            </button>
            <button
              className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              ▤ Cards
            </button>
          </div>
          <div className="filters">
            <select
              className="filter-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">All Months</option>
              {MONTHS.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <select
              className="filter-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">All Types</option>
              {REPORT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Month</th>
                <th>Date</th>
                <th>Status</th>
                <th>Author</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map(report => (
                <tr key={report.id}>
                  <td>{report.title}</td>
                  <td><span className="report-type">{report.type}</span></td>
                  <td>{report.month}</td>
                  <td>{report.date}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(report.status)}`}>
                      {report.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{report.author}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="cards-grid">
          {filteredReports.map(report => (
            <div key={report.id} className="report-card">
              <div className="card-header">
                <h3>{report.title}</h3>
                <span className="report-type">{report.type}</span>
              </div>
              <div className="card-content">
                <div className="card-info">
                  <span className="card-month">{report.month}</span>
                  <span className="card-date">{report.date}</span>
                </div>
                <p className="card-summary">{report.summary}</p>
                <div className="card-footer">
                  <span className="card-author">{report.author}</span>
                  <span className={`status-badge ${getStatusBadgeClass(report.status)}`}>
                    {report.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 