import React, { useState, useEffect } from 'react';
import './GPTAnalysis.css';

const GPTAnalysis = ({ parsedData, tables }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dbTables, setDbTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [mappedData, setMappedData] = useState(null);

    // Fetch available tables and their columns
    useEffect(() => {
        const fetchTables = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/data/tables');
                if (!response.ok) throw new Error('Failed to fetch tables');
                const data = await response.json();
                setDbTables(data);
            } catch (err) {
                console.error('Error fetching tables:', err);
                setError('Failed to fetch database tables');
            }
        };
        fetchTables();
    }, []);

    const analyzeContent = async () => {
        if (!selectedTable) {
            setError('Please select a target table first');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            // Get selected table columns
            const targetTable = dbTables.find(t => t.name === selectedTable);
            if (!targetTable) {
                throw new Error('Selected table not found');
            }

            const columns = targetTable.columns.map(col => col.name);
            console.log('Analyzing with columns:', columns); // Debug log

            const response = await fetch('http://localhost:3001/api/gpt/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: parsedData.text,
                    tables: tables,
                    metadata: parsedData.metadata,
                    targetColumns: columns,
                    tableName: selectedTable
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to analyze content');
            }

            const result = await response.json();
            console.log('Full Analysis Result:', JSON.stringify(result, null, 2)); // Debug log
            
            setAnalysis(result);
            if (result.mappedData) {
                console.log('Mapped Data:', result.mappedData); // Debug log
                setMappedData(result.mappedData);
            } else {
                console.error('Missing mapped data in result:', result); // Debug log
                throw new Error('No mapped data received from analysis');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error analyzing content:', err);
            if (err.response) {
                console.error('Error response:', await err.response.text());
            }
            setMappedData(null); // Clear any previous mapped data
        } finally {
            setLoading(false);
        }
    };

    const insertData = async () => {
        if (!mappedData || !selectedTable) {
            setError('No data to insert');
            return;
        }

        try {
            const response = await fetch(`http://localhost:3001/api/data/${selectedTable}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mappedData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to insert data');
            }

            const result = await response.json();
            alert('Data inserted successfully!');
            // Clear the mapped data after successful insertion
            setMappedData(null);
        } catch (err) {
            setError('Failed to insert data: ' + err.message);
            console.error('Error inserting data:', err);
        }
    };

    return (
        <div className="gpt-analysis">
            <h3>GPT Analysis</h3>
            
            <div className="table-selection">
                <select 
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="table-select"
                >
                    <option value="">Select Target Table</option>
                    {dbTables.map(table => (
                        <option key={table.name} value={table.name}>
                            {table.name}
                        </option>
                    ))}
                </select>

                {selectedTable && (
                    <>
                        <div className="column-info">
                            <h4>Table Structure:</h4>
                            <div className="table-preview">
                                <table>
                                    <thead>
                                        <tr>
                                            {dbTables
                                                .find(t => t.name === selectedTable)
                                                ?.columns.map(col => (
                                                    <th key={col.name}>
                                                        {col.name}
                                                        <br/>
                                                        <span className="column-type">({col.type})</span>
                                                    </th>
                                                ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            {dbTables
                                                .find(t => t.name === selectedTable)
                                                ?.columns.map(col => (
                                                    <td key={col.name} className="empty-cell">
                                                        {col.name === 'id' || col.name === 'pdf' ? 
                                                            'null' : 
                                                            '[To be filled by GPT]'}
                                                    </td>
                                                ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <button 
                            onClick={analyzeContent}
                            disabled={loading || !parsedData || !selectedTable}
                            className="analyze-button"
                        >
                            {loading ? 'Analyzing...' : 'Extract Data'}
                        </button>
                    </>
                )}
            </div>

            {error && (
                <div className="error-message">
                    Error: {error}
                </div>
            )}

            {mappedData && (
                <div className="mapped-data-section">
                    <h4>Extracted Data:</h4>
                    <div className="table-preview">
                        <table>
                            <thead>
                                <tr>
                                    {Object.keys(mappedData).map(column => (
                                        <th key={column}>
                                            {column}
                                            <br/>
                                            <span className="column-type">
                                                ({dbTables
                                                    .find(t => t.name === selectedTable)
                                                    ?.columns.find(c => c.name === column)?.type || 'unknown'})
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {Object.values(mappedData).map((value, index) => (
                                        <td key={index} className={value === null ? 'null-value' : ''}>
                                            {value !== null ? String(value) : 'null'}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="button-container">
                        <button 
                            onClick={insertData}
                            className="insert-button"
                            disabled={!mappedData}
                        >
                            Add to {selectedTable} Table
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GPTAnalysis; 