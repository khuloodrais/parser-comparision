export class LRItem {
    constructor(head, body, dot) {
        this.head = head;
        this.body = body; // Array
        this.dot = dot;   // Int
    }
    toString() {
        const b = [...this.body];
        b.splice(this.dot, 0, '.');
        return `${this.head} -> ${b.join(' ')}`;
    }
    nextSymbol() {
        if (this.dot < this.body.length) {
            return this.body[this.dot];
        }
        return null;
    }
    equals(other) {
        return this.head === other.head && this.dot === other.dot && 
               this.body.join(' ') === other.body.join(' ');
    }
}

export class LR0Parser {
    constructor(grammar) {
        this.grammar = grammar;
        this.startSymbolAug = grammar.startSymbol + "'";
        this.states = []; // Array of arrays of LRItem
        this.transitions = new Map(); // stateIndex -> Map<Symbol, stateIndex>
        this.actionTable = []; // stateIndex -> Map<Terminal, String (Action)>
        this.gotoTable = []; // stateIndex -> Map<NonTerminal, Integer>
    }

    init() {
        this.buildAutomaton();
        this.buildParsingTable();
    }

    closure(items) {
        const c = [...items];
        let changed = true;
        while (changed) {
            changed = false;
            for (let i = 0; i < c.length; i++) {
                const headItem = c[i];
                const nextSym = headItem.nextSymbol();
                if (nextSym && this.grammar.nonTerminals.includes(nextSym)) {
                    const productions = this.grammar.productions.get(nextSym) || [];
                    for (const prod of productions) {
                        const newItem = new LRItem(nextSym, prod, 0);
                        if (!c.some(item => item.equals(newItem))) {
                            c.push(newItem);
                            changed = true;
                        }
                    }
                }
            }
        }
        return c;
    }

    goto(items, symbol) {
        const moved = items.filter(item => item.nextSymbol() === symbol)
                           .map(item => new LRItem(item.head, item.body, item.dot + 1));
        return this.closure(moved);
    }

    itemSetEquals(setA, setB) {
        if (setA.length !== setB.length) return false;
        return setA.every(itemA => setB.some(itemB => itemA.equals(itemB)));
    }

    buildAutomaton() {
        const startItem = new LRItem(this.startSymbolAug, [this.grammar.startSymbol], 0);
        const startState = this.closure([startItem]);
        this.states.push(startState);
        this.transitions.set(0, new Map());

        const symbols = [...this.grammar.nonTerminals, ...this.grammar.terminals];

        let changed = true;
        while (changed) {
            changed = false;
            for (let i = 0; i < this.states.length; i++) {
                const state = this.states[i];
                for (const symbol of symbols) {
                    const nextState = this.goto(state, symbol);
                    if (nextState.length > 0) {
                        let matchingStateIndex = this.states.findIndex(s => this.itemSetEquals(s, nextState));
                        if (matchingStateIndex === -1) {
                            matchingStateIndex = this.states.length;
                            this.states.push(nextState);
                            this.transitions.set(matchingStateIndex, new Map());
                            changed = true;
                        }
                        if (!this.transitions.get(i).has(symbol)) {
                            this.transitions.get(i).set(symbol, matchingStateIndex);
                            changed = true; // Technically if transition added, but state existed, it might be new transition
                        }
                    }
                }
            }
        }
    }

    buildParsingTable() {
        for (let i = 0; i < this.states.length; i++) {
            this.actionTable.push(new Map());
            this.gotoTable.push(new Map());
            
            const state = this.states[i];
            for (const item of state) {
                if (item.head === this.startSymbolAug && item.dot === 1) {
                    this.actionTable[i].set('$', 'Accept');
                } else if (item.nextSymbol() === null) {
                    // Reduce
                    const prodStr = `${item.head} -> ${item.body.join(' ')}`;
                    for (const t of this.grammar.terminals) {
                        if (t !== 'eps') {
                            this.actionTable[i].set(t, `R: ${prodStr}`);
                        }
                    }
                    this.actionTable[i].set('$', `R: ${prodStr}`);
                } else {
                    const nextSym = item.nextSymbol();
                    if (this.grammar.terminals.includes(nextSym)) {
                        const target = this.transitions.get(i).get(nextSym);
                        if (target !== undefined) {
                            this.actionTable[i].set(nextSym, `S${target}`);
                        }
                    }
                }
            }
            
            for (const nt of this.grammar.nonTerminals) {
                const target = this.transitions.get(i).get(nt);
                if (target !== undefined) {
                    this.gotoTable[i].set(nt, target);
                }
            }
        }
    }

    parse(tokens) {
        let i = 0;
        const stack = [0];
        const symbolStack = [];
        const steps = [];

        while (true) {
            const state = stack[stack.length - 1];
            const currentToken = tokens[i];
            
            steps.push({
                stack: [...stack],
                symbolStack: [...symbolStack],
                input: tokens.slice(i).join(' '),
                action: ''
            });

            const action = this.actionTable[state]?.get(currentToken);
            
            if (!action) {
                steps[steps.length - 1].action = `Error: no valid action for state ${state} on '${currentToken}'`;
                return { success: false, steps, error: `Parse error at token ${currentToken}` };
            }

            if (action === 'Accept') {
                steps[steps.length - 1].action = 'Accept';
                return { success: true, steps };
            } else if (action.startsWith('S')) {
                const nextState = parseInt(action.substring(1), 10);
                steps[steps.length - 1].action = `Shift to ${nextState}`;
                stack.push(nextState);
                symbolStack.push(currentToken);
                i++;
            } else if (action.startsWith('R: ')) {
                const prodStr = action.substring(3);
                const [head, bodyStr] = prodStr.split(' -> ');
                const bodyLength = bodyStr === 'eps' ? 0 : bodyStr.split(' ').length;
                
                steps[steps.length - 1].action = `Reduce by ${prodStr}`;
                
                for (let j = 0; j < bodyLength; j++) {
                    stack.pop();
                    symbolStack.pop();
                }
                
                const prevState = stack[stack.length - 1];
                const nextState = this.gotoTable[prevState].get(head);
                if (nextState === undefined) {
                     return { success: false, steps, error: `Invalid goto for ${head} from state ${prevState}` };
                }
                stack.push(nextState);
                symbolStack.push(head);
            }
        }
    }
}
