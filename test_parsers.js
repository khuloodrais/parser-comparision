import { getStandardArithmeticGrammar, getLL1ArithmeticGrammar } from './src/core/grammar.js';
import { tokenize } from './src/core/lexer.js';
import { LL1Parser } from './src/core/ll1.js';
import { LR0Parser } from './src/core/lr0.js';
import { SLR1Parser } from './src/core/slr1.js';

const input = "id + id * id";
console.log("Input:", input);

try {
    const tokens = tokenize(input);
    console.log("Tokens:", tokens);

    console.log("\n--- LL(1) ---");
    const ll1Grammar = getLL1ArithmeticGrammar();
    const ll1 = new LL1Parser(ll1Grammar);
    const ll1Res = ll1.parse(tokens);
    console.log("Success:", ll1Res.success);
    if (!ll1Res.success) console.log("Error:", ll1Res.error);

    console.log("\n--- LR(0) ---");
    const stdGrammar = getStandardArithmeticGrammar();
    const lr0 = new LR0Parser(stdGrammar);
    lr0.init();
    // LR(0) will have conflicts for this grammar, let's see what happens.
    // It might just pick the first rule, or fail.
    const lr0Res = lr0.parse(tokens);
    console.log("Success:", lr0Res.success);

    console.log("\n--- SLR(1) ---");
    const slr1 = new SLR1Parser(stdGrammar);
    const slr1Res = slr1.parse(tokens);
    console.log("Success:", slr1Res.success);

} catch (e) {
    console.error("Crash during test:", e);
}
