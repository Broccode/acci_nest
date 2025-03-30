# Biome.js Linting und Formatierung

## Context

- Anwenden bei allen Änderungen an TypeScript- und JavaScript-Dateien
- Verwenden bei der Codeformatierung
- Referenzieren bei Code-Reviews
- Befolgen beim Hinzufügen neuer Code-Dateien

## Critical Rules

- USE Biome.js als einziges Tool für Linting und Formatierung
- DO NOT USE ESLint oder Prettier
- FORMAT alle Dateien mit dem Befehl `bunx @biomejs/biome format --write`
- LINT alle Dateien mit dem Befehl `bunx @biomejs/biome lint`
- CHECK die biome.json-Konfigurationsdatei für projektspezifische Regeln
- MAINTAIN einheitliche Formatierung im gesamten Projekt
- FIX Linting-Fehler vor dem Commit
- CUSTOMIZE Regeln nur in der biome.json-Datei im Root-Verzeichnis

## Examples

<example>
// Korrekte Verwendung von Biome.js
// Formatierung und Linting durchführen:
bunx @biomejs/biome check --apply .

// Nur formatieren:
bunx @biomejs/biome format --write .

// Nur Linting:
bunx @biomejs/biome lint .

// Fehler automatisch beheben:
bunx @biomejs/biome check --apply .
</example>

<example type="invalid">
// Falsch: Verwendung von ESLint oder Prettier
eslint . --fix
prettier --write .

// Falsch: Ignorieren von Biome.js-Fehlern
// Beispiel für einen unformatierten Code, der Biome.js-Regeln verletzt:
function    example  (a:any)  {
  return a+1;
}
</example>
