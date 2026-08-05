const ts = require('typescript');
const fs = require('fs');

const fileName = 'src/App.tsx';
const code = fs.readFileSync(fileName, 'utf8');

const sourceFile = ts.createSourceFile(
  fileName,
  code,
  ts.ScriptTarget.Latest,
  true, // setParentNodes
  ts.ScriptKind.TSX
);

console.log("Parse successful? Wait, we need to check diagnostics.");
const program = ts.createProgram([fileName], {
  noEmit: true,
  jsx: ts.JsxEmit.ReactJSX
});

const diagnostics = ts.getPreEmitDiagnostics(program);

if (diagnostics.length === 0) {
  fs.writeFileSync('syntax_check.log', 'SUCCESS: No syntax errors!');
} else {
  let log = '';
  diagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      log += `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}\n`;
    } else {
      log += ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n') + '\n';
    }
  });
  fs.writeFileSync('syntax_check.log', log);
}
