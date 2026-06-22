import { linter } from "@codemirror/lint";
import { CodeEditor } from "./CodeEditor";
import { lintEnvContent } from "../lib/envLint";

interface EnvEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export function EnvEditor({ content, onChange, readOnly = false }: EnvEditorProps) {
  const envLintExtension = linter(view => lintEnvContent(view.state.doc.toString()));

  return (
    <CodeEditor
      content={content}
      onChange={onChange}
      readOnly={readOnly}
      extensions={[envLintExtension]}
    />
  );
}
