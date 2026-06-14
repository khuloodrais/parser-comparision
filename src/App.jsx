import { useState, useEffect } from 'react';
import { parseGrammarString } from './core/grammar.js';
import { tokenize } from './core/lexer.js';
import { LL1Parser } from './core/ll1.js';
import { LR0Parser } from './core/lr0.js';
import { SLR1Parser } from './core/slr1.js';

const STD_GRAMMAR = `E -> E + T | E - T | T
T -> T * F | T / F | F
F -> ( E ) | id | int`;

const LL1_GRAMMAR = `E -> T E1
E1 -> + T E1 | - T E1 | eps
T -> F T1
T1 -> * F T1 | / F T1 | eps
F -> ( E ) | id | int`;

function App() {
  const [inputExp, setInputExp] = useState('id + id * id');
  const [parserType, setParserType] = useState('LL1');
  const [grammarStr, setGrammarStr] = useState(LL1_GRAMMAR);
  
  const [result, setResult] = useState(null);
  const [errorStr, setErrorStr] = useState(null);

  useEffect(() => {
    // Auto-update grammar strings if they were using the default ones
    if (parserType === 'LL1' && grammarStr === STD_GRAMMAR) {
        setGrammarStr(LL1_GRAMMAR);
    } else if ((parserType === 'LR0' || parserType === 'SLR1') && grammarStr === LL1_GRAMMAR) {
        setGrammarStr(STD_GRAMMAR);
    }
  }, [parserType]);

  const handleParse = () => {
    setErrorStr(null);
    setResult(null);
    try {
      const tokens = tokenize(inputExp);
      const grammarInstance = parseGrammarString(grammarStr);
      let parserInstance;
      
      if (parserType === 'LL1') {
        parserInstance = new LL1Parser(grammarInstance);
      } else if (parserType === 'LR0') {
        parserInstance = new LR0Parser(grammarInstance);
        parserInstance.init();
      } else if (parserType === 'SLR1') {
        parserInstance = new SLR1Parser(grammarInstance);
      }

      const parseResult = parserInstance.parse(tokens);
      
      setResult({
        tokens,
        grammar: grammarInstance,
        firstSets: parserInstance.firstSets,
        followSets: parserInstance.followSets,
        states: parserInstance.states, // For LR
        actionTable: parserInstance.actionTable, // For LR
        gotoTable: parserInstance.gotoTable, // For LR
        parsingTable: parserInstance.parsingTable, // For LL1
        steps: parseResult.steps,
        success: parseResult.success,
        error: parseResult.error,
        parserType
      });
      
    } catch (err) {
      setErrorStr(err.message || String(err));
    }
  };

  return (
    <div className="app-container">
      <div className="panel">
        <h1 className="panel-title">⚡ Parser Configuration</h1>
        
        <div className="input-group">
          <label>Grammar (Space separated symbols, "eps" for epsilon)</label>
          <textarea 
            value={grammarStr}
            onChange={e => setGrammarStr(e.target.value)}
            rows={6}
            style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.875rem', padding: '0.75rem', 
                borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', 
                border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                resize: 'vertical', outline: 'none'
            }}
          />
        </div>

        <div className="input-group">
          <label>Expression (Space separated tokens!)</label>
          <input 
            type="text" 
            value={inputExp} 
            onChange={e => setInputExp(e.target.value)}
            placeholder="e.g. id + id"
          />
        </div>

        <div className="radio-group">
          <label>Select Algorithm</label>
          {['LL1', 'LR0', 'SLR1'].map(pt => (
            <label key={pt} className="radio-option">
              <input 
                type="radio" 
                name="parserType" 
                value={pt} 
                checked={parserType === pt} 
                onChange={() => setParserType(pt)} 
              />
              <span>{pt}</span>
            </label>
          ))}
        </div>

        <button className="btn" onClick={handleParse}>Execute Parse</button>
        
        {errorStr && (
          <div className="code-block error-text">
            <strong>Error:</strong> {errorStr}
          </div>
        )}
      </div>

      <div className="results-area">
        {result && (
          <>
            <div className="result-card">
              <div className="card-header">
                <h2>Final Status</h2>
              </div>
              <div>
                <b className={result.success ? "success-text" : "error-text"} style={{fontSize: '1.25rem'}}>
                  {result.success ? '✅ Accepted' : '❌ Rejected'}
                </b>
                {!result.success && result.error && <p className="error-text" style={{marginTop:'0.5rem'}}>{result.error}</p>}
                
                <p style={{marginTop: '1rem', color: 'var(--text-secondary)'}}>
                  Input tokens: <br/> 
                  {result.tokens.map((t, idx) => <span key={idx} className="badge">{t}</span>)}
                </p>
              </div>
            </div>

            <div className="result-card">
              <div className="card-header">
                <h2>Stack Trace</h2>
              </div>
              <div className="code-block">
                <div className="step-row header">
                  <div>Stack</div>
                  <div>Input</div>
                  <div>Action</div>
                </div>
                {result.steps.map((s, idx) => (
                  <div key={idx} className="step-row">
                    <div>{s.stack.join(' ')}</div>
                    <div>{s.input}</div>
                    <div>{s.action}</div>
                  </div>
                ))}
              </div>
            </div>

            {result.parserType === 'LL1' && (
              <div className="result-card">
                <div className="card-header">
                  <h2>LL(1) Parsing Table</h2>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Non-Terminal</th>
                        {result.grammar.terminals.filter(t => t !== 'eps').map(t => <th key={t}>{t}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {result.grammar.nonTerminals.map(nt => (
                        <tr key={nt}>
                          <td><strong>{nt}</strong></td>
                          {result.grammar.terminals.filter(t => t !== 'eps').map(t => {
                            const entry = result.parsingTable.get(nt)?.get(t);
                            return <td key={t}>{entry ? `${nt} -> ${entry.join(' ')}` : ''}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(result.parserType === 'LR0' || result.parserType === 'SLR1') && (
              <div className="result-card">
                <div className="card-header">
                  <h2>Action & Goto Tables</h2>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th rowSpan={2}>State</th>
                        <th colSpan={result.grammar.terminals.length} style={{textAlign:'center'}}>ACTION</th>
                        <th colSpan={result.grammar.nonTerminals.length} style={{textAlign:'center'}}>GOTO</th>
                      </tr>
                      <tr>
                        {result.grammar.terminals.map(t => <th key={t}>{t}</th>)}
                        {result.grammar.nonTerminals.map(nt => <th key={nt}>{nt}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {result.actionTable.map((actionMap, stateIdx) => (
                        <tr key={stateIdx}>
                          <td><strong>{stateIdx}</strong></td>
                          {result.grammar.terminals.map(t => <td key={t}>{actionMap.get(t) || ''}</td>)}
                          {result.grammar.nonTerminals.map(nt => <td key={nt}>{result.gotoTable[stateIdx].get(nt) || ''}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result.firstSets && (
              <div className="result-card" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem'}}>
                <div>
                  <div className="card-header"><h2>FIRST Sets</h2></div>
                  <div className="code-block">
                    {Array.from(result.firstSets.entries()).map(([k, v]) => (
                      <div key={k}>FIRST({k}) = {`{ ${Array.from(v).join(', ')} }`}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="card-header"><h2>FOLLOW Sets</h2></div>
                  <div className="code-block">
                    {Array.from(result.followSets.entries()).map(([k, v]) => (
                      <div key={k}>FOLLOW({k}) = {`{ ${Array.from(v).join(', ')} }`}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
