import { computeFirstSets, computeFollowSets } from './sets.js';

export class LL1Parser {
    constructor(grammar) {
        this.grammar = grammar;
        this.firstSets = computeFirstSets(grammar);
        this.followSets = computeFollowSets(grammar, this.firstSets);
        this.parsingTable = this.buildParsingTable();
    }

    buildParsingTable() {
        const table = new Map();
        for (const nt of this.grammar.nonTerminals) {
            table.set(nt, new Map());
        }

        for (const [head, bodyList] of this.grammar.productions.entries()) {
            for (const body of bodyList) {
                const firstOfBody = this.getFirstOfSequence(body);
                for (const terminal of firstOfBody) {
                    if (terminal !== 'eps') {
                        table.get(head).set(terminal, body);
                    }
                }
                if (firstOfBody.has('eps')) {
                    for (const terminal of this.followSets.get(head)) {
                        table.get(head).set(terminal, body);
                    }
                }
            }
        }
        return table;
    }

    getFirstOfSequence(sequence) {
        const first = new Set();
        let canBeEpsilon = true;
        for (const symbol of sequence) {
            if (symbol === 'eps') {
                first.add('eps');
                break;
            }
            if (this.grammar.terminals.includes(symbol)) {
                first.add(symbol);
                canBeEpsilon = false;
                break;
            }
            const symbolFirst = this.firstSets.get(symbol);
            if(!symbolFirst) continue;
            let hasEps = false;
            for (const f of symbolFirst) {
                if (f === 'eps') hasEps = true;
                else first.add(f);
            }
            if (!hasEps) {
                canBeEpsilon = false;
                break;
            }
        }
        if (canBeEpsilon) first.add('eps');
        return first;
    }

    parse(tokens) {
        let i = 0;
        const stack = ['$', this.grammar.startSymbol];
        const steps = [];

        while (stack.length > 0) {
            const top = stack[stack.length - 1];
            const currentToken = tokens[i];
            
            steps.push({
                stack: [...stack],
                input: tokens.slice(i).join(' '),
                action: ''
            });

            if (top === currentToken) {
                if (top === '$') {
                    steps[steps.length - 1].action = 'Accept';
                    return { success: true, steps };
                }
                steps[steps.length - 1].action = `Match ${top}`;
                stack.pop();
                i++;
            } else if (this.grammar.terminals.includes(top)) {
                steps[steps.length - 1].action = `Error: expected ${top} but found ${currentToken}`;
                return { success: false, steps, error: `Expected ${top}` };
            } else {
                const production = this.parsingTable.get(top)?.get(currentToken);
                if (production) {
                    steps[steps.length - 1].action = `Output ${top} -> ${production.join(' ')}`;
                    stack.pop();
                    if (production[0] !== 'eps') {
                        for (let j = production.length - 1; j >= 0; j--) {
                            stack.push(production[j]);
                        }
                    }
                } else {
                    steps[steps.length - 1].action = `Error: no entry in table for [${top}, ${currentToken}]`;
                    return { success: false, steps, error: `Unexpected token ${currentToken}` };
                }
            }
        }
        return { success: false, steps, error: 'Stack emptied before input' };
    }
}
