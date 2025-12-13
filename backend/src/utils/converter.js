// src/utils/converter.js

const toCamelCase = (str) => {
    return str.replace(/([-_][a-z])/ig, ($1) => {
        return $1.toUpperCase()
            .replace('-', '')
            .replace('_', '');
    });
};

const keysToCamel = (obj) => {
    // 1. Se for primitivo (null, string, number, boolean), retorna direto
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // 2. CORREÇÃO: Se for uma instância de Date, retorna ela mesma
    // Isso impede que o código tente iterar as chaves da data
    if (obj instanceof Date) {
        return obj;
        // Nota: O express/res.json() vai converter isso para string ISO automaticamente depois
    }

    // 3. Se for Array, faz a recursão em cada item
    if (Array.isArray(obj)) {
        return obj.map(item => keysToCamel(item));
    }

    // 4. Se for Objeto comum, converte as chaves
    const n = {};
    Object.keys(obj).forEach((k) => {
        n[toCamelCase(k)] = keysToCamel(obj[k]);
    });

    return n;
};

module.exports = { keysToCamel };