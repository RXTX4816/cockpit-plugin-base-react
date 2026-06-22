import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, type Extension } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { useDarkMode } from "../hooks/useDarkMode";
import "./CodeEditor.css";

export interface CodeEditorProps {
  content: string;
  onChange?: (content: string) => void;
  readOnly?: boolean;
  extensions?: Extension[];
  className?: string;
}

export function CodeEditor({
  content,
  onChange,
  readOnly = false,
  extensions = [],
  className,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const isDark = useDarkMode();

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const allExtensions: Extension[] = [basicSetup, ...extensions];

    if (isDark) {
      allExtensions.push(oneDark);
    }

    if (readOnly) {
      allExtensions.push(EditorState.readOnly.of(true));
      allExtensions.push(EditorView.editable.of(false));
    } else {
      allExtensions.push(
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            onChangeRef.current?.(update.state.doc.toString());
          }
        }),
      );
    }

    const state = EditorState.create({ doc: content, extensions: allExtensions });
    const editor = new EditorView({ state, parent: containerRef.current });
    editorRef.current = editor;

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  // content is the initial doc value only; onChange accessed via ref.
  // isDark triggers a full recreate so the theme extension is applied/removed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, isDark, ...extensions]);

  // Sync externally-driven content changes without recreating the editor.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.state.doc.toString() !== content) {
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: content },
      });
    }
  }, [content]);

  return <div ref={containerRef} className={`ce-editor${className ? ` ${className}` : ""}`} />;
}
