export function tokenize(input) {
    // Universal space-separated lexer for custom grammars
    const tokens = input.trim().split(/\s+/).filter(t => t.length > 0);
    tokens.push('$'); // End of input token
    return tokens;
}
