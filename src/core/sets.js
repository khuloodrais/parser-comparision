export function computeFirstSets(grammar) {
    const first = new Map();
    // Initialize all with empty sets
    for (const t of grammar.terminals) {
        first.set(t, new Set([t]));
    }
    for (const nt of grammar.nonTerminals) {
        first.set(nt, new Set());
    }

    let changed = true;
    while (changed) {
        changed = false;
        for (const [head, bodyList] of grammar.productions.entries()) {
            for (const body of bodyList) {
                let canBeEpsilon = true;
                for (const symbol of body) {
                    if (symbol === 'eps') {
                        if (!first.get(head).has('eps')) {
                            first.get(head).add('eps');
                            changed = true;
                        }
                        break; 
                    }
                    
                    const symbolFirst = first.get(symbol);
                    if (!symbolFirst) continue; // safety check
                    
                    let hasEps = false;
                    for (const f of symbolFirst) {
                        if (f === 'eps') {
                            hasEps = true;
                        } else if (!first.get(head).has(f)) {
                            first.get(head).add(f);
                            changed = true;
                        }
                    }
                    if (!hasEps) {
                        canBeEpsilon = false;
                        break;
                    }
                }
                if (canBeEpsilon && !first.get(head).has('eps')) {
                    first.get(head).add('eps');
                    changed = true;
                }
            }
        }
    }
    return first;
}

export function computeFollowSets(grammar, firstSets) {
    const follow = new Map();
    for (const nt of grammar.nonTerminals) {
        follow.set(nt, new Set());
    }
    follow.get(grammar.startSymbol).add('$');

    let changed = true;
    while (changed) {
        changed = false;
        for (const [head, bodyList] of grammar.productions.entries()) {
            for (const body of bodyList) {
                for (let i = 0; i < body.length; i++) {
                    const B = body[i];
                    if (grammar.nonTerminals.includes(B)) {
                        let canBeEpsilon = true;
                        for (let j = i + 1; j < body.length; j++) {
                            const beta = body[j];
                            if (beta === 'eps') continue;
                            
                            const betaFirst = firstSets.get(beta);
                            let hasEps = false;
                            for (const f of betaFirst) {
                                if (f === 'eps') {
                                    hasEps = true;
                                } else if (!follow.get(B).has(f)) {
                                    follow.get(B).add(f);
                                    changed = true;
                                }
                            }
                            if (!hasEps) {
                                canBeEpsilon = false;
                                break;
                            }
                        }
                        if (canBeEpsilon) {
                            for (const f of follow.get(head)) {
                                if (!follow.get(B).has(f)) {
                                    follow.get(B).add(f);
                                    changed = true;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return follow;
}
