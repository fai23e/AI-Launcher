// src/utils/variable-parser.js

/**
 * プロンプト文字列から変数を解析するためのユーティリティ
 */

const VARIABLE_REGEX = /{(\w+)}/g;

/**
 * 文字列からすべてのユニークな変数名を抽出する
 * 例: "Translate {text} to {language}." -> ["text", "language"]
 * @param {string} text - 解析対象の文字列
 * @returns {string[]} ユニークな変数名の配列
 */
export function extractVariables(text) {
    const matches = text.match(VARIABLE_REGEX);
    if (!matches) {
        return [];
    }
    // マッチした結果から 중복을 제거하고 {} 를 제거
    const variables = matches.map(match => match.slice(1, -1));
    return [...new Set(variables)];
}

/**
 * 文字列内の変数を指定された値で置換する
 * @param {string} text - 元の文字列
 * @param {Object.<string, string>} values - 変数名と値のマッピング
 * @returns {string} 変数が置換された新しい文字列
 */
export function substituteVariables(text, values) {
    return text.replace(VARIABLE_REGEX, (match, variableName) => {
        return values[variableName] !== undefined ? values[variableName] : match;
    });
}
