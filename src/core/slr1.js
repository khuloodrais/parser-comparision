import { LR0Parser, LRItem } from './lr0.js';
import { computeFirstSets, computeFollowSets } from './sets.js';

export class SLR1Parser extends LR0Parser {
    constructor(grammar) {
        super(grammar);
        this.firstSets = computeFirstSets(grammar);
        this.followSets = computeFollowSets(grammar, this.firstSets);
        // Wait, standard grammar doesn't start with E' but startSymbolAug.
        // computeFollowSets works on grammar, so we might need E' in follow sets if we augmented it.
        // Actually, startSymbol implicitly has $ in followSets.
        this.init();
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
                    // Reduce - only for terminals in FOLLOW(item.head)
                    const prodStr = `${item.head} -> ${item.body.join(' ')}`;
                    
                    if (item.head === this.startSymbolAug) {
                        this.actionTable[i].set('$', 'Accept');
                    } else {
                        const follow = this.followSets.get(item.head);
                        if (follow) {
                            for (const t of follow) {
                                if (t !== 'eps') {
                                    this.actionTable[i].set(t, `R: ${prodStr}`);
                                }
                            }
                        }
                    }
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
}
