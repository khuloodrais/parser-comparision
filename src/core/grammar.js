export class Grammar {
    constructor(nonTerminals, terminals, productions, startSymbol) {
        this.nonTerminals = nonTerminals;
        this.terminals = terminals;
        this.productions = productions; // Map<String, Array<Array<String>>>
        this.startSymbol = startSymbol;
    }
}

export const getStandardArithmeticGrammar = () => {
    return new Grammar(
        ['E', 'T', 'F'],
        ['+', '-', '*', '/', '(', ')', 'id', 'int'],
        new Map([
            ['E', [['E', '+', 'T'], ['E', '-', 'T'], ['T']]],
            ['T', [['T', '*', 'F'], ['T', '/', 'F'], ['F']]],
            ['F', [['(', 'E', ')'], ['id'], ['int']]]
        ]),
        'E'
    );
};

export const getLL1ArithmeticGrammar = () => {
    return new Grammar(
        ['E', 'E1', 'T', 'T1', 'F'],
        ['+', '-', '*', '/', '(', ')', 'id', 'int', 'eps'],
        new Map([
            ['E', [['T', 'E1']]],
            ['E1', [['+', 'T', 'E1'], ['-', 'T', 'E1'], ['eps']]],
            ['T', [['F', 'T1']]],
            ['T1', [['*', 'F', 'T1'], ['/', 'F', 'T1'], ['eps']]],
            ['F', [['(', 'E', ')'], ['id'], ['int']]]
        ]),
        'E'
    );
};

export function parseGrammarString(str) {
    const lines = str.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const productions = new Map();
    const nonTerminals = new Set();
    const terminals = new Set();
    let startSymbol = null;

    for (const line of lines) {
        if (!line.includes('->')) continue;
        const head = line.split('->')[0].trim();
        nonTerminals.add(head);
        if (!startSymbol) startSymbol = head;
    }

    for (const line of lines) {
        if (!line.includes('->')) continue;
        let [head, bodyStr] = line.split('->');
        head = head.trim();
        const alternatives = bodyStr.split('|').map(alt => alt.trim());
        
        if (!productions.has(head)) productions.set(head, []);
        const currentProds = productions.get(head);
        
        for (const alt of alternatives) {
            if (alt === '') continue;
            const symbols = alt.split(/\s+/).filter(s => s.length > 0);
            for (const sym of symbols) {
                if (sym !== 'eps' && !nonTerminals.has(sym)) {
                    terminals.add(sym);
                }
            }
            currentProds.push(symbols);
        }
    }

    return new Grammar(
        Array.from(nonTerminals),
        Array.from(terminals).concat(['eps']),
        productions,
        startSymbol
    );
}
